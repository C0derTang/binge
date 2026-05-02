// Content script for scraping Instagram Reels

(function() {
  console.log('[Binge] Content script loaded');
  let scraping = false;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SCRAPE_REELS') {
      scrapeReelsPage();
    }
    return true;
  });

  async function scrapeReelsPage() {
    if (scraping) return;
    scraping = true;
    console.log('[Binge] Scraping page:', location.href);

    try {
      const shortcode = extractShortcode(location.href);
      if (!shortcode) {
        console.log('[Binge] No shortcode found in URL');
        scraping = false;
        return;
      }

      const data = await fetchViaAPI(shortcode);
      if (data) {
        console.log('[Binge] API success:', data.caption?.slice(0, 60));
        sendData([data]);
        scraping = false;
        return;
      }
    } catch (err) {
      console.error('Binge: Scraping error', err);
    }

    scraping = false;
  }

  function extractShortcode(url) {
    const match = url.match(/\/reels\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async function fetchViaAPI(shortcode) {
    try {
      // Call our server which has the API key in .env
      const resp = await fetch(`http://localhost:3000/scrape?shortcode=${shortcode}`);

      if (!resp.ok) {
        console.log('[Binge] API response not OK:', resp.status);
        return null;
      }

      const json = await resp.json();
      console.log('[Binge] API response keys:', Object.keys(json));

      if (json.error) {
        console.log('[Binge] API error:', json.error);
        return null;
      }

      return parseAPIResponse(json);
    } catch (e) {
      console.log('[Binge] API fetch failed:', e.message);
      return null;
    }
  }

  function parseAPIResponse(data) {
    // Response shape: { success, credits_remaining, data: { xdt_shortcode_media: { ... } } }
    const media = data?.data?.xdt_shortcode_media || data;

    const captionText = media?.edge_media_to_caption?.edges?.[0]?.node?.text || '';

    return {
      type: 'api',
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
    return matches.map(h => h.slice(1).toLowerCase());
  }

  function sendData(items) {
    if (items.length === 0) return;

    const captions = [];
    const hashtags = [];

    items.forEach(item => {
      if (item.caption) captions.push(item.caption);
      if (item.hashtags) hashtags.push(...item.hashtags);
    });

    console.log('[Binge] Sending SCRAPED_DATA with', captions.length, 'captions');

    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      data: {
        captions,
        hashtags: [...new Set(hashtags)],
        engagement: 1,
        totalReels: items.length,
        rawData: items
      }
    });
  }

  // Watch for URL changes
  function watchUrlChange() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[Binge] URL changed, re-scraping');
        setTimeout(scrapeReelsPage, 2000);
      }
    }, 1000);
  }

  watchUrlChange();
  setTimeout(scrapeReelsPage, 2000);
})();