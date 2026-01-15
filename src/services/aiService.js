/**
 * aiService.js
 * เชื่อมต่อ Gemini / Generative API และจัดการ System Instruction
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ใช้ gemini-1.5-flash เป็นค่าเริ่มต้น
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
    }
});

/**
 * สร้างคำตอบด้วย Gemini / Generative API
 * @param {string} userMessage
 * @param {string[]} contextData
 * @param {Array} history
 * @returns {Promise<string>}
 */
async function generateResponse(userMessage, contextData, history) {
    try {
        const contextStr = contextData.length > 0
            ? "ข้อมูลอ้างอิง:\n" + contextData.map(d => `- ${d}`).join('\n')
            : "ไม่มีข้อมูลอ้างอิงเพิ่มเติม";

        const systemInstruction = `
บทบาท: คุณคือแอดมินเพจ "โรงเรียนแพทย์และวิทยาศาสตร์สุขภาพ"
หน้าที่: ตอบคำถามผู้สนใจเกี่ยวกับหลักสูตร ค่าเทอม และข้อมูลโรงเรียน
เงื่อนไข:
1. ตอบเป็นภาษาไทย ให้กระชับ สุภาพ เป็นกันเอง
2. ใช้ "ข้อมูลอ้างอิง" ที่ให้มาในการตอบคำถามเป็นหลัก
3. ถ้าข้อมูลอ้างอิงมีคำตอบ ให้ตอบตามนั้น
4. ถ้าข้อมูลอ้างอิง **ไม่มี** คำตอบ หรือไม่แน่ใจ ห้าม��ั่ว ให้ตอบว่า "ขออภัย ยังไม่มีข้อมูลส่วนนี้ ทิ้งคำถามไว้ได้เลย เดี๋ยวเจ้าหน้าที่มาตอบครับ"
5. ห้ามแนะนำให้ผู้ใช้ไปค้นหาเอง พยายามช่วยให้ถึงที่สุด
6. ไม่ต้องเกริ่นนำยืดเยื้อ เข้าประเด็นเลย

${contextStr}
`;

        // Create parts for the conversation
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

        // result.response โครงสร้างอาจแตกต่างกันตามเวอร์ชันไลบรารี
        let text = '';

        if (!result) {
            throw new Error('Empty response from model');
        }

        const resp = result.response;

        // รองรับหลายรูปแบบของ response
        if (!resp) {
            text = JSON.stringify(result);
        } else if (typeof resp.text === 'function') {
            text = resp.text();
        } else if (typeof resp.text === 'string') {
            text = resp.text;
        } else if (typeof resp === 'string') {
            text = resp;
        } else if (resp.output_text) {
            text = resp.output_text;
        } else if (resp.content) {
            text = resp.content;
        } else {
            // พยายามดึง field ที่น่าจะมี
            text = JSON.stringify(resp);
        }

        return text;

    } catch (error) {
        console.error('[AI] Error:', error.message || error);

        // ถ้าเป็นปัญหา model not found ให้แจ้งใน log และให้คำแนะนำ
        if (error.message && error.message.includes('not found')) {
            console.error('[AI] Model not found. Run the list_models.js script to see available models or set GENAI_MODEL env to a supported model name.');
            return "ขออภัย ระบบจัดการโมเดลยังไม่พร้อม ลองติดต่อผู้ดูแลหรือรอสักครู่ครับ";
        }

        if (error.message && error.message.includes('429')) {
            return "ขออภัย ตอนนี้มีผู้ใช้งานเยอะ กรุณารอสักครู่แล้วพิมพ์ถามใหม่อีกครั้งค่ะ";
        }

        return "ขออภัย ตอนนี้มีผู้ใช้งานเยอะ กรุณารอสักครู่แล้วพิมพ์ถามใหม่อีกครั้งค่ะ";
    }
}

module.exports = {
    generateResponse
};