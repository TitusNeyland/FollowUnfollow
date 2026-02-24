# Instagram Follow Back Checker

A local, private tool that shows **who follows you back** and **who doesn’t** using your official Instagram data export. Nothing is sent to any server; everything runs in your browser.

## Run locally

**Option 1 – Open the file**

- Double-click `index.html`, or  
- Right-click → “Open with” → your browser (Chrome, Edge, Firefox, etc.)

**Option 2 – Local server (optional)**

If you prefer serving it over HTTP:

```bash
npx serve .
```

Then open **http://localhost:3000** (or the URL shown in the terminal).

## How to get your Instagram data

1. In **Instagram**: **Settings** → **Accounts Center** → **Your information and permissions** → **Download your information**.
2. Choose **Some of your information** and select **Followers and following** under Connections.
3. Format: **JSON**, date range: **All time**, then create the download.
4. When the ZIP is ready, download and unzip it.
5. Go to **connections** → **followers_and_following** and find:
   - `followers_1.json` (and `followers_2.json`, … if you have many followers)
   - `following_1.json`

## How to use the site

1. Open `index.html` (or the local server URL).
2. **Followers**: Select your `followers_1.json` (and any other `followers_*.json`).
3. **Following**: Select your `following_1.json`.
4. Click **Compare lists**.

You’ll see:

- **Follows you back** – people you follow who also follow you.
- **Doesn’t follow you back** – people you follow who don’t follow you.
- **You don’t follow back** – people who follow you but you don’t follow.

All processing is done in your browser; your data is not uploaded anywhere.
