// Background service worker for Binge extension

// Open full page when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL('index.html'),
    active: true
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[Binge Background] Message received:', msg.type);
  if (msg.type === 'START_SCRAPING') {
    scrapeReels();
  } else if (msg.type === 'SCRAPE_SHORTCODE') {
    scrapeShortcode(msg.shortcode);
  }
  return true;
});

async function scrapeReels() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes('instagram.com')) {
      return;
    }

    sendMessage({ type: 'SCRAPING_START', count: 1 });
    chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_REELS' });
  } catch (err) {
    console.error('Scraping error:', err);
  }
}

// Listen for scraped data from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SCRAPED_DATA') {
    console.log('[Binge Background] SCRAPED_DATA received');
    analyzeContent(msg.data);
  }
  return true;
});

const API_URL = 'http://localhost:3000';

async function scrapeShortcode(shortcode) {
  if (!shortcode) {
    return;
  }

  try {
    const resp = await fetch(`${API_URL}/scrape?shortcode=${encodeURIComponent(shortcode)}`);
    if (!resp.ok) {
      throw new Error(`Scrape request failed with status ${resp.status}`);
    }

    const json = await resp.json();
    if (json.error) {
      throw new Error(json.error);
    }

    const reel = parseAPIResponse(json);
    analyzeContent({
      captions: reel.caption ? [reel.caption] : [],
      hashtags: reel.hashtags || [],
      engagement: 1,
      totalReels: 1,
      rawData: [reel]
    });
  } catch (err) {
    console.error('[Binge Background] Failed to fetch reel data:', err.message);
    sendMessage({ type: 'SCRAPING_COMPLETE', interests: [], humorType: 'chill' });
  }
}

// Analyze with MiniMax AI
async function analyzeContent(data) {
  const caption = data.captions?.[0] || '';
  const hashtags = data.hashtags || [];

  console.log('\n=== INTEREST ANALYSIS ===');
  console.log('Caption:', caption.slice(0, 80));
  console.log('Hashtags:', hashtags.join(', '));
  console.log('========================\n');

  // Try MiniMax AI first
  try {
    const resp = await fetch(`${API_URL}/analyze?caption=${encodeURIComponent(caption)}`);
    if (resp.ok) {
      const result = await resp.json();
      console.log('[Binge Background] AI result:', JSON.stringify(result));

      const stored = await chrome.storage.local.get(['user']);
      if (stored.user) {
        await fetch(`${API_URL}/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: stored.user.userId,
            interests: result.interests || [],
            humorType: result.humorType || 'chill'
          })
        });

        stored.user.interests = result.interests || [];
        stored.user.humorType = result.humorType || 'chill';
        await chrome.storage.local.set({ user: stored.user });
      }

      sendMessage({ type: 'SCRAPING_COMPLETE', interests: result.interests || [], humorType: result.humorType || 'chill' });
      return;
    }
  } catch (err) {
    console.error('[Binge Background] AI failed, falling back to keyword:', err.message);
  }

  // Fallback to keyword matching
  const interests = extractInterests(data.captions, data.hashtags);
  const humorType = analyzeHumor(data.captions);

  const stored = await chrome.storage.local.get(['user']);
  if (stored.user) {
    await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: stored.user.userId,
        interests,
        humorType
      })
    });

    stored.user.interests = interests;
    stored.user.humorType = humorType;
    await chrome.storage.local.set({ user: stored.user });
  }

  sendMessage({ type: 'SCRAPING_COMPLETE', interests, humorType });
}

function extractInterests(captions, hashtags) {
  const interestKeywords = [
    'food', 'travel', 'fitness', 'fashion', 'music', 'art', 'comedy',
    'tech', 'gaming', 'sports', 'nature', 'dance', 'beauty', 'cooking',
    'pets', 'cars', 'movies', 'books', 'memes', 'dance'
  ];

  const text = (captions?.join(' ') || '') + ' ' + (hashtags?.join(' ') || '');
  const lower = text.toLowerCase();

  return interestKeywords.filter(k => lower.includes(k));
}

function analyzeHumor(captions) {
  const text = captions?.join(' ') || '';

  const darkKeywords = ['death', 'dark', 'depression', 'suicide', 'morbid'];
  const sarcasticKeywords = ['yeah right', 'sure', 'obviously', 'totally', 'not'];
  const wholesomeKeywords = ['love', 'happy', 'blessed', 'grateful', 'cute', 'sweet'];
  const edgyKeywords = ['roast', 'burn', 'trash', 'hate', 'worst', 'sucks'];

  const lower = text.toLowerCase();

  if (darkKeywords.some(k => lower.includes(k))) return 'dark';
  if (sarcasticKeywords.some(k => lower.includes(k))) return 'sarcastic';
  if (wholesomeKeywords.some(k => lower.includes(k))) return 'wholesome';
  if (edgyKeywords.some(k => lower.includes(k))) return 'edgy';

  return 'chill';
}

function sendMessage(msg) {
  chrome.runtime.sendMessage(msg);
}

function parseAPIResponse(data) {
  const media = data?.data?.xdt_shortcode_media || data;
  const captionText = media?.edge_media_to_caption?.edges?.[0]?.node?.text || '';

  return {
    code: media.shortcode || '',
    caption: captionText,
    hashtags: extractHashtags(captionText),
    likeCount: media.like_count || 0,
    viewCount: media.video_view_count || 0,
    username: media.owner?.username || '',
    pk: media.id || ''
  };
}

function extractHashtags(text) {
  const matches = text.match(/#\w+/g) || [];
  return matches.map((hashtag) => hashtag.slice(1).toLowerCase());
}
