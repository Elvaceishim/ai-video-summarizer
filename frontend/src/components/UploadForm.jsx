import { useState } from 'react';

export default function UploadForm({ onResult }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch('http://localhost:3001/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      onResult(data);
    } catch (err) {
      alert('Transcription failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload audio or video file
        </label>
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button 
        type="submit" 
        disabled={loading} 
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Transcribing...' : 'Upload & Transcribe'}
      </button>
    </form>
  );
}
