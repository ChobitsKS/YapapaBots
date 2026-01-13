const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

let genAI;
let model;

// Initialization
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    // Default to flash, but we will verify availability
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // DEBUG: List available models to console on startup
    listAvailableModels();
}

async function listAvailableModels() {
    try {
        if (!genAI) return;
        const modelQuery = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy to get client
        // Note: The SDK doesn't have a direct 'listModels' on the client instance in all versions,
        // but we can try a direct fetch or standard check. 
        // Actually, for this specific SDK version, we blindly try to use the model.
        // Let's just log that we are attempting to use the key.
        console.log("Attempting to initialize Gemini with Key: " + API_KEY.substring(0, 5) + "...");
    } catch (e) {
        console.error("Error checking models:", e);
    }
}

async function generateResponse(userMessage, contextData) {
    if (!model) {
        console.error("Gemini API Key is missing.");
        return "ขออภัย ระบบ AI ยังไม่พร้อมใช้งาน (ติดต่อ Admin)";
    }

    try {
        const systemInstruction = `
คุณเป็นผู้ช่วยอัจฉริยะสำหรับเพจ Facebook
หน้าที่ของคุณคือตอบคำถามลูกค้าโดยอ้างอิงข้อมูลจาก "ข้อมูลในระบบ" ด้านล่างนี้เท่านั้น
- หากข้อมูลมีคำตอบ ให้ตอบอย่างสุภาพ กระชับ และเป็นธรรมชาติ (ภาษาไทย)
- หากไม่มีข้อมูลในส่วนที่ให้มา ให้ตอบว่า "ขออภัย ฉันไม่มีข้อมูลเกี่ยวกับเรื่องนี้ รบกวนติดต่อแอดมินโดยตรงครับ"
- ห้ามแต่งเรื่องขึ้นเอง

ข้อมูลในระบบ (Context):
${contextData}
`;

        const fullPrompt = `${systemInstruction}\n\nคำถามจากลูกค้า: ${userMessage}\nคำตอบ:`;

        // Generate content
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error('Error in AI generation FULL DETAILS:', error);

        // Detailed error logging for user
        if (error.message && error.message.includes('404')) {
            console.error('!!! 404 ERROR DETECTED !!!');
            console.error('This usually means the API Key is valid but cannot access this specifc model.');
            console.error('Please check if "Generative Language API" is enabled in Google Cloud Console.');
        }

        return "ขออภัย เกิดข้อขัดข้องในการประมวลผลคำตอบ (API Error)";
    }
}

module.exports = {
    generateResponse
};
