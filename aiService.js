const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios'); // Use axios for direct diagnostic fetch
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

let genAI;
let model;

// Initialization and Diagnostics
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Run diagnostic immediately
    checkAvailableModels();
} else {
    console.error("!!! API KEY IS MISSING IN ENV VARIABLES !!!");
}

async function checkAvailableModels() {
    console.log("--- DIAGNOSTIC START: Checking Available Models ---");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await axios.get(url);

        console.log("API Connection: SUCCESS");
        console.log("Available Models for this Key:");

        const models = response.data.models;
        let foundFlash = false;

        if (models && models.length > 0) {
            models.forEach(m => {
                console.log(` - ${m.name}`);
                if (m.name.includes('gemini-1.5-flash')) foundFlash = true;
            });
        } else {
            console.log("No models returned. This is very strange.");
        }

        if (!foundFlash) {
            console.error("!!! CRITICAL: gemini-1.5-flash is NOT in the list. Change model or create new Key. !!!");
        } else {
            console.log(">>> gemini-1.5-flash IS AVAILABLE. The code should work. <<<");
        }

    } catch (error) {
        console.log("--- DIAGNOSTIC FAILED ---");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
            if (error.response.status === 400 && error.response.data.error.message.includes('API key not valid')) {
                console.error(">>> YOUR API KEY IS INVALID. Please get a new one from aistudio.google.com <<<");
            }
        } else {
            console.error(error.message);
        }
    }
    console.log("--- DIAGNOSTIC END ---");
}

async function generateResponse(userMessage, contextData) {
    if (!model) {
        return "ขออภัย ระบบ AI ยังไม่พร้อมใช้งาน (API Key Invalid)";
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

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error('Error in AI generation:', error.message);
        return "ขออภัย เกิดข้อขัดข้องในการประมวลผลคำตอบ (API Error)";
    }
}

module.exports = {
    generateResponse
};
