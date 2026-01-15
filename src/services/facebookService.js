/**
 * facebookService.js
 * จัดการการส่งข้อความผ่าน Facebook Graph API
 */

const axios = require('axios');
require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GRAPH_URL = 'https://graph.facebook.com/v19.0/me/messages';

// ส่งข้อความ Text
const sendText = async (psid, text) => {
    if (!text) return;

    try {
        await axios.post(GRAPH_URL, {
            messaging_type: 'RESPONSE',
            recipient: { id: psid },
            message: { text: text }
        }, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });
        console.log(`[FB] Sent message to ${psid}`);
    } catch (error) {
        console.error('[FB] Send Text Error:', error.response ? error.response.data : error.message);
    }
};

// ส่ง Action "กำลังพิมพ์..." (Typing Indicator)
const sendTypingAction = async (psid) => {
    try {
        await axios.post(GRAPH_URL, {
            recipient: { id: psid },
            sender_action: 'typing_on'
        }, {
            params: { access_token: PAGE_ACCESS_TOKEN }
        });
    } catch (error) {
        // action error ไม่ซีเรียสมาก
        console.error('[FB] Send Typing Error:', error.message);
    }
};

// ฟังก์ชันตอบกลับเมื่อเกิน Quota หรือมี Error อื่นๆ
const sendErrorMessage = async (psid) => {
    await sendText(psid, 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่ในภายหลัง หรือทิ้งข้อความไว้ให้เจ้าหน้าที่ได้เลยครับ');
};

module.exports = {
    sendText,
    sendTypingAction,
    sendErrorMessage
};
