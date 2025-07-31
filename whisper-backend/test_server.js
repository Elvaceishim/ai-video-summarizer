const express = require('express');
const app = express();

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple server working!' });
});

app.listen(3001, '0.0.0.0', () => {
  console.log('✅ Simple server running on http://0.0.0.0:3001');
  console.log('📱 Test: http://192.168.1.105:3001/health');
});
