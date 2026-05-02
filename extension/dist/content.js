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

      chrome.runtime.sendMessage({ type: 'SCRAPE_SHORTCODE', shortcode });
      scraping = false;
      return;
    } catch (err) {
      console.error('Binge: Scraping error', err);
    }

    scraping = false;
  }

  function extractShortcode(url) {
    const match = url.match(/\/reel(?:s)?\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
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
