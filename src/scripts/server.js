// server.js
require('dotenv').config(); // loads .env (use a separate .env not committed to VCS)
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // enable CORS for dev; restrict in production
app.use(express.json());

// Prefer environment variable. If you want the placeholder literal, replace below.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Simple endpoint to forward prompts to OpenRouter
app.post('/api/ask-ai', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const payload = {
      model: "minimax/minimax-m2:free",  // change if you want a different model
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.7
    };

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // adapt depending on OpenRouter response shape
    const reply =
      response.data?.choices?.[0]?.message?.content
      || response.data?.choices?.[0]?.text
      || JSON.stringify(response.data);

    return res.json({ reply });
  } catch (err) {
    console.error('OpenRouter error:', err?.response?.data || err.message);
    const message = err?.response?.data?.error || 'Failed to contact LLM';
    return res.status(502).json({ error: message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`AI proxy listening on port ${PORT}`));
