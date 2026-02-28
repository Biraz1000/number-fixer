const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
// Serve static files from 'public' directory
app.use(express.static('public'));

// Root route for Vercel
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ------------------------------------------------------------------
// Logic from PowerShell script ported to JS
// ------------------------------------------------------------------

function fixNumber(line) {
    // If the line has a tab (Number <TAB> Password), split it
    let parts = line.split('\t');
    let numStr = parts[0].trim();
    let restOfLine = parts.length > 1 ? '\t' + parts.slice(1).join('\t') : '';

    let clean = numStr;
    if (!clean) return line; // Return original if empty

    // Fix the number part
    let fixedNum = clean;

    // If starts with 234
    if (clean.startsWith('234')) {
        let rest = clean.substring(3);
        // If length is wrong, try to fix
        // But if length is > 11, it might be that the user pasted "234070...Password" without tab?
        // Let's stick to the rule: 234 + 11 digits = 14 chars.
        
        // However, if the user input doesn't have tabs but spaces, splitting by tab won't work.
        // The previous files used tabs. Let's assume tabs for now as per "All password need sirial.txt".
        
        if (rest.length < 11) {
            fixedNum = '234' + rest.padEnd(11, '0'); 
        } else if (rest.length > 11) {
            // Truncate only if it looks like just a long number
            // If it has non-digits, maybe we shouldn't truncate blindly?
            // But the requirement was to fix length.
            fixedNum = '234' + rest.substring(0, 11);
        }
    }
    // If starts with 0 (e.g. 070...), treat as 11 digit local -> 234...
    else if (clean.startsWith('0') && clean.length === 11) {
        fixedNum = '234' + clean.substring(1);
    }
    // If raw 10 digit (e.g. 70...), add 234
    else if (clean.length === 10 && /^\d+$/.test(clean)) {
        fixedNum = '234' + clean;
    }

    return fixedNum + restOfLine;
}

function processLines(inputText, fixNumbers) {
    const lines = inputText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const counts = {};
    const groups = {};

    // 1. Count duplicates & Group
    lines.forEach(line => {
        // Fix number if requested
        let processedLine = fixNumbers ? fixNumber(line) : line.trim();
        
        // Count
        counts[processedLine] = (counts[processedLine] || 0) + 1;

        // Group by suffix (Logic Update: Use First OR Last non-digit char if available)
        // This handles cases where the "tag" is a prefix (e.g., "a070...") or suffix (e.g., "...r")
        if (processedLine.length > 0) {
            let parts = processedLine.split('\t');
            let password = parts.length > 1 ? parts[1] : parts[0]; // Use password part if available
            
            let groupKey = '';
            
            // 1. Check if last char is non-digit (Suffix style: ...r, ...$)
            let lastChar = password.slice(-1);
            if (/[^0-9]/.test(lastChar)) {
                groupKey = lastChar;
            } 
            // 2. Check if first char is non-digit (Prefix style: a070..., A070...)
            else {
                let firstChar = password.charAt(0);
                if (/[^0-9]/.test(firstChar)) {
                    groupKey = firstChar;
                } else {
                    // Fallback: If purely numeric, maybe group by last digit? 
                    // Or keep them in a "Numbers" group?
                    // Previous logic was grouping by last char always. Let's stick to that for pure numbers.
                    groupKey = lastChar;
                }
            }
            
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(processedLine);
        }
    });

    // 2. Sort and Format Output
    let outputLines = [];
    let groupStats = {}; // To store counts like { "A": 200, "a": 100 }
    
    // Sort keys: Symbols -> Numbers -> A-Z -> a-z
    let suffixes = Object.keys(groups).sort(); 
    
    suffixes.forEach(s => {
        let uniqueLines = [...new Set(groups[s])]; // Get unique
        
        // Count total items in this group (including duplicates)
        let totalInGroup = 0;
        uniqueLines.forEach(l => {
            totalInGroup += counts[l];
        });
        groupStats[s] = totalInGroup;
        
        // Sort lines numerically by the first part (before tab if exists)
        uniqueLines.sort((a, b) => {
            let valA = a.split('\t')[0];
            let valB = b.split('\t')[0];
            // Try numeric sort
            let numA = parseInt(valA, 10);
            let numB = parseInt(valB, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return valA.localeCompare(valB);
        });

        uniqueLines.forEach(l => {
            let c = counts[l];
            if (c > 1) {
                outputLines.push(`${l}\tduplicate:${c}`);
            } else {
                outputLines.push(l);
            }
        });
    });

    return {
        text: outputLines.join('\n'),
        stats: {
            totalLines: lines.length,
            uniqueLines: Object.keys(counts).length,
            groups: suffixes.length,
            groupCounts: groupStats // New field for frontend
        }
    };
}

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------

app.post('/api/process', (req, res) => {
    const { text, fixNumbers } = req.body;
    if (!text) return res.status(400).send('No text provided');
    
    try {
        const result = processLines(text, fixNumbers);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------
// Google Auth & Drive
// ------------------------------------------------------------------

// Placeholder credentials - User must replace these in .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Generate auth url
app.get('/auth/login', (req, res) => {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        return res.status(500).send('<h1>Error: Missing Google Credentials</h1><p>Please configure .env file with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</p>');
    }
    
    const scopes = [
        'https://www.googleapis.com/auth/drive.file', // Access to create/edit files created by this app
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    
    res.redirect(url);
});

// Callback
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Redirect to frontend with tokens (in URL fragment for simplicity in this demo)
        // In prod, use session or secure cookie
        res.redirect(`/?access_token=${tokens.access_token}`);
    } catch (err) {
        console.error('Error getting tokens', err);
        res.status(500).send('Login failed');
    }
});

// Upload to Drive
app.post('/api/save-drive', async (req, res) => {
    const { content, filename, accessToken } = req.body;
    if (!accessToken) return res.status(401).send('Not logged in');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const drive = google.drive({ version: 'v3', auth });
    
    try {
        const fileMetadata = {
            name: filename || 'processed_numbers.txt',
            mimeType: 'text/plain'
        };
        const media = {
            mimeType: 'text/plain',
            body: content
        };
        
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });
        
        res.json({ 
            success: true, 
            fileId: file.data.id, 
            link: file.data.webViewLink 
        });
    } catch (err) {
        console.error('Drive upload error:', err);
        res.status(500).json({ error: 'Failed to upload to Drive' });
    }
});

// For Vercel Deployment
if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running locally at http://localhost:${port}`);
        
        // Attempt to print LAN IP
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`Access on Network: http://${net.address}:${port}`);
                }
            }
        }
        console.log('\nNOTE: For Google Login to work on other devices, you must add the IP address URL to your Google Cloud Console "Authorized redirect URIs".');
    });
}

module.exports = app;
