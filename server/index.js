require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { generateText } = require('ai');
const { minimax } = require('vercel-minimax-ai-provider');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Analyze with MiniMax AI
async function analyzeWithAI(caption) {
  const apiKey = process.env.MINIMAX_KEY || process.env.MINIMAX_API_KEY;
  if (!apiKey || !caption) {
    console.log('[MiniMax] No API key or caption');
    return null;
  }

  // Set env var the SDK expects
  process.env.MINIMAX_API_KEY = apiKey;

  try {
    const result = await generateText({
      model: minimax('MiniMax-M2'),
      system: `You are an Instagram Reels analyzer. Given a caption, extract:
1. Interests (pick from this exact list: food, travel, fitness, fashion, music, art, comedy, tech, gaming, sports, nature, dance, beauty, cooking, pets, cars, movies, books, memes)
2. Humor style (one of: dark, sarcastic, wholesome, edgy, chill)

Rules:
- Only use interests from the exact list above
- Return ONLY valid JSON: {"interests":[], "humorType":""}
- If no interests found, empty array
- Default humorType to "chill"`,
      prompt: `Caption: "${caption}"`
    });

    const text = result.text.trim();
    console.log('[MiniMax] Response:', text);
    return JSON.parse(text);
  } catch (err) {
    console.error('[MiniMax] Error:', err.message);
  }
  return null;
}

// Analyze endpoint
app.get('/analyze', async (req, res) => {
  const { caption } = req.query;
  if (!caption) {
    return res.status(400).json({ error: 'Missing caption' });
  }

  const result = await analyzeWithAI(caption);
  res.json(result || { interests: [], humorType: 'chill' });
});

// Scrape endpoint - proxies to scrapecreators API
app.get('/scrape', async (req, res) => {
  const { shortcode } = req.query;
  if (!shortcode) {
    return res.status(400).json({ error: 'Missing shortcode' });
  }

  if (!process.env.SCRAPE_CREATORS_KEY) {
    return res.status(500).json({ error: 'Missing SCRAPE_CREATORS_KEY' });
  }

  try {
    const response = await axios.get('https://api.scrapecreators.com/v1/instagram/post', {
      params: {
        url: `https://www.instagram.com/reel/${shortcode}/`
      },
      headers: { 'x-api-key': process.env.SCRAPE_CREATORS_KEY }
    });

    // Log scrape details
    const media = response.data?.data?.xdt_shortcode_media;
    if (media) {
      const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      const hashtags = caption.match(/#\w+/g) || [];
      console.log('\n=== SCRAPE RESULT ===');
      console.log('Shortcode:', shortcode);
      console.log('Username:', media.owner?.username);
      console.log('Caption:', caption.slice(0, 100));
      console.log('Hashtags:', hashtags.join(', '));
      console.log('Likes:', media.like_count);
      console.log('Views:', media.video_view_count);
      console.log('===================\n');
    }

    res.json(response.data);
  } catch (err) {
    console.error('[/scrape] Error:', err.message);
    res.status(500).json({ error: 'Scrape failed', details: err.message });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Binge API running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Binge server running on port ${PORT}`);
});
