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

async function analyzeContent(data) {
  const interests = extractInterests(data.captions, data.hashtags);
  const humorType = analyzeHumor(data.captions);

  console.log('\n=== INTEREST ANALYSIS ===');
  console.log('Caption:', data.captions?.[0]?.slice(0, 80));
  console.log('Hashtags:', data.hashtags?.join(', '));
  console.log('Extracted interests:', interests);
  console.log('Humor type:', humorType);
  console.log('========================\n');

  const stored = await chrome.storage.local.get(['user']);
  if (stored.user) {
    try {
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
    } catch (err) {
      console.error('[Binge Background] API error:', err.message);
    }
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