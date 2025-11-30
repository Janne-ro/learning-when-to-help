//server.js
require('dotenv').config(); // loads .env 
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { google } = require('googleapis');

const app = express();
app.use(cors()); //enable CORS for dev
app.use(express.json());

//fetch env openrouter api 
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

//send to LLM
app.post('/api/ask-ai', async (req, res) => {

    //in try block to catch errors 
    try {
        let messages = [];

        //basic validation & normalization: ensure each entry has role and content
        if (Array.isArray(req.body.messages) && req.body.messages.length > 0) {
            messages = req.body.messages
                .map(m => ({
                    role: (m.role || '').toString(),
                    content: (m.content || m.text || '').toString()
                }))
                .filter(m => m.role && m.content); //and drop invalid entries
        } else {
            //single prompt + optional systemPrompt
            const prompt = req.body.prompt;
            const systemPrompt = req.body.systemPrompt;

            if (!prompt || typeof prompt !== 'string') {
                return res.status(400).json({ error: 'Missing prompt' });
            }
            if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
                messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: prompt });
        } //--> possibility to only send system prompt once but behaviour tends to be better if send every time

        //forward messages array to OpenRouter/model
        const payload = {
            model: "x-ai/grok-4.1-fast:free",
            messages,
            max_tokens: 512,
            temperature: 0.8 //high temperature to reduce halucination and improve consistency across different students
        };

        //create response
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

        //create reply
        const reply =
            response.data?.choices?.[0]?.message?.content
            || response.data?.choices?.[0]?.text
            || JSON.stringify(response.data);

        return res.json({ reply });

    //catch possible errors
    } catch (err) {
        console.error('OpenRouter error:', err?.response?.data || err.message);
        const message = err?.response?.data?.error || 'Failed to contact LLM';
        return res.status(502).json({ error: message });
    }
});

//let AI proxy listen on port 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`AI proxy listening on port ${PORT}`));

//CSV + Google Sheets saving endpoint on port 4000

//load required things
const csvApp = express();            
csvApp.use(cors());                  
csvApp.use(express.json());          

//set cvs file path
const CSV_FILE = path.resolve(process.cwd(), 'responses.csv');

//function to convert nested objects/arrays to JSON strings so CSV stays flat
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


//Google Sheets helper function
//Reads service account credentials either from:GOOGLE_SERVICE_ACCOUNT_PATH
//Uses SPREADSHEET_ID and SHEET_NAME env vars.
async function getSheetsClient() {

    //Fetch spreadsheet ID
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('Missing SPREADSHEET_ID env var');

    //Load credentials
    let credentials = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
        const p = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
        credentials = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'));
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
        throw new Error('No Google service account credentials provided. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON');
    }

    //authenitcate
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return {
        sheets: google.sheets({ version: 'v4', auth }),
        spreadsheetId,
        sheetName: process.env.SHEET_NAME 
    };
}


//Append a row to Google Sheets.
//to keep column order consistent, specify FIELDS_ORDER env var (comma-separated) or use keys of `flat`.
async function appendToSheet(flat) {
    const { sheets, spreadsheetId, sheetName } = await getSheetsClient();

    //determine fields/columns order
    const envOrder = process.env.FIELDS_ORDER; //fetch from env
    let fields;
    if (envOrder && envOrder.trim()) {
        fields = envOrder.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        //fallback: use keys of `flat`
        fields = Object.keys(flat);
    }

    //prepare header and row values (ensures consistent ordering)
    const headerRow = fields;
    const rowValues = fields.map(k => (flat[k] !== undefined ? flat[k] : ''));

    //check if header exists (read first row)
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
        //if the spreadsheet or range read fails attempt to continue by writing header.
        console.warn('[Sheets] header check failed, will try to write header anyway:', err.message || err);
    }

    //if no header, write it (by overwriteing A1)
    if (!headerExists) {
        await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [headerRow] }
        });
    }

    //append the row after the header
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [rowValues] }
    });

    return { spreadsheetId, sheetName };
}

//also save response locally (double security to not lose data)
csvApp.post('/save-response', async (req, res) => {

    //define payload
    const payload = req.body || {};
    console.log('[CSV] incoming /save-response — keys:', Object.keys(payload));

    const flat = flattenForCsv(payload);
    let incomingFields = Object.keys(flat);

    const fileExists = fs.existsSync(CSV_FILE);

    //I know this is increddibly messy but eyy it works! 
    function parseCsvLine(line) {
        const out = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
            //lookahead for double-quote escape
            if (i + 1 < line.length && line[i + 1] === '"') {
                cur += '"';
                i++; //skip escaped quote
            } else {
                inQuotes = false;
            }
            } else {
            cur += ch;
            }
        } else {
            if (ch === '"') {
            inQuotes = true;
            } else if (ch === ',') {
            out.push(cur);
            cur = '';
            } else {
            cur += ch;
            }
        }
        }
        out.push(cur);
        return out;
    }

    //try to catch errors
    try {
        let fields;           //final stable column order we'll use for this csv
        let needToWriteHeader = !fileExists;
        let fileContent = '';

        if (fileExists) {
            fileContent = fs.readFileSync(CSV_FILE, 'utf8');
            //find first non-empty line to write (header)
            const lines = fileContent.split(/\r?\n/);
            const headerIndex = lines.findIndex(l => l && l.trim() !== '');
            //file exists but empty --> have to write header
            if (headerIndex === -1) {
                needToWriteHeader = true;
                fields = incomingFields.slice();
            //file exists and not empty
            } else {
                const headerLine = lines[headerIndex];
                const existingHeaderCols = parseCsvLine(headerLine);
                //merge: keep existing order, then append any new incoming fields not present
                const merged = existingHeaderCols.slice();
                incomingFields.forEach(f => {
                    if (!merged.includes(f)) merged.push(f);
                });
                fields = merged;

                //if merged header is longer than existing, rewrite the header line
                if (merged.length !== existingHeaderCols.length) {
                    //create a csv-safe header line (quote each header and escape internal quotes)
                    const headerCsv = merged.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
                    lines[headerIndex] = headerCsv;
                    //write entire file back with updated header, preserving line endings
                    fs.writeFileSync(CSV_FILE, lines.join('\n'), 'utf8');
                    //refresh fileContent (so we can check trailing newline later)
                    fileContent = fs.readFileSync(CSV_FILE, 'utf8');
                }
            }
        } else {
            fields = incomingFields.slice();
        }

        //build normalized row in 'fields' order
        const normalized = {};
        fields.forEach(f => {
            normalized[f] = (flat[f] !== undefined) ? flat[f] : '';
        });

        //use json2csv to generate only the data row if file exists (header:false).
        //if the file is new, include header + row (header:true).
        const parser = new Parser({ fields, header: needToWriteHeader });
        const csvOut = parser.parse([normalized]) + '\n';

        //if file exists and we rewrote header above, ensure we append seamlessly.
        //if file doesn't end with newline, add one before append.
        let toAppend = csvOut;
        if (fileExists) {
            if (!fileContent.endsWith('\n') && fileContent.length > 0) {
                // ensure separation from last line
                toAppend = '\n' + csvOut;
            }
        }

        fs.appendFileSync(CSV_FILE, toAppend, 'utf8');
        console.log('[CSV] saved to', CSV_FILE);

        //Append to Google Sheets
        let sheetsResult = null;
        try {
            process.env.FIELDS_ORDER = process.env.FIELDS_ORDER || fields.join(',');
            const appendRes = await appendToSheet(flat);
            sheetsResult = { success: true, sheet: appendRes };
            console.log('[Sheets] appended to', appendRes);
        } catch (sheetErr) {
            console.error('[Sheets] failed to append:', sheetErr);
            return res.status(200).json({
                success: true,
                csv: true,
                message: 'Saved to CSV. Google Sheets append failed.',
                sheetError: sheetErr.message || String(sheetErr)
            });
        }

        return res.json({ success: true, csv: true, sheets: sheetsResult });
    } catch (err) {
        console.error('[CSV] error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

//Start CSV app on port 4000
const CSV_PORT = process.env.CSV_PORT || 4000;
csvApp.listen(CSV_PORT, () => console.log(`CSV backend listening on port ${CSV_PORT} (saving to ${CSV_FILE})`));
