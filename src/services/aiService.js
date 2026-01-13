const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

let genAI;
let model;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    // Switching to gemini-pro (stable) to fix 404 issue
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
}

async function generateResponse(userMessage, contextData) {
    if (!model) {
        console.error("Gemini API Key is missing.");
        return "ขออภัย ระบบ AI ยังไม่พร้อมใช้งาน (ติดต่อ Admin)";
    }

    try {
        // Construct the prompt
        // We instruct the model to use the provided context to answer the question.
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
        console.error('Error in AI generation:', error);
        return "ขออภัย เกิดข้อขัดข้องในการประมวลผลคำตอบ";
    }
}

module.exports = {
    generateResponse
};
