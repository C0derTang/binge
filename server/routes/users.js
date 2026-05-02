const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const matchingService = require('../services/matching');

// Get compatibility between two users
router.get('/compatibility', async (req, res) => {
  const { userId1, userId2 } = req.query;

  const { data: user1 } = await supabase.from('users').select('*').eq('user_id', userId1).single();
  const { data: user2 } = await supabase.from('users').select('*').eq('user_id', userId2).single();

  if (!user1 || !user2) {
    return res.status(404).json({ error: 'User not found' });
  }

  const score = matchingService.calculateCompatibility(user1, user2);
  res.json({ score });
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { userId, interests, humorType, profilePicture } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const updateData = {};
    if (interests) updateData.interests = interests;
    if (humorType) updateData.humor_type = humorType;
    if (profilePicture !== undefined) updateData.profile_picture = profilePicture;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Run auto-match
    const { data: allUsers } = await supabase.from('users').select('*');
    const currentUser = allUsers.find(u => u.user_id === userId);

    if (currentUser) {
      const matches = matchingService.findMatches(currentUser, allUsers);
      matches.forEach(match => {
        console.log(`Match found: ${currentUser.display_name} <3 ${match.display_name}`);
      });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('user_id, display_name, interests, humor_type, profile_picture')
    .eq('user_id', req.params.userId)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId: user.user_id,
    displayName: user.display_name,
    interests: user.interests || [],
    humorType: user.humor_type,
    profilePicture: user.profile_picture
  });
});

// Get matches for a user
router.get('/:userId/matches', async (req, res) => {
  const { data: currentUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', req.params.userId)
    .single();

  if (error || !currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get all watched reels for current user
  const { data: myReels } = await supabase
    .from('watched_reels')
    .select('hashtags')
    .eq('user_id', req.params.userId);

  // Get all other users and their reels
  const { data: allUsers } = await supabase.from('users').select('*');
  const myInterests = aggregateInterests(myReels || []);
  const currentUserWithAggregated = { ...currentUser, interestScores: myInterests };

  const matches = matchingService.getMatchesFromAggregated(currentUserWithAggregated, allUsers);

  res.json({
    matches: matches.map(m => ({
      userId: m.user_id,
      displayName: m.display_name,
      interests: Object.keys(m.interestScores || {}),
      humorType: m.humor_type,
      profilePicture: m.profile_picture,
      compatibilityScore: m.compatibilityScore
    }))
  });
});

// Add a watched reel
router.post('/:userId/reels', async (req, res) => {
  try {
    const { shortcode, caption, hashtags, username } = req.body;
    const userId = req.params.userId;

    if (!shortcode) {
      return res.status(400).json({ error: 'shortcode required' });
    }

    // Check if already watched (avoid duplicates)
    const { data: existing } = await supabase
      .from('watched_reels')
      .select('id')
      .eq('user_id', userId)
      .eq('shortcode', shortcode)
      .single();

    if (existing) {
      return res.json({ success: true, message: 'Already watched' });
    }

    const { data, error } = await supabase
      .from('watched_reels')
      .insert({
        user_id: userId,
        shortcode,
        caption,
        hashtags: hashtags || [],
        username
      })
      .select()
      .single();

    if (error) {
      console.error('Add reel error:', error);
      return res.status(500).json({ error: 'Failed to add reel' });
    }

    res.json({ success: true, reel: data });
  } catch (err) {
    console.error('Add reel error:', err);
    res.status(500).json({ error: 'Failed to add reel' });
  }
});

// Get all watched reels for a user
router.get('/:userId/reels', async (req, res) => {
  const { data: reels, error } = await supabase
    .from('watched_reels')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('watched_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to get reels' });
  }

  res.json({ reels });
});

// Get aggregated interest scores for a user
router.get('/:userId/interests', async (req, res) => {
  const { data: reels } = await supabase
    .from('watched_reels')
    .select('hashtags')
    .eq('user_id', req.params.userId);

  const scores = aggregateInterests(reels || []);
  res.json({ interestScores: scores });
});

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

module.exports = router;
