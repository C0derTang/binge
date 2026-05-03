import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import ProfileCard from './ProfileCard';

export default function Dashboard({ user, onLogout, API_URL }) {
  const [status, setStatus] = useState({ text: 'Extension active', state: 'active' });
  const [profile, setProfile] = useState(user);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    console.log('[Dashboard] Mounted, setting up listeners');
    loadData();
    // Listen for scraping complete
    chrome.runtime.onMessage.addListener(handleMessage);

    // Refresh matches every 5 seconds
    const interval = setInterval(() => {
      if (profile.userId) {
        loadMatches(profile.userId);
        loadInterestScores();
      }
    }, 5000);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  function handleMessage(msg) {
    console.log('[Dashboard] Received message:', msg.type, msg);
    if (msg.type === 'SCRAPING_START') {
      setStatus({ text: 'Scraping reels...', state: 'scraping' });
    } else if (msg.type === 'SCRAPING_COMPLETE') {
      setStatus({ text: 'Extension active', state: 'active' });
      loadInterestScores();
      loadMatches(profile.userId);
    }
  }

  async function updateUser(newInterests, newHumorType, newProfilePicture) {
    try {
      const updatedProfile = {
        ...profile,
        interests: newInterests || profile.interests,
        humorType: newHumorType || profile.humorType,
        profilePicture: newProfilePicture !== undefined ? newProfilePicture : profile.profilePicture
      };

      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          interests: updatedProfile.interests,
          humorType: updatedProfile.humorType,
          profilePicture: updatedProfile.profilePicture
        })
      });
      const data = await res.json();
      if (data.user) {
        setProfile(updatedProfile);
        await chrome.storage.local.set({ user: updatedProfile });
        await loadMatches(updatedProfile.userId);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }

  async function handlePictureUpload(base64) {
    // Optimistic update
    setProfile((prev) => ({ ...prev, profilePicture: base64 }));
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          interests: profile.interests,
          humorType: profile.humorType,
          profilePicture: base64
        })
      });
      const data = await res.json();
      console.log('[Dashboard] Upload response:', JSON.stringify(data).slice(0, 200));
      if (data.user || data.success) {
        setProfile((prev) => ({ ...prev, profilePicture: base64 }));
        await chrome.storage.local.set({ user: { ...profile, profilePicture: base64 } });
      }
    } catch (err) {
      console.error('[Dashboard] Upload failed:', err.message);
      // Keep optimistic update on failure
    }
  }

  async function loadData() {
    try {
      // Load interest scores from aggregated watched_reels
      await loadInterestScores();
      await loadMatches(profile.userId);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function loadMatches(userId) {
    const res = await fetch(`${API_URL}/users/${userId}/matches`);
    const data = await res.json();
    console.log('[Dashboard] Matches loaded:', data.matches?.length || 0);
    if (data.matches?.length > 0) {
      setMatches(data.matches);
    } else {
      setMatches([]);
    }
  }

  async function loadInterestScores() {
    try {
      const res = await fetch(`${API_URL}/users/${profile.userId}/interests`);
      const data = await res.json();
      if (data.interestScores) {
        const scores = data.interestScores;
        const interests = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
        setProfile(prev => ({ ...prev, interests }));
        await chrome.storage.local.set({ user: { ...profile, interests } });
      }
    } catch (err) {
      console.error('Failed to load interest scores:', err);
    }
  }

  return (
    <div className="min-h-screen bg-binge-bg">
      <div className="max-w-lg mx-auto p-6">
        <header className="flex justify-between items-center mb-5">
          <h1
            className="text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Binge
          </h1>
          <button
            onClick={onLogout}
            className="text-binge-dim text-sm hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            Logout
          </button>
        </header>

        <div className={`flex items-center gap-2 p-3 rounded-lg mb-5 ${status.state === 'scraping' ? 'animate-pulse' : ''}`}>
          <span className={`w-2 h-2 rounded-full ${
            status.state === 'active' ? 'bg-green-500' :
            status.state === 'scraping' ? 'bg-yellow-500' : 'bg-binge-dim'
          }`}></span>
          <span className="text-sm text-binge-dim">{status.text}</span>
        </div>

        <section className="mb-5">
          <h2 className="text-binge-dim text-sm font-medium mb-3">Your Profile</h2>
          <div className="bg-binge-card rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
                <ImageUploader
                currentPicture={profile.profilePicture}
                onUpload={handlePictureUpload}
              />
              <div>
                <h3 className="text-white font-semibold text-base">{profile.displayName}</h3>
                {profile.humorType && (
                  <span className="text-binge-accent text-xs capitalize">{profile.humorType} humor</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.length > 0 ? (
                profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="bg-binge-border px-3 py-1 rounded-full text-xs text-gray-300"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-binge-dim text-xs">No interests yet</span>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-binge-dim text-sm font-medium mb-3">Your Matches</h2>
          <div className="flex flex-col gap-3">
            {matches.length === 0 ? (
              <p className="text-binge-dim text-sm text-center py-5">No matches yet. Keep watching reels!</p>
            ) : (
              matches.map((match) => (
                <ProfileCard
                  key={match.userId}
                  profile={match}
                  showScore={true}
                />
              ))
            )}
          </div>
        </section>

              </div>
    </div>
  );
}
