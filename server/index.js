require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Scrape endpoint - proxies to scrapecreators API
app.get('/scrape', async (req, res) => {
  const { shortcode } = req.query;
  if (!shortcode) {
    return res.status(400).json({ error: 'Missing shortcode' });
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