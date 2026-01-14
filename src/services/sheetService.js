const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Cache data simple (in-memory) to reduce API calls to Google Sheets
let cachedRows = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes

async function getAllRows() {
    if (!SPREADSHEET_ID) return [];

    // Use Cache if valid
    if (cachedRows && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        return cachedRows;
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1', // Assuming data is in Sheet1
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        cachedRows = rows;
        lastFetchTime = Date.now();
        console.log("Fetched and cached " + rows.length + " rows from Sheet.");
        return rows;

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error.message);
        return [];
    }
}

/**
 * Smart Context: Finds only relevant rows based on user query
 */
async function findRelevantData(userQuery) {
    const rows = await getAllRows();
    if (rows.length === 0) return "";

    // 1. Tokenize Query (simple split by space)
    // Remove common symbols for better matching
    const keywords = userQuery.toLowerCase().split(/[\s,?.!]+/);

    // 2. Score Rows
    const scoredRows = rows.map(row => {
        const rowText = row.join(' ').toLowerCase();
        let score = 0;
        keywords.forEach(word => {
            if (word.length > 2 && rowText.includes(word)) { // Only match words > 2 chars
                score++;
            }
        });
        return { row, score };
    });

    // 3. Filter & Sort
    // We want rows with at least some relevance (score > 0)
    // Or if purely general, maybe top 5 random? No, better strictly relevant.
    const relevantRows = scoredRows
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // TOP 5 relevant rows only
        .map(item => item.row.join(' : '));

    if (relevantRows.length === 0) {
        // Fallback: If no keywords match, maybe return nothing or specific default rows?
        // For chatbot, no context often means "I don't know", which triggers the fallback message.
        // But maybe return Header row + first 2 rows just in case?
        // Let's return empty to let AI generalize or ask for clarification.
        // User asked to "Save tokens", so empty is good if irrelevant.
        console.log(`No relevant rows found for: "${userQuery}". Sending minimal context.`);
        return "";
    }

    console.log(`Found ${relevantRows.length} relevant rows for query: "${userQuery}"`);
    return relevantRows.join('\n');
}

module.exports = {
    getAllRows,
    findRelevantData
};
