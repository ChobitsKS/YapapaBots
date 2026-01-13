const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function generateResponse(userMessage, contextData) {
    if (!API_KEY) {
        console.error("Gemini API Key is missing.");
        return "ขออภัย ระบบ AI ยังไม่พร้อมใช้งาน (ติดต่อ Admin)";
    }

    const systemInstruction = `
คุณเป็นผู้ช่วยอัจฉริยะสำหรับเพจ Facebook
หน้าที่ของคุณคือตอบคำถามลูกค้าโดยอ้างอิงข้อมูลจาก "ข้อมูลในระบบ" ด้านล่างนี้เท่านั้น
- หากข้อมูลมีคำตอบ ให้ตอบอย่างสุภาพ กระชับ และเป็นธรรมชาติ (ภาษาไทย)
- หากไม่มีข้อมูลในส่วนที่ให้มา ให้ตอบว่า "ขออภัย ฉันไม่มีข้อมูลเกี่ยวกับเรื่องนี้ รบกวนติดต่อแอดมินโดยตรงครับ"
- ห้ามแต่งเรื่องขึ้นเอง

ข้อมูลในระบบ (Context):
${contextData}
`;

    // Direct API Call to bypass SDK version issues
    // Using gemini-1.5-flash directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: systemInstruction + "\n\nคำถาม: " + userMessage }
                ]
            }
        ]
    };

    try {
        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            return aiText;
        } else {
            return "ขออภัย AI ไม่ตอบสนอง (No Candidates)";
        }

    } catch (error) {
        console.error('Error in AI generation (Axios):', error.message);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data));
            // Log if model not found to confirm
            if (error.response.status === 404) {
                return "ขออภัย ไม่พบโมเดล AI (404 Model Not Found) - กรุณาเช็ค API Key/Project";
            }
        }
        return "ขออภัย เกิดข้อขัดข้องในการประมวลผลคำตอบ";
    }
}

module.exports = {
    generateResponse
};
