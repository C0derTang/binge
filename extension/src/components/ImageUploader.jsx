import { useState, useRef, useEffect } from 'react';

export default function ImageUploader({ currentPicture, onUpload }) {
  const [preview, setPreview] = useState(currentPicture || null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentPicture || null);
  }, [currentPicture]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 500KB for base64)
    if (file.size > 500 * 1024) {
      alert('Image must be under 500KB');
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setPreview(base64);
      setLoading(false);
      if (onUpload) onUpload(base64);
    };
    reader.onerror = () => {
      setLoading(false);
      alert('Failed to read image');
    };
    reader.readAsDataURL(file);
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div
        className="w-16 h-16 rounded-full overflow-hidden bg-binge-border cursor-pointer flex-shrink-0"
        onClick={triggerFileInput}
      >
        {preview ? (
          <img src={preview} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-binge-dim text-2xl font-bold">
            ?
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div>
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={loading}
          className="text-binge-accent text-sm hover:underline disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-binge-dim text-xs mt-1">Max 500KB</p>
      </div>
    </div>
  );
}