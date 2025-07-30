import express from "express";
import cors from "cors";
import multer from "multer";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
const PORT = 5000;

// Configure multer for file uploads (uploads/ folder)
const upload = multer({ dest: "uploads/" });

// POST /transcribe to accept video/audio file and transcribe using whisper.cpp CLI
app.post("/transcribe", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = path.resolve(req.file.path);
  const whisperBinary = path.resolve("./whisper.cpp/build/whisper");

  // Run whisper CLI on uploaded file
  execFile(
    whisperBinary,
    [
      "-f",
      filePath,
      "-m",
      "./whisper.cpp/models/ggml-small.bin", // adjust if your model path is different
      "--language",
      "en",
      "--task",
      "transcribe",
      "--output-format",
      "json",
    ],
    (error, stdout, stderr) => {
      // Delete uploaded file after processing
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete file:", err);
      });

      if (error) {
        console.error("Whisper error:", error, stderr);
        return res.status(500).json({ error: "Transcription failed" });
      }

      try {
        // Whisper outputs JSON per segment, might need to parse multiple lines
        // Here, parse the stdout as JSON objects (might be multiple lines)
        const lines = stdout
          .split("\n")
          .filter((line) => line.trim().length > 0);

        const transcripts = lines.map((line) => JSON.parse(line));

        // Join all segment texts into full transcript
        const fullTranscript = transcripts
          .map((seg) => seg.text)
          .join(" ");

        // For now, return transcript only (summary can be added later)
        return res.json({ transcript: fullTranscript });
      } catch (parseErr) {
        console.error("Parsing error:", parseErr);
        return res.status(500).json({ error: "Failed to parse transcription output" });
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
