const axios = require('axios');
require('dotenv').config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendMessage(recipientId, text) {
    if (!PAGE_ACCESS_TOKEN) {
        console.error('PAGE_ACCESS_TOKEN is missing');
        return;
    }

    const requestBody = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text
        }
    };

    try {
        await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody);
        console.log(`Message sent to ${recipientId}`);
    } catch (error) {
        console.error('Unable to send message to Facebook:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw error; // Re-throw to be handled by the caller
    }
}

module.exports = {
    sendMessage
};
