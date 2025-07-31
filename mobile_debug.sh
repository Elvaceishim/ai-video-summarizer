#!/bin/bash
echo "🔍 Mobile Access Debug"
echo "====================="

IP=$(ipconfig getifaddr en0)
echo "📱 Your Mac IP: $IP"

echo -e "\n🌐 WiFi Network:"
networksetup -getairportnetwork en0

echo -e "\n🔧 Testing ports:"
nc -z $IP 3001 && echo "✅ Port 3001 open" || echo "❌ Port 3001 blocked"
nc -z $IP 5174 && echo "✅ Port 5174 open" || echo "❌ Port 5174 blocked"

echo -e "\n📋 Next steps:"
echo "1. iPhone Backend: http://$IP:3001/health"
echo "2. iPhone Frontend: http://$IP:5174"
echo "3. Update API_URL in frontend/src/App.jsx to: http://$IP:3001"
