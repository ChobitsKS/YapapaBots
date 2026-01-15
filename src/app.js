/**
 * app.js
 * Main Entry Point
 */

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const sessionService = require('./services/sessionService');
const facebookService = require('./services/facebookService');
const sheetService = require('./services/sheetService');
const aiService = require('./services/aiService');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1. Webhook Verification (สำหรับ Facebook มาเช็ค)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. Webhook Event Handling
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        // ตอบกลับ 200 ทันทีตามข้อกำหนด Facebook (Timeout 20s)
        res.status(200).send('EVENT_RECEIVED');

        for (const entry of body.entry) {
            // รับ Messaging Events
            const webhook_event = entry.messaging ? entry.messaging[0] : null;

            if (webhook_event) {
                const psid = webhook_event.sender.id;

                // ตรวจสอบว่าเป็น Admin Reply หรือไม่ (message_echo)
                // ถ้าเป็น echo หมายถึงเพจตอบกลับเอง (Admin ตอบ)
                if (webhook_event.message && webhook_event.message.is_echo) {

                    // เพิ่มการเช็ค Metadata ถ้าเป็น BOT_REPLY ให้ข้ามไป (ไม่นับเป็น Admin Reply)
                    if (webhook_event.message.metadata === "BOT_REPLY") {
                        console.log(`[Event] Bot echo to ${webhook_event.recipient.id}, skipping.`);
                        return;
                    }

                    console.log(`[Event] Admin replied to ${webhook_event.recipient.id}, Handover active.`);
                    // Sender คือ Page ID, Recipient คือ User ID ในกรณี Echo
                    // แต่ Facebook Echo event sender.id มักจะเป็น Page ID
                    // ต้องระวัง PSID ตรงนี้: Echo -> Sender=Page, Recipient=User
                    const userPsid = webhook_event.recipient.id;
                    sessionService.setHumanMode(userPsid);
                    return;
                }

                // กรณีข้อความจาก User จริงๆ (ไม่ใช่ Echo)
                if (webhook_event.message && !webhook_event.message.is_echo) {
                    await handleMessage(psid, webhook_event.message);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

// Logic การตอบกลับ
async function handleMessage(psid, message) {
    if (!message.text) return; // ไม่รับรูป/Sticker ในเวอร์ชันนี้ (หรือรับแต่ไม่ตอบ)

    // 1. อัปเดต Session
    sessionService.touchSession(psid);

    // 2. เช็คโหมด
    if (!sessionService.shouldBotReply(psid)) {
        console.log(`[Skip] User ${psid} is in HUMAN mode.`);
        return;
    }

    const userText = message.text;

    try {
        // 3. Action Typing...
        await facebookService.sendTypingAction(psid);

        // 4. ค้นหาข้อมูล (Sheets)
        const contextData = await sheetService.searchKnowledgeBase(userText);
        console.log(`[Info] User: ${userText} | Found ${contextData.length} rows`);

        // 5. ดึง History
        const history = sessionService.getHistory(psid);

        // 6. ถาม Gemini
        const botResponse = await aiService.generateResponse(userText, contextData, history);

        // 7. ส่งคำตอบ
        await facebookService.sendText(psid, botResponse);

        // 8. บันทึก History
        sessionService.addHistory(psid, userText, botResponse);

    } catch (error) {
        console.error('[Main] Error handling message:', error);
        await facebookService.sendErrorMessage(psid);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
