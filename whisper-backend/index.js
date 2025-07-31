const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

const app = express();

// EXTREMELY PERMISSIVE CORS (for debugging)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received from:', req.headers.origin);
    return res.status(200).end();
  }
  
  console.log(`${req.method} ${req.path} from origin:`, req.headers.origin);
  next();
});

// Also use cors middleware as backup
app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Initialize AssemblyAI
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'OK',
    service: 'AI Video Summarizer',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Transcribe endpoint with detailed logging
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  console.log('🎬 TRANSCRIBE REQUEST RECEIVED!');
  console.log('File:', req.file ? req.file.filename : 'No file');
  console.log('Headers:', req.headers);
  
  try {
    if (!req.file) {
      console.log('❌ No file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file provided' 
      });
    }

    console.log('🔄 Starting transcription...');
    console.log('File path:', req.file.path);
    console.log('File size:', req.file.size);

    const transcript = await client.transcripts.transcribe({
      audio: req.file.path
    });

    if (transcript.status === 'error') {
      console.log('❌ AssemblyAI error:', transcript.error);
      throw new Error(transcript.error);
    }

    console.log('✅ Transcription complete!');
    console.log('Text length:', transcript.text.length);

    // Simple summary
    const summary = transcript.text.length > 500 
      ? transcript.text.substring(0, 500) + '...'
      : transcript.text;

    // Clean up file
    fs.unlinkSync(req.file.path);
    console.log('🧹 File cleaned up');

    const response = {
      success: true,
      transcript: transcript.text,
      summary: summary,
      wordCount: transcript.text.split(' ').length,
      duration: transcript.audio_duration
    };

    console.log('📤 Sending response');
    res.json(response);

  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🧹 Error cleanup: file removed');
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🔗 Health check: http://localhost:' + PORT + '/health');
  console.log('🎯 CORS: Fully permissive');
});
