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

// ---------- CSV saving endpoint on port 4000 ----------
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

const csvApp = express();            // separate Express instance
csvApp.use(cors());                  // allow cross-origin from your frontend; tighten in prod
csvApp.use(express.json());          // parse JSON bodies

const CSV_FILE = path.resolve(process.cwd(), 'responses.csv');

// Utility: convert any nested objects/arrays to JSON strings so CSV stays flat
function flattenForCsv(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(k => {
    const v = obj[k];
    if (v === null || v === undefined) {
      out[k] = '';
    } else if (typeof v === 'object') {
      try {
        out[k] = JSON.stringify(v);
      } catch (e) {
        out[k] = String(v);
      }
    } else {
      out[k] = v;
    }
  });
  return out;
}

csvApp.post('/save-response', (req, res) => {
  const payload = req.body || {};
  console.log('[CSV] incoming /save-response — keys:', Object.keys(payload));

  const flat = flattenForCsv(payload);

  // Ensure a stable column order: if file exists, reuse its header order; otherwise use keys from this payload.
  let fields = Object.keys(flat);
  let writeHeader = !fs.existsSync(CSV_FILE);

  try {
    // If file exists, attempt to reuse header order (safer for future rows)
    if (!writeHeader) {
      // read first line (header) and reuse order if possible
      const firstLine = fs.readFileSync(CSV_FILE, 'utf8').split('\n')[0] || '';
      if (firstLine.trim()) {
        const headerCols = firstLine.split(',').map(h => h.trim());
        // merge headerCols and new fields, preserving headerCols order first
        const merged = Array.from(new Set(headerCols.concat(fields)));
        fields = merged;
      }
    }

    // For any missing fields in flat, ensure an empty string is present so Parser has consistent columns
    const normalized = {};
    fields.forEach(f => {
      normalized[f] = (flat[f] !== undefined) ? flat[f] : '';
    });

    const parser = new Parser({ fields, header: writeHeader });
    const csv = parser.parse([normalized]) + '\n';

    // If appending to existing file, the parser will add a header — remove it
    const csvToAppend = (!writeHeader) ? csv.split('\n').slice(1).join('\n') + '\n' : csv;

    fs.appendFileSync(CSV_FILE, csvToAppend, 'utf8');

    console.log('[CSV] saved to', CSV_FILE);
    return res.json({ success: true, message: 'Saved to CSV' });
  } catch (err) {
    console.error('[CSV] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start CSV app on port 4000
const CSV_PORT = process.env.CSV_PORT || 4000;
csvApp.listen(CSV_PORT, () => console.log(`CSV backend listening on port ${CSV_PORT} (saving to ${CSV_FILE})`));
