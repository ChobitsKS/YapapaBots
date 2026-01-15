const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GENAI_MODEL || "gemini-1.5-flash-latest";

console.log(`🧠 AI Service init with model: ${modelName}`);

const model = genAI.getGenerativeModel({ model: modelName });

// ฟังก์ชันสำหรับหน่วงเวลา (Sleep)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateResponse(userMessage, contextData, chatHistory) {
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

    // ตั้งค่าการ Retry สูงสุด 3 ครั้ง
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                },
                systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
            });

            const result = await chat.sendMessage(userMessage);
            const response = result.response.text();
            return response.trim();

        } catch (error) {
            attempt++;
            console.error(`❌ Gemini Error (Attempt ${attempt}/${maxRetries}):`, error.message);

            // ถ้าเป็น Error 429 (Too Many Requests) หรือ 503 (Server Overload) ให้รอแล้วลองใหม่
            if (error.message.includes('429') || error.message.includes('503')) {
                const waitTime = attempt * 2000; // รอ 2วิ, 4วิ, 6วิ ตามลำดับ
                console.log(`⏳ Quota Hit on Shared IP. Retrying in ${waitTime/1000}s...`);
                await delay(waitTime);
            } else {
                // ถ้าเป็น Error อื่น (เช่น 404, Key ผิด) ให้ยอมแพ้เลย ไม่ต้อง Retry
                break;
            }
        }
    }

    // ถ้าลองครบ 3 ครั้งแล้วยังไม่ได้
    return "ขออภัย ขณะนี้ระบบ AI มีผู้ใช้งานจำนวนมาก กรุณารอสักครู่แล้วถามใหม่อีกครั้งนะครับ";
}

module.exports = { generateResponse };