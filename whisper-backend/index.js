const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AssemblyAI } = require('assemblyai');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://ai-video-summarizer.netlify.app',
    'https://whisper-backend-bsoxenqz2-elvis-projects-7d4af51e.vercel.app',
    'http://localhost:5174',
    'http://192.168.1.105:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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

// Initialize OpenAI
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AI Video Summarizer - Clean Format',
    timestamp: new Date().toISOString()
  });
});

// Enhanced transcribe route with better summarization
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file provided' 
      });
    }

    console.log('File received:', req.file.filename);

    // Transcribe with AssemblyAI
    const transcript = await client.transcripts.transcribe({
      audio: req.file.path
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }

    // Generate summary with OpenRouter (Claude)
    let summary;
    try {
      const completion = await openrouter.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: `Please provide a concise summary of this transcript:\n\n${transcript.text}`
          }
        ],
        max_tokens: 500
      });
      summary = completion.choices[0].message.content;
    } catch (summaryError) {
      console.error('Summary generation failed:', summaryError);
      summary = `Summary: ${transcript.text.substring(0, 500)}...`;
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      transcript: transcript.text,
      summary: summary,
      wordCount: transcript.text.split(' ').length,
      duration: transcript.audio_duration
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Transcription failed'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
