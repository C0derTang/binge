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

module.exports = {
  calculateCompatibility,
  findMatches,
  getMatches,
  THRESHOLD
};
