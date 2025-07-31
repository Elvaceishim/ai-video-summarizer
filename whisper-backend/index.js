const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const OpenAI = require('openai');
const { AssemblyAI } = require('assemblyai');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
require('dotenv').config();

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// AssemblyAI for REAL transcription
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// OpenRouter for summarization
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://ai-video-summarizer.netlify.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json());

// Create uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Extract audio for transcription
function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log('🎵 Extracting audio for transcription...');
    
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioFrequency(16000)
      .audioChannels(1)
      .noVideo()
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🔄 Audio extraction: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ Audio extraction complete');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Audio extraction failed:', err);
        reject(err);
      })
      .run();
  });
}

// REAL transcription with AssemblyAI
async function transcribeWithAssemblyAI(audioPath, originalName) {
  try {
    console.log('🎯 Starting transcription with AssemblyAI...');
    
    const fileStats = fs.statSync(audioPath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    console.log(`📤 Uploading ${fileSizeMB}MB audio...`);
    
    // Upload audio file
    const uploadUrl = await client.files.upload(audioPath);
    console.log('✅ Audio uploaded successfully');
    
    // Request transcription
    console.log('🎙️ Processing speech-to-text...');
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadUrl,
      language_detection: true,
      punctuate: true,
      format_text: true,
      speaker_labels: true,
      auto_chapters: true
    });
    
    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI error: ${transcript.error}`);
    }
    
    console.log('✅ Transcription completed successfully!');
    console.log(`📝 Transcribed: ${transcript.text.length} characters`);
    console.log(`⏱️ Duration: ${Math.round(transcript.audio_duration)} seconds`);
    console.log(`🎯 Confidence: ${(transcript.confidence * 100).toFixed(1)}%`);
    
    return {
      text: transcript.text,
      confidence: transcript.confidence,
      language: transcript.language_code,
      duration: transcript.audio_duration,
      chapters: transcript.chapters || []
    };
    
  } catch (error) {
    console.error('❌ AssemblyAI transcription failed:', error);
    throw error;
  }
}

// Simple clean summary prompt
function createRealContentPrompt(transcript, filename, duration, confidence) {
  return `You are analyzing a real video transcript. Create a clean, simple summary using only bullet points.

VIDEO: ${filename}
DURATION: ${Math.round(duration)} seconds
TRANSCRIPT CONFIDENCE: ${(confidence * 100).toFixed(1)}%

ACTUAL SPOKEN CONTENT:
"${transcript}"

Create a simple bullet-point summary with NO asterisks, NO special characters, NO formatting symbols.

Use this exact format:

CONTENT SUMMARY:
• Main topic discussed in the video
• Secondary topics covered
• Key concepts explained

KEY POINTS:
• First important point with specific details
• Second important point with context
• Third important point with examples
• Additional points as needed

IMPORTANT DETAILS:
• Specific numbers or data mentioned
• Names or technical terms used
• Direct quotes from the speaker
• Facts or statistics shared

MAIN TAKEAWAYS:
• Primary lesson or insight
• Practical advice given
• Key recommendations
• Important conclusions

Keep it simple, clean, and easy to read. Use only bullet points with no other formatting.`;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'AI Video Summarizer - Clean Format',
    transcription: 'AssemblyAI Real Speech-to-Text',
    summarization: 'OpenRouter Clean Bullet Points'
  });
});

// Main transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  let audioPath = null;
  
  try {
    console.log('=== REAL VIDEO TRANSCRIPTION ===');

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const videoPath = req.file.path;
    const fileSizeInMB = (req.file.size / (1024 * 1024)).toFixed(2);
    const originalName = req.file.originalname;
    
    console.log(`📁 Processing: ${originalName} (${fileSizeInMB}MB)`);

    // Check API key
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key required');
    }

    // Extract audio
    audioPath = videoPath.replace(path.extname(videoPath), '.mp3');
    await extractAudio(videoPath, audioPath);

    // Real transcription
    const transcriptionResult = await transcribeWithAssemblyAI(audioPath, originalName);
    
    const transcript = transcriptionResult.text;
    const duration = transcriptionResult.duration;
    const confidence = transcriptionResult.confidence;
    const wordCount = transcript.split(' ').length;

    console.log(`✅ TRANSCRIPTION COMPLETE: ${wordCount} words`);
    console.log(`📝 Content preview: "${transcript.substring(0, 150)}..."`);

    // Clean summary with OpenRouter
    console.log('🤖 Creating clean summary...');
    
    const summaryPrompt = createRealContentPrompt(transcript, originalName, duration, confidence);
    
    const completion = await openrouter.chat.completions.create({
      model: "mistralai/mistral-7b-instruct",
      messages: [
        {
          role: "system",
          content: "Create clean bullet-point summaries with no special formatting. Use simple bullet points only."
        },
        {
          role: "user",
          content: summaryPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.1
    });

    const summary = completion.choices[0].message.content;

    console.log('✅ Clean summary completed');

    // Cleanup files
    try {
      fs.unlinkSync(videoPath);
      if (audioPath && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      console.log('🗑️ Files cleaned up');
    } catch {}

    // Return clean results
    res.json({
      success: true,
      transcript: transcript,
      summary: summary,
      wordCount: wordCount,
      duration: Math.round(duration),
      confidence: Math.round(confidence * 100),
      fileSizeInMB: parseFloat(fileSizeInMB),
      language: transcriptionResult.language,
      processingTime: new Date().toISOString(),
      accuracy: 'real_transcription_clean_format',
      models: {
        transcription: 'AssemblyAI',
        summarization: 'OpenRouter Clean Format'
      }
    });

  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    // Cleanup on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    if (audioPath) {
      try { fs.unlinkSync(audioPath); } catch {}
    }

    res.status(500).json({
      success: false,
      error: `Processing failed: ${error.message}`,
      suggestion: 'Check AssemblyAI API key and credits'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('🎙️ AI Video Summarizer - Clean Format');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📝 Clean bullet-point summaries');
  console.log('🎯 Real transcription + simple formatting');
});
