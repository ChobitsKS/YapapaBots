const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
// On Render, we might want to pass the JSON content directly via ENV, 
// but for now we stick to file path as per typical local/file-based usage.
// Users can upload credentials.json to Render or use secret files.
const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function getDataFromSheet() {
    if (!SPREADSHEET_ID) {
        console.warn('Google Sheets ID is missing. Returning empty context.');
        return "";
    }

    try {
        // If KEY_FILE_PATH is not set, it might try default credentials (good for Cloud Run/Functions),
        // but explicit auth is safer for this setup.
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Read all data from Sheet1
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in sheet.');
            return "";
        }

        // Format data into a readable string for the AI
        // We join columns with a separator and rows with newline
        return rows.map(row => row.join(' : ')).join('\n');

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error.message);
        // Fallback: return empty string so the bot can still chat (just without context)
        return "";
    }
}

module.exports = {
    getDataFromSheet
};
