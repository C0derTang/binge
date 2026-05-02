// Background service worker for Binge extension

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('[Binge Background] Message received:', msg.type);
  if (msg.type === 'START_SCRAPING') {
    scrapeReels();
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