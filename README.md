# Binge

Binge is a Chrome extension dating app that matches you based on the Instagram Reels you watch.

## How It Works

1. **Watch Reels on Instagram** - The extension silently scrapes each Reel you view
2. **Interests Accumulate** - Your watched Reels are stored in `watched_reels` table with hashtags
3. **Matching** - Users with overlapping interest histories are matched using cosine similarity

## Tech Stack

- **Chrome Extension** (MV3) - Content script scrapes Reels, background handles API calls
- **React + Tailwind** - Extension popup UI
- **Express.js** - Backend server
- **Supabase** - User database and watched_reels storage
- **scrapecreators API** - Instagram Reel data (caption, hashtags, engagement)
- **MiniMax AI** (optional) - Interest extraction fallback

## Project Structure

```
binge/
├── extension/
│   ├── dist/              # Built extension (load this in Chrome)
│   ├── src/               # React source
│   ├── background.js      # Service worker
│   ├── content.js         # Content script (runs on Instagram)
│   └── manifest.json
├── server/
│   ├── index.js           # Express server
│   ├── supabase.js        # Supabase client
│   ├── routes/
│   │   ├── auth.js        # Login/register
│   │   └── users.js       # Profile, matches, watched_reels
│   ├── services/
│   │   └── matching.js    # Cosine similarity scoring
│   └── scripts/
│       └── log-scores.js  # Debug script to monitor scores
└── server/.env            # API keys (never commit)
```

## Prerequisites

- Node.js 18+
- Google Chrome
- A Supabase project
- A ScrapeCreators API key
- Optional: a MiniMax API key for AI-based interest analysis

## Setup

### 1. Supabase Database

Create these tables in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  interests TEXT[],
  humor_type TEXT,
  profile_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watched Reels table (accumulates over time)
CREATE TABLE watched_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shortcode TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  username TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watched_reels_user_id ON watched_reels(user_id);
CREATE INDEX idx_watched_reels_shortcode ON watched_reels(shortcode);
```

### 2. Configure backend

Create `server/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SCRAPE_CREATORS_KEY=your_api_key
MINIMAX_KEY=your_minimax_key
PORT=3000
```

### 3. Install dependencies

```bash
cd server && npm install
cd extension && npm install
```

### 4. Start backend

```bash
cd server && node index.js
```

### 5. Build extension

```bash
cd extension && npm run build
```

Then load `extension/dist/` in Chrome at `chrome://extensions` (Developer mode → Load unpacked).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/users/:userId` | Get user profile |
| PUT | `/users/profile` | Update profile |
| GET | `/users/:userId/matches` | Get matches (aggregated from watched_reels) |
| POST | `/users/:userId/reels` | Add a watched reel |
| GET | `/users/:userId/reels` | Get all watched reels |
| GET | `/users/:userId/interests` | Get aggregated interest scores |
| GET | `/scrape?shortcode=` | Proxy to scrapecreators API |
| GET | `/analyze?caption=` | Analyze caption with MiniMax AI |

## Matching Algorithm

1. **Interest Aggregation**: Each watched Reel contributes its hashtags to a frequency map
   - e.g., 5 Reels with #food → `food: 5`
2. **Cosine Similarity**: Compare interest score vectors between two users
   - Score = (A · B) / (|A| × |B|) × 100
3. **Threshold**: Users need ≥70% compatibility to match

## Debugging

Run `node server/scripts/log-scores.js` to see compatibility scores between all users update every 5 seconds.

## Architecture Notes

- Extension opens as a popup - click icon to open UI
- Content script detects Reel URLs and extracts shortcode
- Background fetches reel data and stores to watched_reels via API
- Matching is calculated on-the-fly from accumulated watched_reels history
- Dashboard refreshes matches every 5 seconds automatically
