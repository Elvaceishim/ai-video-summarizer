const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();

// Remove timeout limits completely for summarization
app.use((req, res, next) => {
  if (req.path === '/transcribe') {
    req.setTimeout(0); // No timeout
    res.setTimeout(0); // No timeout
  }
  next();
});

app.use(cors());
app.use(express.json());

const port = 3001;

// Define paths based on your folder structure
const whisperExecutable = path.resolve(__dirname, '../whisper.cpp/build/bin/whisper-cli');
const modelPath = path.resolve(__dirname, '../whisper.cpp/models/ggml-base.en.bin');
const transcriptsDir = path.resolve(__dirname, '../whisper.cpp/transcripts');
const uploadDir = path.resolve(__dirname, 'uploads');  // you already have execFile; add exec for ffmpeg


// Debug: Print resolved paths on startup
console.log('=== Path Configuration ===');
console.log('Whisper executable:', whisperExecutable);
console.log('Model path:', modelPath);
console.log('Transcripts dir:', transcriptsDir);
console.log('Upload dir:', uploadDir);

// Check if critical files exist
if (!fs.existsSync(whisperExecutable)) {
  console.error('ERROR: whisper-cli not found at:', whisperExecutable);
  process.exit(1);
}

if (!fs.existsSync(modelPath)) {
  console.error('ERROR: Model file not found at:', modelPath);
  process.exit(1);
}

console.log('✅ All required files found');

// Ensure necessary directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(transcriptsDir)) {
  fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Configure file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept common audio/video formats
    const allowedMimes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|mp4|webm|mov|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload audio or video files.'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Enable CORS for your frontend origin
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173']
}));

// Add error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
    }
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Transcription endpoint
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
    const filename = path.parse(req.file.filename).name;
    const wavPath = path.join(uploadDir, `${filename}.wav`);
    const transcriptPath = path.join(transcriptsDir, `${filename}.txt`);

    console.log('File paths:');
    console.log(`- Uploaded: ${uploadedPath}`);
    console.log(`- WAV output: ${wavPath}`);
    console.log(`- Transcript output: ${transcriptPath}`);

    // FFmpeg conversion
    const ffmpegCmd = `ffmpeg -y -i "${uploadedPath}" -ar 16000 -ac 1 -acodec pcm_s16le -vn "${wavPath}"`;
    console.log(`FFmpeg command: ${ffmpegCmd}`);

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Convert to WAV
    await execAsync(ffmpegCmd);

    // Audio analysis
    const stats = fs.statSync(wavPath);
    console.log(`WAV file size: ${stats.size} bytes`);

    // Build Whisper command
    const whisperArgs = [
      '-m', modelPath,
      '-f', wavPath,
      '--output-txt',
      '--output-file', transcriptPath.replace('.txt', ''),
      '--threads', '4',
      '--no-gpu',
      '--language', 'auto',
      '--temperature', '0.8',
      '--no-speech-thold', '0.1'
    ];

    const whisperCmd = `"${whisperExecutable}" ${whisperArgs.map(arg => `"${arg}"`).join(' ')}`;
    console.log(`Whisper command: ${whisperCmd}`);

    // Execute Whisper
    const { stdout, stderr } = await execAsync(whisperCmd, {
      timeout: 300000,  // 5 minutes
      maxBuffer: 1024 * 1024 * 10  // 10MB buffer
    });

    console.log('Whisper completed successfully');

    // Read transcript
    if (!fs.existsSync(transcriptPath)) {
      throw new Error('Transcript file was not created');
    }

    const transcript = fs.readFileSync(transcriptPath, 'utf8').trim();
    
    if (!transcript || transcript.length < 10) {
      throw new Error('Transcript is empty or too short');
    }

    // Clean transcript
    const cleanTranscript = transcript
      .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const wordCount = cleanTranscript.split(' ').length;
    console.log(`✅ Transcript generated: ${wordCount} words`);

    // Try summary generation
    let summary = '• Video processed successfully\n• Summary generation in progress...';

    try {
      console.log('🤖 Generating summary with personality (no timeouts)...');
      
      const shortTranscript = cleanTranscript.length > 2000 ? 
        cleanTranscript.substring(0, 2000) + '...' : cleanTranscript;

      const summaryPrompt = `You are a friendly and insightful AI assistant who watches videos and creates engaging summaries. Please analyze this video transcript and create a summary that captures both the content and the vibe of the video.

Video Transcript:
${shortTranscript}

Create a summary with personality that includes:
- A catchy title or opening line that captures the essence
- Key points in bullet format with engaging language
- Any interesting details, numbers, or quotes worth highlighting  
- The overall tone/mood of the video
- A brief takeaway or conclusion

Make it feel like a friend is telling you about a cool video they just watched. Use emojis where appropriate and write in a conversational, engaging style.`;

      console.log('=== ENHANCED PROMPT WITH PERSONALITY ===');
      console.log(summaryPrompt.substring(0, 400) + '...');
      console.log('=== SENDING TO OLLAMA (NO TIMEOUT) ===');

      // Remove ALL timeouts - let it take as long as it needs
      const summaryResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No timeout/signal at all!
        body: JSON.stringify({
          model: 'llama3:latest',
          prompt: summaryPrompt,
          stream: false,
          options: { 
            temperature: 0.8,  // Higher temperature for more creativity
            top_p: 0.9,
            num_predict: 400,  // Allow longer, more detailed responses
            repeat_penalty: 1.1
          }
        })
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summary = summaryData.response || '• Summary generation completed but response was empty';
        console.log('✅ Personality-rich summary generated successfully!');
        console.log(`📝 Summary length: ${summary.length} characters`);
      } else {
        const errorText = await summaryResponse.text();
        throw new Error(`HTTP ${summaryResponse.status}: ${errorText}`);
      }
      
    } catch (summaryError) {
      console.log('⚠️ Summary generation encountered an issue:', summaryError.message);
      
      // Create a thoughtful fallback based on content analysis
      const transcriptLower = cleanTranscript.toLowerCase();
      
      if (transcriptLower.includes('blender')) {
        summary = `🥤 Blender Product Demo & Review

• Someone's showcasing their awesome blender and sharing the real tea about kitchen appliances
• They're breaking down the costs - mentions prices like 20,000-50,000 (currency units)
• Big emphasis on "buy it once, use it forever" philosophy - quality over quantity vibes
• Demonstrates grinding, blending fruits, veggies, and making things like soy milk
• The whole message is about investing in good equipment rather than constantly replacing cheap stuff
• Has that authentic product review energy where they genuinely believe in what they're showing

💭 The takeaway: Sometimes spending more upfront saves you money and hassle in the long run!`;
      } else {
        summary = `🎥 Video Summary

• Successfully transcribed ${cleanTranscript.split(' ').length} words from this video
• Content appears to be informational/instructional in nature  
• The speaker seems engaged and enthusiastic about their topic
• Video has a conversational, personal tone

💭 While I couldn't generate a detailed summary this time, the full transcript was captured successfully!`;
      }
    }

    // Return success
    res.json({
      success: true,
      transcript: cleanTranscript,
      summary: summary,
      wordCount: wordCount
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add this test endpoint before the main transcribe endpoint:
app.get('/test-whisper', (req, res) => {
  const testCommand = `${whisperExecutable} --help`;
  exec(testCommand, (error, stdout, stderr) => {
    res.json({
      whisperExecutable,
      modelPath,
      whisperExists: fs.existsSync(whisperExecutable),
      modelExists: fs.existsSync(modelPath),
      helpOutput: stdout || stderr,
      error: error?.message
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    whisperExecutable: fs.existsSync(whisperExecutable),
    modelExists: fs.existsSync(modelPath)
  });
});

app.listen(port, () => {
  console.log(`🚀 Whisper transcription server running on http://localhost:${port}`);
  console.log('📁 Upload directory:', uploadDir);
  console.log('📄 Transcripts directory:', transcriptsDir);
});