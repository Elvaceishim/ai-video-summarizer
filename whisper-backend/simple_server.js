const express = require('express');
const app = express();

// Enable connection timeout and keep-alive management
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  res.setTimeout(30000);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Connection', 'close'); // Force connection close
  next();
});

app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Backend working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Simple backend running!' });
});

const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple server running on all interfaces');
  console.log(`📱 iPhone: http://192.168.1.105:${PORT}/health`);
  console.log(`💻 Mac: http://localhost:${PORT}/health`);
});

// Handle server cleanup
server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close();
});
