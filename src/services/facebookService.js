const axios = require('axios');
require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendMessage(senderPsid, responseText) {
    try {
        const requestBody = {
            recipient: { id: senderPsid },
            message: { 
                text: responseText,
                // ✅ เพิ่ม metadata เพื่อระบุว่าข้อความนี้มาจากบอท
                metadata: "BOT_REPLY" 
            }
        };

        await axios.post(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            requestBody
        );
        console.log(`📤 ส่งข้อความถึง ${senderPsid} สำเร็จ`);
    } catch (error) {
        console.error('❌ ส่งข้อความไม่สำเร็จ:', error.response ? error.response.data : error.message);
    }
}

module.exports = { sendMessage };