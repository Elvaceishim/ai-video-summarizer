# 🎬 AI Video Summarizer

A beautiful, mobile-optimized web application that transforms your videos and audio files into AI-powered transcriptions and intelligent summaries.

## ✨ Features

- **📱 Mobile-First Design** - Gorgeous UI that works perfectly on iPhone and desktop
- **🎯 Smart AI Processing** - Transcription via AssemblyAI + Summarization via Claude
- **🚀 Drag & Drop Upload** - Intuitive file upload with preview
- **📝 Export Options** - Copy to clipboard or download as .txt
- **⚡ Real-time Progress** - Loading states and error handling
- **🎨 Beautiful UI** - Gradient backgrounds and smooth animations

## 🛠️ Tech Stack

### Frontend
- **React** - Modern UI framework
- **Vite** - Lightning-fast development
- **Custom CSS** - Responsive design with gradients
- **Mobile-optimized** - Touch-friendly interactions

### Backend
- **Node.js + Express** - RESTful API
- **Multer** - File upload handling
- **AssemblyAI** - Speech-to-text transcription
- **OpenRouter** - AI summarization (Claude)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn or npm
- AssemblyAI API key
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI-Video-Summarizer.git
   cd AI-Video-Summarizer
   ```

2. **Backend Setup**
   ```bash
   cd whisper-backend
   yarn install
   
   # Create .env file
   echo "ASSEMBLYAI_API_KEY=your_assemblyai_key_here" > .env
   echo "OPENROUTER_API_KEY=your_openrouter_key_here" >> .env
   
   # Start backend
   yarn dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   yarn install
   
   # Start frontend
   yarn dev --port 5174 --host 0.0.0.0
   ```

4. **Access the app**
   - **Desktop**: http://localhost:5174
   - **Mobile**: http://YOUR_IP:5174 (replace YOUR_IP with your computer's IP)

## 📱 Mobile Usage

1. Open Safari on your iPhone
2. Navigate to `http://YOUR_COMPUTER_IP:5174`
3. Tap to upload a video or audio file
4. Watch the magic happen! ✨

## 🎯 Supported Formats

- **Video**: MP4, AVI, MOV, MKV
- **Audio**: MP3, WAV, M4A, AAC

## 🔧 Configuration

### API Keys Setup

Get your API keys from:
- [AssemblyAI](https://www.assemblyai.com/) - For transcription
- [OpenRouter](https://openrouter.ai/) - For AI summarization

### Network Access

For mobile access, ensure your computer and phone are on the same WiFi network.

## 📁 Project Structure

```
AI-Video-Summarizer/
├── frontend/           # React frontend
│   ├── src/
│   │   ├── App.jsx    # Main component
│   │   └── App.css    # Beautiful styling
│   └── package.json
├── whisper-backend/    # Node.js backend
│   ├── index.js       # Express server
│   ├── uploads/       # File storage
│   └── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🙏 Acknowledgments

- AssemblyAI for excellent speech recognition
- OpenRouter for AI model access
- The React and Node.js communities

---

**Built with ❤️ for seamless video summarization**
