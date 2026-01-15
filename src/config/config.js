require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  geminiApiKey: process.env.GEMINI_API_KEY,
  genAiModel: process.env.GENAI_MODEL || 'gemini-1.5-flash',
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  facebook: {
    pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN
  }
};
