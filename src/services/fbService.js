const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const FB_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send text message to Facebook User
 * @param {string} recipientId 
 * @param {string} text 
 */
async function sendMessage(recipientId, text) {
    if (!config.facebook.pageAccessToken) {
        logger.error('PAGE_ACCESS_TOKEN is missing');
        return;
    }

    try {
        // Truncate text if too long (FB limit is 2000 chars usually, safer to keep under)
        const safeText = text.substring(0, 1999);

        await axios.post(`${FB_API_URL}/me/messages`, {
            recipient: { id: recipientId },
            message: { text: safeText },
            messaging_type: 'RESPONSE'
        }, {
            params: { access_token: config.facebook.pageAccessToken }
        });

        logger.info(`Message sent to ${recipientId}`);
    } catch (error) {
        logger.error(`Error sending message: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
}

/**
 * Send Typing Indicator (User Engagement)
 * @param {string} recipientId 
 */
async function sendTypingOn(recipientId) {
    if (!config.facebook.pageAccessToken) return;
    try {
        await axios.post(`${FB_API_URL}/me/messages`, {
            recipient: { id: recipientId },
            sender_action: "typing_on"
        }, {
            params: { access_token: config.facebook.pageAccessToken }
        });
    } catch (e) { /* ignore */ }
}

module.exports = {
    sendMessage,
    sendTypingOn
};
