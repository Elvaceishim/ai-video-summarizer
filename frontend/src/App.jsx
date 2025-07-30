import React, { useState, useEffect } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [progress, setProgress] = useState(''); // ADD this new state variable
  const [result, setResult] = useState(null); // ADD this new state variable

  useEffect(() => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);

      // Clean up URL object when file changes or component unmounts
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreview(null);
    }
  }, [file]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setTranscript('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript('');
    setProgress('Uploading file...'); // ← Add this

    const formData = new FormData();
    formData.append('audio', file); // ✅ Changed from 'file' to 'audio'

    try {
      console.log('Uploading file:', file.name);
      console.log('⏳ This may take 2-5 minutes for long videos...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 600000); // 10 minute timeout

      const response = await fetch('http://localhost:3001/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response received:', data);
      
      setResult(data);
      setTranscript(data.summary || data.transcript || 'Summary generated successfully');
      setProgress(''); // ← Add this
    } catch (error) {
      if (error.name === 'AbortError') {
        alert('Request timed out after 10 minutes. Try a shorter video.');
      } else {
        console.error('Upload error:', error);
        alert(`Error: ${error.message}`);
      }
      setTranscript('Error processing video. Please try again.');
      setProgress(''); // ← Add this
    } finally {
      setLoading(false);
    }
  };

  const downloadSummary = () => {
    if (!transcript) return;

    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `video-summary-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copySummary = async () => {
    if (!transcript) return;

    try {
      await navigator.clipboard.writeText(transcript);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = transcript;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'Arial, sans-serif' }}>
      <header className="bg-blue-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">AI Video Summarizer</h1>
          <p className="text-blue-100 text-lg">Upload your video to get an AI-powered summary</p>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Video Upload</h2>
          <p className="text-gray-600 mb-4">Upload your video file here to get your summarization</p>
          
          <form onSubmit={handleSubmit}>
            <input type="file" accept="audio/*,video/*" onChange={handleFileChange} className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-full mb-4" />
            <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full">
              {loading ? 'Transcribing...' : 'Transcribe'}
            </button>
          </form>

          {videoPreview && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Video Preview:</h3>
              <video src={videoPreview} controls width="100%" style={{ borderRadius: 8 }} />
            </div>
          )}

          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>

        {/* Summary Section */}
        {(transcript || loading) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Summary</h2>
              
              {transcript && (
                <div className="flex space-x-2">
                  <button
                    onClick={copySummary}
                    className="flex items-center space-x-2 bg-green-500 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                  
                  <button
                    onClick={downloadSummary}
                    className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download .txt</span>
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">
                  {progress || 'Processing...'} {/* ← Change this line */}
                </span>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">{transcript}</pre>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-8">
            {/* Only Summary Section - NO Transcript */}
            {result.summary && (
              <div className="space-y-4">
                
                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-4">
                  {result.wordCount && (
                    <span className="flex items-center gap-1">
                      📝 {result.wordCount} words processed
                    </span>
                  )}
                  {result.duration && (
                    <span className="flex items-center gap-1">
                      ⏱️ {Math.round(result.duration)}s video
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    🤖 AI-powered analysis
                  </span>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {!result.summary && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  ⚠️ Video processed but summary generation failed. Please try again.
                </p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg text-gray-700 font-medium">
                🧠 AI is analyzing your video...
              </p>
              <p className="text-sm text-gray-500">
                Creating a thoughtful summary with personality
              </p>
              <p className="text-xs text-gray-400">
                This might take a few minutes for longer videos - we're making it worth the wait! ⏳
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
