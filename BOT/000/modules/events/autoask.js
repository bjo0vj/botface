const axios = require('axios');

// Groq API Key - TDF-2803
const GROQ_API_KEY = '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';

module.exports.config = {
    name: "autoask",
    eventType: ["message", "message_reply"],
    version: "1.0.0",
    credits: "TDF-2803 | zL: 0878139888",
    description: "Tự động trả lời AI khi có dấu ?"
};




module.exports.run = async function ({ }) {
    // Do nothing
};

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, senderID, body } = event;
    console.log(`[AUTOASK] Checking: ${body} | Sender: ${senderID}`);

    if (!body || body.trim() === '') return;
    if (senderID === api.getCurrentUserID()) return;

    const message = body.trim();

    // Kích hoạt khi có dấu ? ở cuối (kể cả có cách ' ?')
    if (!/\?\s*$/.test(body) || body.replace(/\s/g, '').length < 2) return;

    // Bỏ qua lệnh (bắt đầu bằng prefix)
    const prefix = global.config.PREFIX || '/';
    if (message.startsWith(prefix)) return;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            messages: [
                {
                    role: "system",
                    content: "Bạn là TDF-Bot. Trả lời ngắn gọn, tự nhiên bằng tiếng Việt như một người bạn, thêm một số câu hài hước tùy trường hợp, phong cách nhi nhảnh vui vẻ."
                },
                {
                    role: "user",
                    content: message
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const answer = response.data.choices[0]?.message?.content;

        if (answer) {
            return api.sendMessage(answer, threadID, messageID);
        }

    } catch (error) {
        // Im lặng khi lỗi
    }
};
