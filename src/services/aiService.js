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

    const models = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-pro"
    ];

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

        console.log(`Trying model: ${model}...`);

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
            }
            // If we get here but no candidates, it's a valid response but empty. 
            // Arguably we should just return, but maybe try next model? 
            // For now, let's assume empty candidates is a failure of the model generation, not connection.
            // But usually 404 is the connection/model error.

        } catch (error) {
            console.error(`Error with model ${model}:`, error.message);

            if (error.response) {
                // If it's 404, we continue to next model
                if (error.response.status === 404) {
                    console.log(`Model ${model} not found (404), trying next...`);
                    continue;
                }
                // If other error (400, 403, 500), it might be request body or key issue, so maybe don't retry?
                // But specifically for 'Not Found' (404) or 'Method Not Allowed' (405) we should retry.
                if (error.response.status !== 404) {
                    console.error('Response Data:', JSON.stringify(error.response.data));
                }
            }
        }
    }

    return "ขออภัย ระบบ AI ไม่สามารถใช้งานได้ในขณะนี้ (All models failed)";
}

module.exports = {
    generateResponse
};
