require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function test() {
  try {
    console.log('Testing OpenRouter connection...');
    console.log('API Key present:', process.env.OPENROUTER_API_KEY ? 'Yes' : 'No');
    
    const response = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct",
      messages: [{ role: "user", content: "Say hello in a friendly way!" }],
      max_tokens: 50
    });
    
    console.log('✅ OpenRouter is working!');
    console.log('Response:', response.choices[0].message.content);
    console.log('Model used:', response.model);
  } catch (error) {
    console.error('❌ OpenRouter test failed:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  }
}

test();
