const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');
const logger = require('../utils/logger');

let model;

try {
    if (config.geminiApiKey) {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey);
        model = genAI.getGenerativeModel({
            model: config.genAiModel,
            systemInstruction: "คุณคือผู้ช่วย AI ของโรงเรียนแพทย์และวิทยาศาสตร์สุขภาพ มีหน้าที่ตอบคำถามนักเรียนและบุคคลทั่วไปด้วยความสุภาพ เป็นทางการ และถูกต้อง ใช้ข้อมูลที่ได้รับเพื่อตอบคำถาม ถ้าไม่มีข้อมูลให้แจ้งว่าไม่ทราบและแนะนำให้ติดต่อเจ้าหน้าที่"
        });
    } else {
        logger.error('GEMINI_API_KEY is missing.');
    }
} catch (error) {
    logger.error('Failed to initialize Gemini AI', error);
}

/**
 * Generate response from Gemini
 * @param {string} userMessage 
 * @param {string} context - Context string retrieved from Sheets
 * @returns {Promise<string>} AI Response
 */
async function generateResponse(userMessage, context = '') {
    if (!model) {
        return "ขออภัย ระบบ AI ยังไม่พร้อมใช้งานในขณะนี้";
    }

    try {
        const prompt = `
Context Information (Knowledge Base):
${context}

User Question: ${userMessage}

Answer (in Thai):
`;
        // For simple text-only models
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        logger.error('Gemini generation error:', error);
        if (error.status === 429) {
            return "ขออภัย มีผู้ใช้งานจำนวนมาก กรุณารอสักครู่แล้วถามใหม่";
        }
        return "ขออภัย เกิดข้อขัดข้องในการประมวลผลคำตอบ";
    }
}

module.exports = {
    generateResponse
};
