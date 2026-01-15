const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ใช้ Model จาก Env หรือ Default เป็น gemini-2.0-flash
const modelName = process.env.GENAI_MODEL || "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: modelName });

async function generateResponse(userMessage, contextData, chatHistory) {
    try {
        const systemInstruction = `
            บริบท: คุณคือ AI ผู้ช่วยของโรงเรียนแพทย์และวิทยาศาสตร์สุขภาพ
            หน้าที่: ตอบคำถามโดยใช้ข้อมูลจาก [Context] ที่ให้มาเป็นหลัก
            
            [Context ข้อมูล]:
            ${contextData || "ไม่มีข้อมูลเพิ่มเติม"}

            ข้อกำหนดการตอบ:
            1. ตอบเป็นภาษาไทย สุภาพ กระชับ และเข้าใจง่าย
            2. ห้ามแต่งเรื่องเอง ถ้าไม่มีข้อมูลใน Context ให้ตอบว่า:
               "ขออภัย ยังไม่มีข้อมูล ทิ้งข้อความไว้ได้เลย เดี๋ยวเจ้าหน้าที่มาตอบ"
            3. ห้ามแนะนำให้ผู้ใช้พิมพ์คำสั่งแปลกๆ
        `;

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 500, // ประหยัด Token
                temperature: 0.7,
            },
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();
        return response.trim();

    } catch (error) {
        console.error('❌ Gemini Error:', error);
        
        // กรณีโควต้าเต็ม (HTTP 429)
        if (error.status === 429 || error.message.includes('429')) {
            return "ขออภัย ขณะนี้มีผู้สอบถามเข้ามาจำนวนมาก กรุณารอสักครู่แล้วสอบถามใหม่นะครับ";
        }
        
        return "ขออภัย ยังไม่มีข้อมูล ทิ้งข้อความไว้ได้เลย เดี๋ยวเจ้าหน้าที่มาตอบ";
    }
}

module.exports = { generateResponse };