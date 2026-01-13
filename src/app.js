const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const facebookService = require('./services/facebookService');
const aiService = require('./services/aiService');
const sheetService = require('./services/sheetService');

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
        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');

        // Iterate over each entry - there may be multiple if batched
        for (const entry of body.entry) {
            // Get the webhook event. entry.messaging is an array, but 
            // will only contain one event, so we get index 0
            if (entry.messaging && entry.messaging.length > 0) {
                const webhook_event = entry.messaging[0];
                console.log(webhook_event);

                // Get the sender PSID
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
        // 1. Get context from Google Sheets
        const context = await sheetService.getDataFromSheet();

        // 2. Generate response using Gemini
        const responseText = await aiService.generateResponse(received_message, context);

        // 3. Send response back to Facebook
        await facebookService.sendMessage(sender_psid, responseText);
    } catch (error) {
        console.error('Error in handleMessage:', error);
        await facebookService.sendMessage(sender_psid, 'ขออภัย ระบบเกิดข้อขัดข้องชั่วคราว');
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
