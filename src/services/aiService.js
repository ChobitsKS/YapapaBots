const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ แก้ไข: ใช้ชื่อโมเดลที่เสถียรและมีอยู่จริง
// หมายเหตุ: gemini-2.0 ยังเป็น experimental แนะนำให้ใช้ชื่อ 'gemini-2.0-flash-exp'
// แต่เพื่อความชัวร์ที่ 100% ผมตั้ง default เป็น 'gemini-1.5-flash' ซึ่งเร็วและฟรีเหมือนกัน
const modelName = process.env.GENAI_MODEL || "gemini-1.5-flash"; 

console.log(`🧠 AI Service using model: ${modelName}`);

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
        `;

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            },
            // หมายเหตุ: SDK บางเวอร์ชันต้องใส่ instruction ใน format นี้
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();
        return response.trim();

    } catch (error) {
        // ✅ ปรับปรุงการแสดง Error
        console.error('❌ Gemini Error Details:', error.message);
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.error('⚠️ สาเหตุ: ชื่อ Model ไม่ถูกต้อง หรือ API Key ไม่รองรับ Model นี้');
            console.error('👉 แนะนำ: ลองเปลี่ยน ENV GENAI_MODEL เป็น "gemini-1.5-flash"');
        }

        return "ขออภัย ระบบขัดข้องชั่วคราว (AI Error)";
    }
}

module.exports = { generateResponse };