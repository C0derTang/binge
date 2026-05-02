export default function ProfileCard({ profile, showScore = false }) {
  const { displayName, interests = [], humorType, profilePicture, compatibilityScore } = profile;

  return (
    <div className="bg-binge-card rounded-lg p-4">
      {/* Profile Picture */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-binge-border flex-shrink-0">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-binge-dim text-2xl font-bold">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-white font-semibold text-base">{displayName}</h3>
          {humorType && (
            <span className="text-binge-accent text-xs capitalize">{humorType} humor</span>
          )}
        </div>
        {showScore && compatibilityScore && (
          <div className="ml-auto text-right">
            <span className="text-green-500 text-lg font-bold">{compatibilityScore}%</span>
            <span className="text-binge-dim text-xs block">match</span>
          </div>
        )}
      </div>

      {/* Interests */}
      <div className="flex flex-wrap gap-2">
        {interests.length > 0 ? (
          interests.map((interest) => (
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
  );
}