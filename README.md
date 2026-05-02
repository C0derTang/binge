# Binge

Binge is a Chrome extension plus a small Node/Express backend. It watches the Instagram Reel you are viewing, extracts caption-based interests and humor style, stores that profile in Supabase, and shows possible matches inside the extension UI.

## What I fixed

- Reel scraping now recognizes both `/reel/...` and `/reels/...` URLs.
- The extension now requests access to the local backend at `http://localhost:3000/*`.
- Reel metadata fetching now runs in the background service worker instead of the Instagram page context, which is a safer extension flow.
- The dashboard now keeps its own reactive profile state, so scraped interests, humor updates, profile pictures, and refreshed matches actually show up in the UI.
- The extension build now produces a loadable `extension/dist` package with `manifest.json`, `background.js`, and `content.js` copied into it.
- The server now fails fast when required Supabase env vars are missing, and `/scrape` returns a clear error if `SCRAPE_CREATORS_KEY` is not set.

## Prerequisites

- Node.js 18+
- Google Chrome
- A Supabase project
- A ScrapeCreators API key
- Optional: a MiniMax API key for AI-based interest analysis

## Local setup

### 1. Configure the backend

From [server/.env.example](C:/Users/tangc/OneDrive/Desktop/binge/server/.env.example), create `server/.env` and fill in the values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SCRAPE_CREATORS_KEY`
- `MINIMAX_API_KEY` (optional)
- `PORT` defaults to `3000`

### 2. Create the Supabase table

Run the SQL in [server/supabase-setup.sql](C:/Users/tangc/OneDrive/Desktop/binge/server/supabase-setup.sql) in the Supabase SQL editor.

### 3. Install dependencies

Backend:

```powershell
cd C:\Users\tangc\OneDrive\Desktop\binge\server
npm install
```

Extension:

```powershell
cd C:\Users\tangc\OneDrive\Desktop\binge\extension
npm install
```

### 4. Start the backend

```powershell
cd C:\Users\tangc\OneDrive\Desktop\binge\server
npm start
```

The API should be available at `http://localhost:3000`.

### 5. Build the extension

```powershell
cd C:\Users\tangc\OneDrive\Desktop\binge\extension
npm run build
```

This produces the loadable unpacked extension folder at `C:\Users\tangc\OneDrive\Desktop\binge\extension\dist`.

### 6. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `C:\Users\tangc\OneDrive\Desktop\binge\extension\dist`

## How to use locally

1. Make sure the backend is running on `http://localhost:3000`
2. Open Instagram in Chrome
3. Visit a Reel page such as `https://www.instagram.com/reel/...`
4. Open the Binge extension popup
5. Register or log in
6. Keep browsing reels; the extension will scrape the current reel and update your stored interests and humor profile
7. Reopen the popup to see updated profile data and matches

## Notes

- Without `SCRAPE_CREATORS_KEY`, reel scraping will not work.
- Without `MINIMAX_API_KEY`, the app falls back to keyword-based classification.
- The correct folder to load in Chrome is `extension/dist`, not the raw `extension` source folder.
