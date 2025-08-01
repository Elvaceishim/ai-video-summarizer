// Find this line and update it:

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://whisper-backend-jt8lzltbd-elvis-projects-7d4af51e.vercel.app'  // Use direct working URL
    : 'http://localhost:3001'
  );