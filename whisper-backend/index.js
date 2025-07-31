const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ai-video-summarizer.netlify.app'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Create uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'AI Video Summarizer Backend',
    apis: 'OpenAI Whisper + GPT'
  });
});

// Main transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('=== New Transcription Request ===');
    console.log('Uploaded file:', req.file);

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const uploadedPath = req.file.path;
    const fileSizeInMB = (req.file.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📁 Processing file: ${req.file.originalname}`);
    console.log(`📊 File size: ${fileSizeInMB} MB`);

    // Step 1: Transcribe with OpenAI Whisper
    console.log('🎯 Starting OpenAI Whisper transcription...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(uploadedPath),
      model: "whisper-1",
      language: "en",
      response_format: "text"
    });

    const cleanTranscript = transcription.trim();
    const wordCount = cleanTranscript.split(' ').length;

    console.log(`✅ Transcription completed: ${wordCount} words`);

    // Step 2: Generate summary with OpenAI GPT
    console.log('🤖 Generating personality-rich summary with GPT...');

    const summaryPrompt = `You are a friendly and insightful AI assistant who creates engaging video summaries. 

Please analyze this video transcript and create a summary with personality that includes:
- A catchy title or opening line that captures the essence
- Key points in bullet format with engaging language  
- Any interesting details, numbers, or quotes worth highlighting
- The overall tone/mood of the video
- A brief takeaway or conclusion

Make it feel like a friend is telling you about a cool video they just watched. Use emojis where appropriate and write in a conversational, engaging style.

Video Transcript:
${cleanTranscript}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user", 
          content: summaryPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    const summary = completion.choices[0].message.content;

    console.log('✅ Summary generated successfully!');
    console.log(`📝 Summary length: ${summary.length} characters`);

    // Clean up uploaded file
    try {
      fs.unlinkSync(uploadedPath);
      console.log('🗑️ Cleaned up uploaded file');
    } catch (cleanupError) {
      console.log('⚠️ Could not clean up file:', cleanupError.message);
    }

    // Return successful response
    res.json({
      success: true,
      transcript: cleanTranscript,
      summary: summary,
      wordCount: wordCount,
      fileSizeInMB: parseFloat(fileSizeInMB),
      processingTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Clean up file if error occurs
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up file after error');
      }
    }

    // Return error response
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('=== AI Video Summarizer Backend ===');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🤖 Powered by OpenAI Whisper + GPT');
  console.log('📁 Upload directory:', uploadDir);
  console.log('🌐 CORS enabled for frontend domains');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  WARNING: OPENAI_API_KEY not set!');
  } else {
    console.log('✅ OpenAI API key configured');
  }
});
