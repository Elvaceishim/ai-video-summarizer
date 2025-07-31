const express = require('express');
const app = express();

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Server working perfectly!',
    port: 8080,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Test server running on port 8080!' });
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Test server running');
  console.log(`📱 iPhone: http://192.168.1.105:${PORT}/health`);
  console.log(`💻 Mac: http://localhost:${PORT}/health`);
});
