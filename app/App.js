import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Linking,
  KeyboardAvoidingView,
  Image,
  Animated,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';


// Extract usernames from Instagram export JSON
function extractUsernames(data) {
  const usernames = new Set();
  if (!data || typeof data !== 'object') return usernames;

  function addUsername(str) {
    if (str && typeof str === 'string') {
      const u = str.trim().toLowerCase();
      if (u.length > 0) usernames.add(u);
    }
  }

  function addFromEntry(entry) {
    if (!entry || typeof entry !== 'object') return;
    addUsername(entry.value);
    addUsername(entry.username);
    addUsername(entry.title);
    if (Array.isArray(entry.string_list_data)) {
      entry.string_list_data.forEach((item) => {
        if (item && item.value) addUsername(item.value);
      });
    }
  }

  function parseArray(arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      addFromEntry(item);
    });
  }

  if (Array.isArray(data)) {
    parseArray(data);
    return usernames;
  }

  const knownKeys = [
    'relationships_following',
    'following',
    'followers',
    'accounts',
    'connections_following',
    'following_requests',
    'close_friends',
  ];
  for (let i = 0; i < knownKeys.length; i++) {
    const list = data[knownKeys[i]];
    if (Array.isArray(list)) {
      parseArray(list);
      return usernames;
    }
  }

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && Array.isArray(data[key])) {
      parseArray(data[key]);
      if (usernames.size > 0) return usernames;
    }
  }

  if (data.string_list_data) {
    (data.string_list_data || []).forEach((s) => {
      if (s && s.value) addUsername(s.value);
    });
  }
  return usernames;
}

async function readJsonFile(uri) {
  const content = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
  return JSON.parse(content);
}

const INVALID_FOLLOWERS_NAMES = ['close_friend', 'following_request', 'blocked_user', 'recently_followed', 'suggested_user'];
const INVALID_FOLLOWING_NAMES = ['close_friend', 'following_request', 'blocked_user'];

function isValidFollowersFile(name) {
  const n = (name || '').toLowerCase();
  if (!n.endsWith('.json')) return false;
  if (INVALID_FOLLOWERS_NAMES.some((bad) => n.includes(bad))) return false;
  return n.includes('follower');
}

function isValidFollowingFile(name) {
  const n = (name || '').toLowerCase();
  if (!n.endsWith('.json')) return false;
  if (INVALID_FOLLOWING_NAMES.some((bad) => n.includes(bad))) return false;
  return n.includes('following') && !n.includes('request');
}

function AnimatedSplashScreen({ onFinish }) {
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1.05, useNativeDriver: true, friction: 8, tension: 80 }),
      ]),
      Animated.timing(iconScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={splashStyles.root}>
      <StatusBar style="light" />
      <Animated.View style={[splashStyles.container, { opacity: containerOpacity }]} pointerEvents="none">
        <View style={splashStyles.content}>
          <Animated.Image
            source={require('./assets/ChatGPT_Image_Feb_26__2026__07_45_45_PM-removebg-preview.png')}
            style={[
              splashStyles.icon,
              {
                opacity: iconOpacity,
                transform: [{ scale: iconScale }],
              },
            ]}
            resizeMode="contain"
          />
          <Animated.Text style={[splashStyles.title, { opacity: textOpacity }]}>BackTrack Followers</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center' },
  icon: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '600', color: '#ffffff', letterSpacing: -0.5 },
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [followersFiles, setFollowersFiles] = useState([]);
  const [followingFile, setFollowingFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  const pickFollowers = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets[0];
      if (!isValidFollowersFile(file.name)) {
        setError('Use a followers file (e.g. followers_1.json). Not close_friends, following_requests, etc.');
        return;
      }
      setFollowersFiles((prev) => [...prev, { uri: file.uri, name: file.name }]);
      setError(null);
    } catch (e) {
      setError('Could not pick file: ' + (e.message || 'Unknown error'));
    }
  };

  const pickFollowing = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets[0];
      if (!isValidFollowingFile(file.name)) {
        setError('Use a following file (e.g. following_1.json). Not close_friends, following_requests, etc.');
        return;
      }
      setFollowingFile({ uri: file.uri, name: file.name });
      setError(null);
    } catch (e) {
      setError('Could not pick file: ' + (e.message || 'Unknown error'));
    }
  };

  const removeFollowersFile = (index) => {
    setFollowersFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFollowing = () => setFollowingFile(null);

  const runAnalysis = async () => {
    if (followersFiles.length === 0 || !followingFile) {
      setError('Please select both followers and following file(s).');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const followersSets = await Promise.all(
        followersFiles.map((f) => readJsonFile(f.uri).then(extractUsernames))
      );
      const followers = new Set();
      followersSets.forEach((s) => s.forEach((u) => followers.add(u)));

      const following = extractUsernames(await readJsonFile(followingFile.uri));

      if (followers.size === 0) {
        setError('No followers found in the selected file(s).');
        setLoading(false);
        return;
      }
      if (following.size === 0) {
        setError('No following found in the selected file.');
        setLoading(false);
        return;
      }

      const followsBack = [];
      const notFollowBack = [];
      const youDontFollow = [];

      following.forEach((u) => {
        if (followers.has(u)) followsBack.push(u);
        else notFollowBack.push(u);
      });
      followers.forEach((u) => {
        if (!following.has(u)) youDontFollow.push(u);
      });

      followsBack.sort();
      notFollowBack.sort();
      youDontFollow.sort();

      setResults({ followsBack, notFollowBack, youDontFollow });
      setCollapsed({ followsBack: true, notFollowBack: true, youDontFollow: true });
      setVisibleCount({});
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFollowersFiles([]);
    setFollowingFile(null);
    setResults(null);
    setError(null);
    setCollapsed({});
  };

  const toggleCollapsed = (key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ITEMS_PER_PAGE = 50;
  const [visibleCount, setVisibleCount] = useState({});

  const ListSection = ({ sectionKey, title, count, items, emptyMsg, numberColor, disclaimer }) => {
    const isCollapsed = collapsed[sectionKey] === true;
    const showing = visibleCount[sectionKey] ?? ITEMS_PER_PAGE;
    const visible = items.slice(0, showing);
    const hasMore = items.length > showing;

    return (
      <View style={styles.statBlock}>
        <TouchableOpacity
          style={styles.statRow}
          onPress={() => toggleCollapsed(sectionKey)}
          activeOpacity={0.7}
        >
          <Text style={styles.statTitle}>{title}</Text>
          <View style={styles.statRight}>
            <Text style={[styles.statNumber, numberColor && { color: numberColor }]}>{count}</Text>
            <FontAwesome5 name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={12} color="#71717a" style={styles.statChevron} />
          </View>
        </TouchableOpacity>
        {disclaimer && !isCollapsed ? (
          <Text style={styles.disclaimer}>{disclaimer}</Text>
        ) : null}
        {!isCollapsed && (
          items.length === 0 ? (
            <Text style={styles.emptyText}>{emptyMsg}</Text>
          ) : (
            <View style={styles.userList}>
              {visible.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.userRow}
                  onPress={() => Linking.openURL('https://www.instagram.com/' + item + '/')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.userName}>@{item}</Text>
                  <FontAwesome5 name="external-link-alt" size={11} color="#52525b" />
                </TouchableOpacity>
              ))}
              {hasMore && (
                <TouchableOpacity
                  style={styles.showMoreRow}
                  onPress={() => setVisibleCount((prev) => ({ ...prev, [sectionKey]: items.length }))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showMoreText}>Show all {items.length} accounts</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </View>
    );
  };

  const canAnalyze = followersFiles.length > 0 && followingFile && !loading;

  if (showSplash) {
    return <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View style={styles.appRoot}>
      <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image source={require('./assets/ChatGPT_Image_Feb_26__2026__07_45_45_PM-removebg-preview.png')} style={styles.appIcon} />
            <Text style={styles.title}>BackTrack Followers</Text>
            <Text style={styles.subtitle}>See who follows you back. All data stays on your device.</Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.helpRow} onPress={() => setShowHelp(!showHelp)} activeOpacity={0.7}>
              <Text style={styles.helpLabel}>How to get your data</Text>
              <FontAwesome5 name={showHelp ? 'chevron-up' : 'chevron-down'} size={12} color="#71717a" />
            </TouchableOpacity>
            {showHelp && (
              <View style={styles.helpSteps}>
                <Text style={styles.step}>1. Instagram → Settings → Accounts Center → Download your information</Text>
                <Text style={styles.step}>2. Select "Followers and following" (JSON, All time)</Text>
                <Text style={styles.step}>3. Unzip → connections → followers_and_following</Text>
                <Text style={[styles.step, { marginBottom: 0 }]}>4. Select followers_1.json and following_1.json</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upload data</Text>
            <View style={styles.listGroup}>
              <TouchableOpacity style={styles.listRow} onPress={pickFollowers} activeOpacity={0.7}>
                <FontAwesome5 name="folder" size={18} color="#71717a" style={styles.rowIcon} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Followers</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {followersFiles.length > 0 ? followersFiles.map((f) => f.name).join(', ') : 'Tap to select'}
                  </Text>
                </View>
                {followersFiles.length > 0 ? (
                  <FontAwesome5 name="check-circle" size={18} color="#22c55e" />
                ) : (
                  <FontAwesome5 name="chevron-right" size={12} color="#52525b" />
                )}
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity style={styles.listRow} onPress={pickFollowing} activeOpacity={0.7}>
                <FontAwesome5 name="user" size={18} color="#71717a" style={styles.rowIcon} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>Following</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {followingFile ? followingFile.name : 'Tap to select'}
                  </Text>
                </View>
                {followingFile ? (
                  <FontAwesome5 name="check-circle" size={18} color="#22c55e" />
                ) : (
                  <FontAwesome5 name="chevron-right" size={12} color="#52525b" />
                )}
              </TouchableOpacity>
            </View>
            {(followersFiles.length > 0 || followingFile) && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { setFollowersFiles([]); setFollowingFile(null); setError(null); }} activeOpacity={0.7}>
                <Text style={styles.clearLink}>Clear selections</Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {results && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Results</Text>
                <TouchableOpacity onPress={reset} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
                  <Text style={styles.resetLink}>Start over</Text>
                </TouchableOpacity>
              </View>
              <ListSection
                sectionKey="followsBack"
                title="Follow you back"
                count={results.followsBack.length}
                items={results.followsBack}
                emptyMsg="No one"
                numberColor="#22c55e"
              />
              <ListSection
                sectionKey="notFollowBack"
                title="Don't follow you back"
                count={results.notFollowBack.length}
                items={results.notFollowBack}
                emptyMsg="Everyone you follow follows you back"
                numberColor="#f97316"
                disclaimer="Some accounts may be deactivated and still follow you."
              />
              <ListSection
                sectionKey="youDontFollow"
                title="You don't follow back"
                count={results.youDontFollow.length}
                items={results.youDontFollow}
                emptyMsg="No one"
                numberColor="#ef4444"
              />
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={[styles.analyzeBtn, !canAnalyze && styles.analyzeBtnDisabled]}
            onPress={runAnalysis}
            disabled={!canAnalyze}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.analyzeBtnText}>Analyze</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: '#09090b' },
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  appIcon: { width: 72, height: 72, borderRadius: 16, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '600', color: '#fafafa', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#71717a', lineHeight: 22, textAlign: 'center' },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: '#71717a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  helpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  helpLabel: { fontSize: 15, fontWeight: '500', color: '#d4d4d8' },
  helpSteps: { paddingTop: 8, paddingBottom: 4 },
  step: { fontSize: 14, color: '#a1a1aa', lineHeight: 22, marginBottom: 12 },
  listGroup: { backgroundColor: '#18181b', borderRadius: 12, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  rowIcon: { marginRight: 14 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '500', color: '#fafafa' },
  rowSubtitle: { fontSize: 13, color: '#71717a', marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: '#27272a', marginLeft: 48 },
  clearRow: { marginTop: 12 },
  clearLink: { fontSize: 14, color: '#71717a' },
  errorRow: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, padding: 14, marginBottom: 24 },
  errorText: { fontSize: 14, color: '#f87171' },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    backgroundColor: '#09090b',
  },
  analyzeBtn: {
    backgroundColor: '#7c5cff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  resultsSection: { marginTop: 8 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resultsTitle: { fontSize: 20, fontWeight: '600', color: '#fafafa' },
  resetLink: { fontSize: 15, fontWeight: '500', color: '#8b7cf7' },
  statBlock: { marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#18181b', borderRadius: 12 },
  statTitle: { fontSize: 15, fontWeight: '500', color: '#e4e4e7' },
  statRight: { flexDirection: 'row', alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '600', color: '#fafafa', marginRight: 8 },
  statChevron: { opacity: 0.7 },
  showMoreRow: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#27272a' },
  showMoreText: { fontSize: 14, fontWeight: '500', color: '#8b7cf7' },
  disclaimer: { fontSize: 12, color: '#71717a', lineHeight: 18, marginTop: 8, marginBottom: 4, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#71717a', fontStyle: 'italic', paddingVertical: 16, paddingHorizontal: 16 },
  userList: { marginTop: 8, backgroundColor: '#18181b', borderRadius: 12, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  userName: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15, fontWeight: '400', color: '#e4e4e7' },
});
