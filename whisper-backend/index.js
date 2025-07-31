const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Simple CORS
app.use(cors({ origin: '*' }));
app.use(express.json());

// Multer setup
const upload = multer({ dest: 'uploads/' });

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AI Video Summarizer',
    timestamp: new Date().toISOString()
  });
});

app.post('/transcribe', upload.single('audio'), (req, res) => {
  res.json({
    success: true,
    message: 'Route working - transcription logic to be added'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
