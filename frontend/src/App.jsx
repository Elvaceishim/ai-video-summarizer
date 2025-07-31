import React, { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://192.168.1.105:3001';

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please select a valid video or audio file');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      setError(`Processing failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const copySummary = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const downloadSummary = () => {
    if (result?.summary) {
      const element = document.createElement('a');
      const file = new Blob([result.summary], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `summary-${Date.now()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎬 AI Video Summarizer</h1>
          <p>Upload your video or audio file for AI-powered transcription and summarization</p>
        </header>

        <div className="upload-section">
          {!file ? (
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <h3>Drop your file here or click to browse</h3>
                <p>Supports MP4, AVI, MOV, MP3, WAV, M4A files</p>
              </div>
              <input
                id="file-input"
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-info">
                <div className="file-icon">
                  {file.type.startsWith('video/') ? '🎬' : '🎵'}
                </div>
                <div className="file-details">
                  <h3>{file.name}</h3>
                  <p>{formatFileSize(file.size)}</p>
                  <p>{file.type || 'Unknown type'}</p>
                </div>
              </div>
              <div className="file-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={resetUpload}
                  disabled={isLoading}
                >
                  Change File
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {file && (
            <button 
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Processing...
                </>
              ) : (
                '🎯 Transcribe & Summarize'
              )}
            </button>
          )}
        </div>

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>✅ Results</h2>
              <div className="stats">
                {result.wordCount && <span>📝 {result.wordCount} words</span>}
                {result.duration && <span>⏱️ {Math.round(result.duration)}s</span>}
                <span>🤖 AI-powered</span>
              </div>
            </div>

            <div className="result-card">
              <div className="result-header">
                <h3>📋 Summary</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={copySummary}
                    className="copy-btn"
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadSummary}
                    className="copy-btn"
                    style={{ background: '#6f42c1' }}
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="result-content">
                <div className="summary">
                  <pre>{result.summary}</pre>
                </div>
              </div>
            </div>

            <button 
              className="btn-primary"
              onClick={resetUpload}
              style={{ marginTop: '2rem' }}
            >
              🔄 Process Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
