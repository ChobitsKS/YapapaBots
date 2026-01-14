const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const facebookService = require('./services/facebookService');
const aiService = require('./services/aiService');
const sheetService = require('./services/sheetService');
const sessionService = require('./services/sessionService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Parse application/json
app.use(bodyParser.json());

// Root route for health check
app.get('/', (req, res) => {
    res.status(200).send('Facebook Gemini Chatbot is running!');
});

// Facebook Webhook Verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request if parameters are missing
    }
});

// Facebook Webhook Message Handling
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');

        for (const entry of body.entry) {
            if (entry.messaging && entry.messaging.length > 0) {
                const webhook_event = entry.messaging[0];

                // Check if it's an echo (Admin replied via Page Manager)
                if (webhook_event.message && webhook_event.message.is_echo) {
                    const userPsid = webhook_event.recipient.id; // Recipient is the User
                    console.log(`Admin replied to ${userPsid}. Switching to HUMAN mode.`);
                    const session = sessionService.getSession(userPsid);
                    if (session) {
                        sessionService.setMode(userPsid, 'HUMAN');
                        sessionService.updateActivity(userPsid);
                    }
                    continue; // Skip processing for bot
                }

                const sender_psid = webhook_event.sender.id;

                if (webhook_event.message && webhook_event.message.text) {
                    await handleMessage(sender_psid, webhook_event.message.text);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

async function handleMessage(sender_psid, received_message) {
    try {
        const session = sessionService.getSession(sender_psid);
        const userMsgLower = received_message.toLowerCase().trim();

        // 1. Check for switching back to BOT
        if (userMsgLower === 'จบการสนทนา' || userMsgLower === 'end chat') {
            sessionService.setMode(sender_psid, 'BOT');
            await facebookService.sendMessage(sender_psid, "ระบบอัตโนมัติกลับมาทำงานแล้วค่ะ มีอะไรให้ช่วยอีกไหมคะ?");
            return;
        }

        // 2. Check Mode
        if (session.mode === 'HUMAN') {
            sessionService.updateActivity(sender_psid);
            // In HUMAN mode, bot does nothing. User waits for admin.
            return;
        }

        // 3. Check for switching to HUMAN
        if (received_message.includes('ติดต่อเจ้าหน้าที่') || received_message.includes('เจ้าหน้าที่') || received_message.includes('คุยกับคน') || received_message.includes('คุยกับเจ้าหน้าที่')) {
            sessionService.setMode(sender_psid, 'HUMAN');
            await facebookService.sendMessage(sender_psid, "ระบบได้ส่งต่อให้เจ้าหน้าที่แล้วค่ะ กรุณารอสักครู่นะคะ (หากต้องการจบการสนทนา พิมพ์ 'จบการสนทนา')");
            return;
        }

        // 4. BOT MODE: Generate Response

        // Add User Message to History
        sessionService.addToHistory(sender_psid, 'user', received_message);

        // Get Context from Google Sheet (Smart Match)
        const context = await sheetService.findRelevantData(received_message);

        // Generate with History
        const history = sessionService.getHistory(sender_psid);
        const responseText = await aiService.generateResponse(received_message, context, history);

        // Add AI Response to History
        sessionService.addToHistory(sender_psid, 'model', responseText);

        // Send response back to Facebook
        await facebookService.sendMessage(sender_psid, responseText);

        sessionService.updateActivity(sender_psid);

    } catch (error) {
        console.error('Error in handleMessage:', error);
        await facebookService.sendMessage(sender_psid, 'ขออภัย ระบบเกิดข้อขัดข้องชั่วคราว');
    }
}

// Timeout Checker (Runs every 1 minute)
setInterval(async () => {
    const timedOutUsers = sessionService.checkTimeouts();
    for (const psid of timedOutUsers) {
        console.log(`User ${psid} timed out from HUMAN mode.`);
        try {
            await facebookService.sendMessage(psid, "เนื่องจากไม่มีการตอบรับนานเกินไป ระบบจึงเปลี่ยนกลับเป็นโหมดอัตโนมัติค่ะ หากต้องการติดต่อเจ้าหน้าที่ใหม่ พิมพ์ 'ติดต่อเจ้าหน้าที่' ได้เลยนะคะ");
        } catch (err) {
            console.error("Error sending timeout message:", err);
        }
    }
}, 60 * 1000);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
