const THRESHOLD = 70;

function calculateCompatibility(user1, user2) {
  let score = 0;

  // Interest overlap (0-60 points)
  if (user1.interests && user2.interests) {
    const overlap = user1.interests.filter(i => user2.interests.includes(i));
    const maxPossible = Math.max(user1.interests.length || 0, user2.interests.length || 0);
    if (maxPossible > 0) {
      score += (overlap.length / maxPossible) * 60;
    }
  }

  // Humor type match (0-40 points)
  if (user1.humor_type && user2.humor_type) {
    if (user1.humor_type === user2.humor_type) {
      score += 40;
    } else {
      const compatibleHumor = {
        'dark': ['sarcastic', 'edgy'],
        'sarcastic': ['dark', 'edgy'],
        'wholesome': ['chill'],
        'edgy': ['dark', 'sarcastic'],
        'chill': ['wholesome']
      };
      const compat = compatibleHumor[user1.humor_type] || [];
      if (compat.includes(user2.humor_type)) {
        score += 20;
      }
    }
  }

  return Math.round(score);
}

function findMatches(user, allUsers) {
  const matches = [];

  allUsers.forEach(otherUser => {
    if (otherUser.user_id === user.user_id) return;

    const score = calculateCompatibility(user, otherUser);
    if (score >= THRESHOLD) {
      matches.push({
        ...otherUser,
        compatibilityScore: score
      });
    }
  });

  return matches;
}

function getMatches(user, allUsers) {
  return findMatches(user, allUsers).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

// Get matches using aggregated interestScores (from watched_reels)
function getMatchesFromAggregated(currentUser, allUsers) {
  const myScores = currentUser.interestScores || {};
  const myTotal = Object.values(myScores).reduce((a, b) => a + b, 0);

  const matches = [];

  allUsers.forEach(otherUser => {
    if (otherUser.user_id === currentUser.user_id) return;

    // Get other user's interest scores
    const { data: otherReels } = require('../supabase')
      .from('watched_reels')
      .select('hashtags')
      .eq('user_id', otherUser.user_id);

    const otherScores = aggregateInterests(otherReels || []);
    const otherTotal = Object.values(otherScores).reduce((a, b) => a + b, 0);

    const score = calculateCompatibilityFromScores(myScores, myTotal, otherScores, otherTotal);
    if (score >= THRESHOLD) {
      matches.push({
        ...otherUser,
        interestScores: otherScores,
        compatibilityScore: score
      });
    }
  });

  return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

function calculateCompatibilityFromScores(myScores, myTotal, otherScores, otherTotal) {
  let score = 0;

  // Interest overlap using dot product
  const allInterests = new Set([...Object.keys(myScores), ...Object.keys(otherScores)]);
  let dotProduct = 0;

  allInterests.forEach(interest => {
    const myCount = myScores[interest] || 0;
    const otherCount = otherScores[interest] || 0;
    dotProduct += myCount * otherCount;
  });

  if (myTotal > 0 && otherTotal > 0) {
    // Normalize dot product by magnitudes
    const myMagnitude = Math.sqrt(Object.values(myScores).reduce((a, b) => a + b * b, 0));
    const otherMagnitude = Math.sqrt(Object.values(otherScores).reduce((a, b) => a + b * b, 0));
    const cosineSimilarity = dotProduct / (myMagnitude * otherMagnitude);
    score = cosineSimilarity * 60;
  }

  // Humor type (unchanged - can add humor aggregation later)
  // For now just use stored humor_type
  return Math.round(score);
}

function aggregateInterests(reels) {
  const scores = {};
  const interestKeywords = [
    'food', 'travel', 'fitness', 'fashion', 'music', 'art', 'comedy',
    'tech', 'gaming', 'sports', 'nature', 'dance', 'beauty', 'cooking',
    'pets', 'cars', 'movies', 'books', 'memes'
  ];

  reels.forEach(reel => {
    const tags = reel.hashtags || [];
    tags.forEach(tag => {
      const lower = tag.toLowerCase();
      if (interestKeywords.includes(lower)) {
        scores[lower] = (scores[lower] || 0) + 1;
      }
    });
  });

  return scores;
}

module.exports = {
  calculateCompatibility,
  findMatches,
  getMatches,
  getMatchesFromAggregated,
  aggregateInterests,
  THRESHOLD
};
