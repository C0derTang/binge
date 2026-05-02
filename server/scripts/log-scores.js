require('dotenv').config();
const supabase = require('../supabase');
const { getMatchesFromAggregated } = require('../services/matching');

async function logScores() {
  try {
    const { data: users } = await supabase.from('users').select('*');

    if (!users || users.length < 2) {
      console.log('Need at least 2 users for matching');
      return;
    }

    console.log('\n=== Compatibility Scores ===');
    console.log(`Time: ${new Date().toLocaleTimeString()}`);

    // Get all watched reels for each user
    const usersWithReels = await Promise.all(users.map(async (user) => {
      const { data: reels } = await supabase
        .from('watched_reels')
        .select('hashtags')
        .eq('user_id', user.user_id);

      const interestScores = {};
      const interestKeywords = [
        'food', 'travel', 'fitness', 'fashion', 'music', 'art', 'comedy',
        'tech', 'gaming', 'sports', 'nature', 'dance', 'beauty', 'cooking',
        'pets', 'cars', 'movies', 'books', 'memes'
      ];

      (reels || []).forEach(reel => {
        (reel.hashtags || []).forEach(tag => {
          const lower = tag.toLowerCase();
          if (interestKeywords.includes(lower)) {
            interestScores[lower] = (interestScores[lower] || 0) + 1;
          }
        });
      });

      return { ...user, interestScores };
    }));

    // Log scores between all pairs
    for (let i = 0; i < usersWithReels.length; i++) {
      for (let j = i + 1; j < usersWithReels.length; j++) {
        const user1 = usersWithReels[i];
        const user2 = usersWithReels[j];

        const myScores = user1.interestScores;
        const otherScores = user2.interestScores;
        const myTotal = Object.values(myScores).reduce((a, b) => a + b, 0);
        const otherTotal = Object.values(otherScores).reduce((a, b) => a + b, 0);

        // Cosine similarity
        const allInterests = new Set([...Object.keys(myScores), ...Object.keys(otherScores)]);
        let dotProduct = 0;
        allInterests.forEach(interest => {
          dotProduct += (myScores[interest] || 0) * (otherScores[interest] || 0);
        });

        let score = 0;
        if (myTotal > 0 && otherTotal > 0) {
          const myMag = Math.sqrt(Object.values(myScores).reduce((a, b) => a + b * b, 0));
          const otherMag = Math.sqrt(Object.values(otherScores).reduce((a, b) => a + b * b, 0));
          score = Math.round((dotProduct / (myMag * otherMag)) * 100);
        }

        console.log(`${user1.display_name} <3 ${user2.display_name}: ${score}%`);
        console.log(`  ${user1.display_name}: ${JSON.stringify(myScores)}`);
        console.log(`  ${user2.display_name}: ${JSON.stringify(otherScores)}`);
      }
    }
    console.log('===========================\n');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run once then every 5 seconds
logScores();
setInterval(logScores, 5000);