const { google } = require('googleapis');
const config = require('../config/config');
const logger = require('../utils/logger');

// Initialize Auth - It defaults to looking for GOOGLE_APPLICATION_CREDENTIALS env var
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Fetch Knowledge Base data from Google Sheet
 * Assumes a sheet named 'KnowledgeBase'
 * @returns {Promise<Array<Array<string>>>} Rows of data
 */
async function getKnowledgeBase() {
    if (!config.googleSheetId) {
        logger.error('GOOGLE_SHEET_ID is not set.');
        return [];
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.googleSheetId,
            range: 'KnowledgeBase!A:D', // Adjust range as needed. A=Q, B=A, etc.
        });
        return response.data.values || [];
    } catch (error) {
        logger.error(`Failed to fetch knowledge base: ${error.message}`, error);
        return [];
    }
}

/**
 * Append entry to a 'Logs' sheet for tracking
 * @param {Array} rowData - [Date, UserID, Message, Response, Status]
 */
async function logConversation(rowData) {
    if (!config.googleSheetId) return;

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: config.googleSheetId,
            range: 'Logs!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
    } catch (error) {
        logger.error(`Failed to log conversation: ${error.message}`);
        // Don't throw, just log error so flow continues
    }
}

module.exports = {
    getKnowledgeBase,
    logConversation
};
