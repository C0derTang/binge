import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import ProfileCard from './ProfileCard';

export default function Dashboard({ user, onLogout, API_URL }) {
  const [status, setStatus] = useState({ text: 'Extension active', state: 'active' });
  const [profile, setProfile] = useState(user);
  const [matches, setMatches] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    console.log('[Dashboard] Mounted, setting up listeners');
    loadData();
    // Listen for scraping complete
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  function handleMessage(msg) {
    console.log('[Dashboard] Received message:', msg.type, msg);
    if (msg.type === 'SCRAPING_START') {
      setStatus({ text: 'Scraping reels...', state: 'scraping' });
      addLog(`Started scraping ${msg.count} reels`);
    } else if (msg.type === 'SCRAPING_COMPLETE') {
      setStatus({ text: 'Extension active', state: 'active' });
      addLog(`Found: ${msg.interests?.join(', ') || 'no new interests'}`);
      updateUser(msg.interests, msg.humorType);
    }
  }

  function addLog(message) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ time, message }, ...prev].slice(0, 5));
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
    setProfile((prev) => ({ ...prev, profilePicture: base64 }));
    await updateUser(profile.interests, profile.humorType, base64);
  }

  async function loadData() {
    try {
      // Load user profile
      const profileRes = await fetch(`${API_URL}/users/${profile.userId}`);
      const profileData = await profileRes.json();
      const nextProfile = {
        ...profile,
        profilePicture: profileData.profilePicture || null,
        interests: profileData.interests || [],
        humorType: profileData.humorType || null
      };

      setProfile(nextProfile);
      await chrome.storage.local.set({ user: nextProfile });
      await loadMatches(nextProfile.userId);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function loadMatches(userId) {
    const res = await fetch(`${API_URL}/users/${userId}/matches`);
    const data = await res.json();
    if (data.matches) setMatches(data.matches);
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

        <section>
          <h2 className="text-binge-dim text-sm font-medium mb-2">Scraping Log</h2>
          <div className="bg-binge-card rounded-lg p-3">
            {logs.length === 0 ? (
              <p className="text-binge-dim text-xs">No activity yet</p>
            ) : (
              <div className="flex flex-col gap-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-binge-dim">{log.time}</span>
                    <span className="text-white">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
