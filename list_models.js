/**
 * list_models.js
 * รันเพื่อตรวจสอบชื่อ model ที่บัญชีนี้สามารถเรียกใช้ได้
 * Usage: GEMINI_API_KEY=... node list_models.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

(async () => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        if (!genAI.listModels) {
            console.error('This version of @google/generative-ai does not expose listModels(). Please check library docs or update the package.');
            return;
        }
        const res = await genAI.listModels();
        console.log('Available models (raw):');
        console.log(JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('Error listing models:', err.message || err);
    }
})();