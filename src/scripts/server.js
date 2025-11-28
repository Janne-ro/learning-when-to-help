// server.js
require('dotenv').config(); // loads .env (use a separate .env not committed to VCS)
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { google } = require('googleapis');

const app = express();
app.use(cors()); // enable CORS for dev; restrict in production
app.use(express.json());

// Prefer environment variable. If you want the placeholder literal, replace below.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Simple endpoint to forward prompts to OpenRouter (unchanged)
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

// ---------- CSV + Google Sheets saving endpoint on port 4000 ----------
const csvApp = express();            // separate Express instance
csvApp.use(cors());                  // allow cross-origin from your frontend; tighten in prod
csvApp.use(express.json());          // parse JSON bodies

const CSV_FILE = path.resolve(process.cwd(), 'responses.csv');

// Utility: convert nested objects/arrays to JSON strings so CSV stays flat
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

/**
 * Google Sheets helper
 * - Reads service account credentials either from:
 *     - GOOGLE_SERVICE_ACCOUNT_PATH (path to json file), OR
 *     - GOOGLE_SERVICE_ACCOUNT_JSON (JSON string)
 * - Uses SPREADSHEET_ID and SHEET_NAME env vars.
 */
async function getSheetsClient() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('Missing SPREADSHEET_ID env var');

  // load credentials
  let credentials = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const p = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    credentials = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'));
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    throw new Error('No Google service account credentials provided. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    spreadsheetId,
    sheetName: process.env.SHEET_NAME || 'Sheet1'
  };
}

/**
 * Append a row to Google Sheets.
 * - `flat` is an object with flat string/value fields (like flattenForCsv output).
 * - To keep column order consistent, specify FIELDS_ORDER env var (comma-separated) or use keys of `flat`.
 */
async function appendToSheet(flat) {
  const { sheets, spreadsheetId, sheetName } = await getSheetsClient();

  // determine fields/columns order:
  const envOrder = process.env.FIELDS_ORDER; // optional comma-separated field list
  let fields;
  if (envOrder && envOrder.trim()) {
    fields = envOrder.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // fallback: use keys of `flat` (this may vary per-request if different payloads have different keys)
    fields = Object.keys(flat);
  }

  // prepare header and row values (ensures consistent ordering)
  const headerRow = fields;
  const rowValues = fields.map(k => (flat[k] !== undefined ? flat[k] : ''));

  // Check if header exists (read first row)
  const headerRange = `${sheetName}!1:1`;
  let headerExists = false;
  try {
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
      majorDimension: 'ROWS'
    });

    if (Array.isArray(getRes.data.values) && getRes.data.values.length > 0) {
      // a header exists
      headerExists = true;
    }
  } catch (err) {
    // If the spreadsheet or range read fails, we'll attempt to continue by writing header.
    console.warn('[Sheets] header check failed, will try to write header anyway:', err.message || err);
  }

  // If no header, write it (overwrite A1)
  if (!headerExists) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [headerRow] }
    });
  }

  // Append the row after the header
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [rowValues] }
  });

  return { spreadsheetId, sheetName };
}

csvApp.post('/save-response', async (req, res) => {
  const payload = req.body || {};
  console.log('[CSV] incoming /save-response — keys:', Object.keys(payload));

  const flat = flattenForCsv(payload);

  // Ensure a stable column order for CSV
  let fields = Object.keys(flat);
  let writeHeader = !fs.existsSync(CSV_FILE);

  try {
    if (!writeHeader) {
      const firstLine = fs.readFileSync(CSV_FILE, 'utf8').split('\n')[0] || '';
      if (firstLine.trim()) {
        const headerCols = firstLine.split(',').map(h => h.trim());
        const merged = Array.from(new Set(headerCols.concat(fields)));
        fields = merged;
      }
    }

    const normalized = {};
    fields.forEach(f => {
      normalized[f] = (flat[f] !== undefined) ? flat[f] : '';
    });

    const parser = new Parser({ fields, header: writeHeader });
    const csv = parser.parse([normalized]) + '\n';
    const csvToAppend = (!writeHeader) ? csv.split('\n').slice(1).join('\n') + '\n' : csv;
    fs.appendFileSync(CSV_FILE, csvToAppend, 'utf8');

    console.log('[CSV] saved to', CSV_FILE);

    // --- NEW: attempt to append same data to Google Sheets ---
    let sheetsResult = null;
    try {
      // Use an explicit stable field order for sheets: either from env FIELDS_ORDER or the fields we just computed.
      // The appendToSheet function will use process.env.FIELDS_ORDER if set, otherwise fields from `flat`.
      process.env.FIELDS_ORDER = process.env.FIELDS_ORDER || fields.join(',');
      const appendRes = await appendToSheet(flat);
      sheetsResult = { success: true, sheet: appendRes };
      console.log('[Sheets] appended to', appendRes);
    } catch (sheetErr) {
      console.error('[Sheets] failed to append:', sheetErr);
      // don't fail the whole endpoint if sheet write fails - return CSV success + sheet error details
      return res.status(200).json({
        success: true,
        csv: true,
        message: 'Saved to CSV. Google Sheets append failed.',
        sheetError: (sheetErr && sheetErr.message) ? sheetErr.message : String(sheetErr)
      });
    }

    // Both CSV and Sheets succeeded
    return res.json({ success: true, csv: true, sheets: sheetsResult });
  } catch (err) {
    console.error('[CSV] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start CSV app on port 4000
const CSV_PORT = process.env.CSV_PORT || 4000;
csvApp.listen(CSV_PORT, () => console.log(`CSV backend listening on port ${CSV_PORT} (saving to ${CSV_FILE})`));
