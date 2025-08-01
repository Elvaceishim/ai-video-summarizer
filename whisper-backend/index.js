const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AssemblyAI } = require('assemblyai');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();

// CORS setup FIRST
app.use(cors({ origin: '*', credentials: false }));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add basic routes at the top (your existing routes are perfect)
app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ 
    message: 'AI Video Summarizer Backend is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: ['/health', '/transcribe']
  });
});

app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({
    status: 'OK',
    service: 'AI Video Summarizer',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

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

// Initialize OpenRouter for summarization
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Updated transcribe endpoint with proper AI summarization
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  console.log('🎬 TRANSCRIBE REQUEST RECEIVED!');
  console.log('File:', req.file ? req.file.filename : 'No file');
  
  try {
    if (!req.file) {
      console.log('❌ No file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file provided' 
      });
    }

    console.log('🔄 Starting transcription...');
    
    // Step 1: Transcribe with AssemblyAI
    const transcript = await client.transcripts.transcribe({
      audio: req.file.path
    });

    if (transcript.status === 'error') {
      console.log('❌ AssemblyAI error:', transcript.error);
      throw new Error(transcript.error);
    }

    console.log('✅ Transcription complete!');
    console.log('Text length:', transcript.text.length);

    // Step 2: Generate AI summary with bullet points
    let summary;
    try {
      console.log('🤖 Generating AI summary...');
      
      const completion = await openrouter.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: `Please analyze this transcript and provide a concise summary in bullet points. Focus on the main topics, key insights, and important details. Format your response as clear bullet points:

Transcript:
${transcript.text}

Please provide:
• Main topic/theme
• Key points discussed
• Important details or conclusions
• Any actionable items mentioned

Keep it concise but comprehensive.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      summary = completion.choices[0].message.content;
      console.log('✅ AI summary generated!');
      
    } catch (summaryError) {
      console.error('❌ AI summary failed:', summaryError);
      
      // Fallback: Create manual bullet points from transcript
      const sentences = transcript.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const keyPoints = sentences.slice(0, 5).map((sentence, index) => 
        `• ${sentence.trim()}`
      ).join('\n');
      
      summary = `**Summary (Auto-generated):**\n${keyPoints}`;
    }

    // Clean up uploaded file
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// For Vercel
module.exports = app;
