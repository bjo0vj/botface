const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "addaccount",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Bot",
    description: "Tạo tài khoản để đăng nhập web quản lý tương tác",
    commandCategory: "Admin",
    usages: "[render_url] - Tạo code + password, nhập URL Render",
    cooldowns: 10
};

const codePath = path.join(__dirname, "..", "..", "code.txt");

function generateCode() {
    let code = '';
    for (let i = 0; i < 10; i++) {
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    // Render URL từ args hoặc placeholder
    const renderUrl = args[0] || "https://your-app.onrender.com";

    try {
        const code = generateCode();
        const password = generateCode();

        // Lưu: code, password, render_url
        const content = `${code}\n${password}\n${renderUrl}`;
        fs.writeFileSync(codePath, content, "utf8");

        // Đăng ký với Render server nếu có URL
        if (renderUrl && !renderUrl.includes('your-app')) {
            try {
                const axios = require('axios');
                await axios.post(`${renderUrl}/bot/register`, {
                    code,
                    password,
                    webhook: 'http://your-bot-ip:3002' // Bot webhook URL
                });
            } catch (e) {
                console.log('Render not reachable yet');
            }
        }

        return api.sendMessage(
            `[ TẠO TÀI KHOẢN WEB ]\n` +
            `════════════════════\n\n` +
            `📋 CODE:\n${code}\n\n` +
            `🔐 PASSWORD:\n${password}\n\n` +
            `🌐 RENDER URL:\n${renderUrl}\n\n` +
            `════════════════════\n` +
            `📁 Đã lưu vào: code.txt\n` +
            `────────────────────\n` +
            `📌 HƯỚNG DẪN DEPLOY RENDER:\n\n` +
            `1️⃣ Tạo repo GitHub với folder webchecktuongtac\n\n` +
            `2️⃣ Vào render.com → New Web Service\n` +
            `   • Connect GitHub repo\n` +
            `   • Root: webchecktuongtac\n` +
            `   • Build: npm install\n` +
            `   • Start: npm start\n\n` +
            `3️⃣ Sau khi deploy xong, chạy lại:\n` +
            `   ${global.config.PREFIX}addaccount https://xxx.onrender.com\n\n` +
            `4️⃣ Chạy ${global.config.PREFIX}webserver để bật webhook\n\n` +
            `5️⃣ Đăng nhập web với code + pass\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );

    } catch (error) {
        return api.sendMessage(`❌ Lỗi: ${error.message}`, threadID, messageID);
    }
};
