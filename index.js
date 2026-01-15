const express = require('express');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
    res.send('FB Gemini Chatbot v5 is running! Status: OK');
});

// Webhook Verification (Facebook)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.facebook.verifyToken) {
            logger.info('Webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            logger.error('Webhook verification failed: Invalid token');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request if parameters are missing
    }
});

// Webhook Event Handling (Facebook)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

        // Iterate over each entry - there may be multiple if batched
        for (const entry of body.entry) {
            if (entry.messaging && entry.messaging.length > 0) {
                // Get the webhook event
                const webhook_event = entry.messaging[0];
                const senderPsid = webhook_event.sender.id;

                // Check if the event is a message or postback and pass the function to retrieve the response
                if (webhook_event.message && webhook_event.message.text) {
                    handleMessage(senderPsid, webhook_event.message.text);
                }
            }
        }
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

/**
 * Handle incoming text messages
 */
const sheetService = require('./src/services/sheetService');
const aiService = require('./src/services/aiService');
const fbService = require('./src/services/fbService');

async function handleMessage(senderPsid, receivedMessage) {
    try {
        // 1. Send Typing Indicator (User Experience)
        await fbService.sendTypingOn(senderPsid);

        // 2. Fetch Knowledge Base from Sheets
        // Note: In production, consider caching this to avoid hitting Rate Limits on Sheets API
        const kbRows = await sheetService.getKnowledgeBase();

        // Format Context: Assume Column A=Keyword/Question, B=Answer
        // Filter out empty rows or headers if needed
        const context = kbRows
            .slice(1) // Skip header if existing, or just use all. Let's assume row 1 is header
            .map(row => `Q: ${row[0] || ''}\nA: ${row[1] || ''}`)
            .join('\n---\n');

        // 3. Generate Answer with AI
        const aiResponse = await aiService.generateResponse(receivedMessage, context);

        // 4. Send Response back to Facebook
        await fbService.sendMessage(senderPsid, aiResponse);

        // 5. Log Conversation
        await sheetService.logConversation([
            new Date().toISOString(),
            senderPsid,
            receivedMessage,
            aiResponse,
            'SUCCESS'
        ]);

    } catch (error) {
        logger.error('Error in handleMessage:', error);
        // Optionally send a fallback message
        // await fbService.sendMessage(senderPsid, "ขออภัย เกิดข้อผิดพลาดในระบบ");
    }
}

// Start Server
app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
