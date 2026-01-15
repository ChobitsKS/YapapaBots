/**
 * aiService.js
 * เชื่อมต่อ Gemini API และจัดการ System Instruction
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "models/gemini-pro",
    generationConfig: {
        maxOutputTokens: 500, // จำกัด Output
        temperature: 0.7
    }
});

/**
 * สร้างคำตอบด้วย Gemini
 * @param {string} userMessage คำถามผู้ใช้
 * @param {string[]} contextData ข้อมูลจาก Sheets
 * @param {Array} history ประวัติการคุย
 * @returns {Promise<string>} คำตอบจาก AI
 */
async function generateResponse(userMessage, contextData, history) {
    try {
        // สร้าง Context String
        const contextStr = contextData.length > 0
            ? "ข้อมูลอ้างอิง:\n" + contextData.map(d => `- ${d}`).join('\n')
            : "ไม่มีข้อมูลอ้างอิงเพิ่มเติม";

        // System Instruction
        const systemInstruction = `
บทบาท: คุณคือแอดมินเพจ "โรงเรียนแพทย์และวิทยาศาสตร์สุขภาพ"
หน้าที่: ตอบคำถามผู้สนใจเกี่ยวกับหลักสูตร ค่าเทอม และข้อมูลโรงเรียน
เงื่อนไข:
1. ตอบเป็นภาษาไทย ให้กระชับ สุภาพ เป็นกันเอง
2. ใช้ "ข้อมูลอ้างอิง" ที่ให้มาในการตอบคำถามเป็นหลัก
3. ถ้าข้อมูลอ้างอิงมีคำตอบ ให้ตอบตามนั้น
4. ถ้าข้อมูลอ้างอิง **ไม่มี** คำตอบ หรือไม่แน่ใจ ห้ามมั่ว ให้ตอบว่า "ขออภัย ยังไม่มีข้อมูลส่วนนี้ ทิ้งคำถามไว้ได้เลย เดี๋ยวเจ้าหน้าที่มาตอบครับ"
5. ห้ามแนะนำให้ผู้ใช้ไปค้นหาเอง พยายามช่วยให้ถึงที่สุด
6. ไม่ต้องเกริ่นนำยืดเยื้อ เข้าประเด็นเลย

${contextStr}
`;

        const parts = [
            { role: 'user', parts: [{ text: systemInstruction }] }
        ];

        history.forEach(h => {
            parts.push({ role: h.role, parts: [{ text: h.content }] });
        });

        parts.push({ role: 'user', parts: [{ text: userMessage }] });

        const result = await model.generateContent({
            contents: parts
        });

        const response = result.response;
        return response.text();

    } catch (error) {
        console.error('[AI] Error:', error.message);

        if (error.message.includes('429')) {
            return "ขออภัย ตอนนี้มีผู้ใช้งานเยอะ กรุณารอสักครู่แล้วพิมพ์ถามใหม่อีกครั้งค่ะ";
        }

        return "ขออภัย ตอนนี้มีผู้ใช้งานเยอะ กรุณารอสักครู่แล้วพิมพ์ถามใหม่อีกครั้งค่ะ";
    }
}

module.exports = {
    generateResponse
};
