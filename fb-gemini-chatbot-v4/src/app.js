const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import Services
const aiService = require('./services/aiService');
const facebookService = require('./services/facebookService');
const sessionService = require('./services/sessionService');
const sheetService = require('./services/sheetService');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// --- Webhook Verification (สำหรับ Facebook ตรวจสอบ) ---
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('✅ Webhook Verified');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// --- Webhook Event Handling ---
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const webhook_event = entry.messaging ? entry.messaging[0] : null;

            if (webhook_event) {
                // 1. ตรวจจับ Admin ตอบกลับ (Echo Event)
                if (webhook_event.message && webhook_event.message.is_echo) {
                    const recipientId = webhook_event.recipient.id; // User ที่ Admin คุยด้วย
                    sessionService.handleAdminIntervention(recipientId);
                    continue; // จบการทำงานรอบนี้
                }

                // 2. ตรวจจับ User ส่งข้อความมา
                const senderPsid = webhook_event.sender.id;
                if (webhook_event.message && webhook_event.message.text && !webhook_event.message.is_echo) {
                    const userMessage = webhook_event.message.text;
                    console.log(`📩 User ${senderPsid}: ${userMessage}`);

                    // เช็ค Handover: บอทควรตอบไหม?
                    if (sessionService.shouldBotReply(senderPsid)) {
                        
                        // Active User
                        sessionService.updateActivity(senderPsid);

                        // หาข้อมูล + ถาม Gemini
                        const contextData = await sheetService.searchContext(userMessage);
                        const session = sessionService.getSession(senderPsid);
                        
                        const aiReply = await aiService.generateResponse(
                            userMessage, 
                            contextData, 
                            session.history
                        );

                        // ส่งคำตอบ
                        await facebookService.sendMessage(senderPsid, aiReply);

                        // บันทึก Memory
                        sessionService.addHistory(senderPsid, 'user', userMessage);
                        sessionService.addHistory(senderPsid, 'model', aiReply);

                    } else {
                        console.log(`🤐 Bot Paused (Admin Mode) for ${senderPsid}`);
                        sessionService.updateActivity(senderPsid); // รีเซ็ตเวลา 1 นาทีใหม่
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});