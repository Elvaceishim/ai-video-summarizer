require('dotenv').config();

const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");
const { v4: uuidv4 } = require("uuid");
const { unlink } = require("fs/promises");
const Busboy = require('busboy');

const { OpenAI } = require("openai");
const { AssemblyAI } = require("assemblyai");

const assembly = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Add this at the top of your netlify/functions/transcribe.cjs handler
console.log('🔑 Environment variables check:');
console.log('  ASSEMBLYAI_API_KEY:', process.env.ASSEMBLYAI_API_KEY ? 'Present' : 'Missing');
console.log('  OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing');
console.log('  OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY?.length || 0);

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is not set');
}

function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const files = {};
    const fields = {};
    
    const busboy = Busboy({ 
      headers: {
        'content-type': event.headers['content-type'] || event.headers['Content-Type']
      }
    });

    busboy.on('file', (fieldname, file, info) => {
      console.log(`📁 File field: ${fieldname}, filename: ${info.filename}`);
      
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        files[fieldname] = {
          data: Buffer.concat(chunks),
          filename: info.filename,
          mimetype: info.mimeType
        };
        console.log(`✅ File ${fieldname} processed: ${files[fieldname].data.length} bytes`);
      });
    });

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    busboy.on('finish', () => {
      console.log(`🏁 Busboy finished. Files: ${Object.keys(files).join(', ')}`);
      resolve({ files, fields });
    });

    busboy.on('error', (err) => {
      console.error('❌ Busboy error:', err);
      reject(err);
    });

    try {
      const body = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body, 'utf8');
      
      console.log(`📦 Decoded body length: ${body.length} bytes`);
      
      busboy.write(body);
      busboy.end();
    } catch (err) {
      console.error('❌ Error decoding body:', err);
      reject(err);
    }
  });
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Check request size
    const contentLength = event.headers['content-length'] || event.headers['Content-Length'];
    if (contentLength && parseInt(contentLength) > 6 * 1024 * 1024) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'File too large. Maximum size is 6MB. Please compress your video first.',
          maxSize: '6MB',
          receivedSize: `${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB`
        }),
      };
    }

    // Set a longer timeout context
    context.callbackWaitsForEmptyEventLoop = false;
    
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Content-Type must be multipart/form-data" }),
      };
    }

    console.log('🔍 Parsing multipart form...');
    const { files } = await parseMultipartForm(event);
    
    // Find ANY uploaded file (video or audio)
    const fileKeys = Object.keys(files);
    console.log(`📋 Available file fields: ${fileKeys.join(', ')}`);
    
    if (fileKeys.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "No file uploaded",
          message: "Please upload an audio or video file"
        }),
      };
    }

    // Get the first uploaded file (regardless of field name)
    const fileKey = fileKeys[0];
    const uploadedFile = files[fileKey];
    
    if (!uploadedFile || !uploadedFile.data || uploadedFile.data.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Uploaded file is empty",
          availableFields: fileKeys
        }),
      };
    }

    console.log(`🎬 Processing file: ${uploadedFile.filename}, ${uploadedFile.data.length} bytes`);

    // Support both audio AND video files
    const audioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.aac', '.ogg', '.wma'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v'];
    const allValidExtensions = [...audioExtensions, ...videoExtensions];
    
    const fileExtension = path.extname(uploadedFile.filename || '').toLowerCase();

    if (!allValidExtensions.includes(fileExtension)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Invalid file type: ${fileExtension}`,
          message: `Please upload an audio file (${audioExtensions.join(', ')}) or video file (${videoExtensions.join(', ')})`,
          receivedFile: uploadedFile.filename
        }),
      };
    }

    // Save file with original extension
    const tempPath = path.join(tmpdir(), uuidv4() + fileExtension);
    await fs.promises.writeFile(tempPath, uploadedFile.data);
    console.log(`💾 Saved to: ${tempPath}`);

    // AssemblyAI can handle both audio AND video files automatically
    console.log('🔄 Starting transcription with AssemblyAI...');
    console.log(`📁 File type: ${audioExtensions.includes(fileExtension) ? 'Audio' : 'Video'}`);
    
    const transcript = await assembly.transcripts.transcribe({ 
      audio: tempPath,
      // Add these options for better processing
      speech_model: 'best',
      language_detection: true,
      punctuate: true,
      format_text: true
    });

    if (transcript.status === "error") {
      throw new Error(`AssemblyAI error: ${transcript.error}`);
    }

    if (!transcript.text || transcript.text.trim().length === 0) {
      throw new Error("No speech detected in the file. Please ensure the file contains clear audio.");
    }

    console.log('🤖 Generating AI summary...');
    const summaryRes = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "user",
          content: `Please analyze this transcript and provide a comprehensive summary in bullet points. Focus on the main topics, key insights, and important details:

**Transcript:**
${transcript.text}

**Please provide:**
• **Main Topic/Theme:** What is this content primarily about?
• **Key Points:** What are the most important points discussed?
• **Important Details:** Any specific facts, numbers, or conclusions mentioned?
• **Actionable Items:** Any tasks, recommendations, or next steps mentioned?
• **Summary:** A brief overall summary in 1-2 sentences

Keep it well-organized and comprehensive while being concise.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    // Clean up temp file
    await unlink(tempPath);

    // Don't truncate responses in production
    const isLocalDev = process.env.NETLIFY_DEV === 'true';

    let responseData = {
      success: true,
      transcript: transcript.text,
      summary: summaryRes.choices[0].message.content,
      wordCount: transcript.text.split(" ").length,
      duration: transcript.audio_duration,
      fileType: audioExtensions.includes(fileExtension) ? 'audio' : 'video',
      filename: uploadedFile.filename
    };

    // At the end of your function, make sure the success response has proper headers:
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json', // Make sure this is set!
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error('❌ Function error:', error);
    
    // Return proper JSON error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        details: 'Processing failed'
      }),
    };
  }
};
