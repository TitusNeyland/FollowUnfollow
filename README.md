# Instagram Follow Back Checker

A local, private tool that shows **who follows you back** and **who doesn’t** using your official Instagram data export. Nothing is sent to any server; everything runs on your device.

## Mobile app (React Native / Expo)

Run the app on your phone or simulator:

```bash
cd app
npm start
```

Then:
- **iOS**: Scan the QR code with the Camera app to open in Expo Go
- **Android**: Scan with the Expo Go app
- **Simulator**: Press `i` (iOS) or `a` (Android) in the terminal

### How to use the mobile app

1. Download your Instagram data (Settings → Accounts Center → Download your information → Followers and following, JSON).
2. Unzip the archive on your device (use Files app or a file manager).
3. Open the app, tap **Followers** and select `followers_1.json` (and add more if you have `followers_2.json`, etc.).
4. Tap **Following** and select `following_1.json`.
5. Tap **Compare lists** to see results.

---

## Web version

For desktop use, open `index.html` in a browser or run:

```bash
npx serve .
```

Then open http://localhost:3000 and select your JSON files.

---

## How to get your Instagram data

1. In **Instagram**: **Settings** → **Accounts Center** → **Your information and permissions** → **Download your information**.
2. Choose **Some of your information** and select **Followers and following** under Connections.
3. Format: **JSON**, date range: **All time**, then create the download.
4. When the ZIP is ready, download and unzip it.
5. Go to **connections** → **followers_and_following** and find:
   - `followers_1.json` (and `followers_2.json`, … if you have many followers)
   - `following_1.json`

## Results

- **Follows you back** – people you follow who also follow you
- **Doesn’t follow you back** – people you follow who don’t follow you  
- **You don’t follow back** – people who follow you but you don’t follow

## Privacy

BackTrack Followers does not collect, store, or transmit your data to any server. All processing happens locally on your device. The files you select (followers and following) are read only when you choose them and are never uploaded or shared. The app does not connect to Instagram or any third-party analytics service. Your data stays on your device under your control.

## Support

For questions or issues, [open an issue on GitHub](https://github.com/TitusNeyland/FollowUnfollow/issues).
