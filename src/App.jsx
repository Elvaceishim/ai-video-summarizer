import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);  // Make sure this exists
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [summary, setSummary] = useState('');
  const [transcript, setTranscript] = useState(''); // Added transcript state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';
  console.log('🔗 API URL:', API_URL); // Add this to debug

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        setFile(file);
        setError('');
      } else {
        setError('Please select a valid audio or video file');
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid video or audio file');
    }
  };

  const isValidFile = (file) => {
    const validTypes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime',
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a',
      'video/x-msvideo', 'audio/mp4'
    ];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = file.name.match(/\.(mp4|avi|mov|mp3|wav|m4a)$/i);
    
    return hasValidType || hasValidExtension;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB in bytes

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file first');
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large! Maximum size is 6MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please compress your video first.`);
      return;
    }

    setIsLoading(true);
    setError('');
    setResults(null);
    
    try {
      const formData = new FormData();
      // Use 'file' as the field name instead of 'audio'
      formData.append('file', file);

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      // Try to parse JSON directly without strict content-type checking
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('📄 Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      console.log('✅ Parsed data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Set the results to display them
      setResults(data);  // Make sure this line exists
      setIsLoading(false);
      setError('');

    } catch (error) {
      console.error('❌ Transcription error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setIsLoading(false);
  };

  const copySummary = () => {
    if (results?.summary) {
      navigator.clipboard.writeText(results.summary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const downloadSummary = () => {
    if (results?.summary) {
      const element = document.createElement('a');
      const file = new Blob([results.summary], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `summary-${Date.now()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const setSummaryWithLog = (newSummary) => {
    console.log('🔄 Setting summary:', newSummary.substring(0, 50) + '...');
    console.trace('Summary set from:'); // This will show the call stack
    setSummary(newSummary);
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopySuccess('✅ Copied!');
      setTimeout(() => setCopySuccess(''), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopySuccess('❌ Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const handleDownloadSummary = () => {
    try {
      // Create file content with title and timestamp
      const timestamp = new Date().toLocaleString();
      const fileName = file ? file.name : 'audio-file';
      const fileContent = `AI Video Summary
Generated: ${timestamp}
Source: ${fileName}

${summary}

---
Generated by AI Video Summarizer`;

      // Create blob and download
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `summary-${fileName.split('.')[0]}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed: ', err);
      setError('Failed to download summary');
    }
  };

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopySuccess('✅ Transcript copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopySuccess('❌ Copy failed');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const handleDownloadTranscript = () => {
    try {
      const timestamp = new Date().toLocaleString();
      const fileName = file ? file.name : 'audio-file';
      const fileContent = `AI Video Transcript
Generated: ${timestamp}
Source: ${fileName}

${transcript}

---
Generated by AI Video Summarizer`;

      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript-${fileName.split('.')[0]}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed: ', err);
      setError('Failed to download transcript');
    }
  };

  const handleDownloadAll = () => {
    try {
      const timestamp = new Date().toLocaleString();
      const fileName = file ? file.name : 'audio-file';
      const fileContent = `AI Video Analysis Report
Generated: ${timestamp}
Source: ${fileName}

=== SUMMARY ===
${summary}

=== FULL TRANSCRIPT ===
${transcript}

---
Generated by AI Video Summarizer
https://ai-video-summarizer.netlify.app`;

      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `complete-analysis-${fileName.split('.')[0]}-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed: ', err);
      setError('Failed to download complete analysis');
    }
  };

  const uploadAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    try {
      setIsLoading(true);
      setError(null);

      console.log('📤 Uploading to:', `${API_URL}/transcribe`); // Debug log

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setTranscript(data.transcript);
      setSummary(data.summary);
    } catch (error) {
      console.error('❌ Upload error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      // You can add a toast notification here if you want
      console.log(`✅ ${type} copied to clipboard!`);
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  };

  const downloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    if (!results) return;
    
    const fullAnalysis = `AI Video Analysis Report
================================

File: ${results.filename}
Duration: ${Math.round(results.duration)} seconds
Word Count: ${results.wordCount}
Type: ${results.fileType}

AI SUMMARY
==========
${results.summary}

FULL TRANSCRIPT
===============
${results.transcript}

Generated by AI Video Summarizer
Report created on: ${new Date().toLocaleString()}
`;

    downloadText(fullAnalysis, `${results.filename}-complete-analysis.txt`);
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎬 AI Video Summarizer</h1>
          <p>Upload audio or video files to get AI-powered transcriptions and summaries</p>
        </header>

        <div className="upload-section">
          <div className="upload-card">
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*,.mp4,.mov,.avi,.mkv,.webm,.wav,.mp3,.m4a,.flac,.aac,.ogg"
                onChange={handleFileSelect}
                className="file-input"
                id="file-input"
              />
              <label 
                htmlFor="file-input" 
                className={`file-upload-label ${isDragOver ? 'drag-over' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  {isDragOver ? '📂' : '📁'}
                </div>
                <div className="upload-text">
                  <span className="upload-link">
                    {isDragOver ? 'Drop your file here!' : 'Choose audio or video file'}
                  </span>
                  <span className="upload-subtext">
                    {isDragOver ? 'Release to upload' : 'or drag and drop here'}
                  </span>
                </div>
              </label>
              
              {file && (
                <div className="selected-file">
                  <div className="file-info">
                    <span className="file-icon">🎬</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                      {file.size > MAX_FILE_SIZE && (
                        <span style={{color: 'red'}}> - TOO LARGE!</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={!file || isLoading}
              className={`transcribe-btn ${isLoading ? 'loading' : ''} ${!file ? 'disabled' : ''}`}
            >
              {isLoading && <span className="loading-spinner"></span>}
              {isLoading ? 'Processing...' : '🚀 Transcribe & Summarize'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {results && (
          <div className="results">
            <div className="results-header">
              <h2>Analysis Complete! 🎉</h2>
              <div className="stats">
                <span>📄 {results.wordCount} words</span>
                <span>⏱️ {Math.round(results.duration)}s duration</span>
                <span>🎬 {results.fileType}</span>
                <span>📁 {results.filename}</span>
              </div>
            </div>

            {/* AI Summary Section */}
            <div className="result-section summary-section">
              <div className="section-header">
                <h3>🤖 AI Summary</h3>
                <div className="action-buttons">
                  <button 
                    className="action-btn copy-btn"
                    onClick={() => copyToClipboard(results.summary, 'summary')}
                  >
                    📋 Copy
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={() => downloadText(results.summary, `${results.filename}-summary.txt`)}
                  >
                    💾 Download
                  </button>
                </div>
              </div>
              <div className="summary-content">
                {results.summary}
              </div>
            </div>

            {/* Transcript Section */}
            <div className="result-section transcript-section">
              <div className="section-header">
                <h3>📝 Full Transcript</h3>
                <div className="action-buttons">
                  <button 
                    className="action-btn copy-btn"
                    onClick={() => copyToClipboard(results.transcript, 'transcript')}
                  >
                    📋 Copy
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={() => downloadText(results.transcript, `${results.filename}-transcript.txt`)}
                  >
                    💾 Download
                  </button>
                </div>
              </div>
              <div className="transcript-content">
                {results.transcript}
              </div>
            </div>

            {/* Download All Section */}
            <div className="download-all-section">
              <button 
                className="download-all-btn"
                onClick={downloadAll}
              >
                📦 Download Complete Analysis
              </button>
            </div>
          </div>
        )}

        {/* Add this temporarily right after your upload section to debug */}
        {console.log('🔍 Results state:', results)}
        {results && console.log('🎯 Results exist, should show UI')}
      </div>
    </div>
  );
}

export default App;
