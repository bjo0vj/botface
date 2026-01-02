const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// URL server key - THAY ĐỔI KHI DEPLOY LÊN REPLIT
const KEY_SERVER = process.env.KEY_SERVER || "https://keyzlbot.onrender.com";

// File key
const KEY_FILE = path.join(__dirname, "key.txt");

// Đọc key từ file
function readKey() {
    try {
        if (fs.existsSync(KEY_FILE)) {
            return fs.readFileSync(KEY_FILE, "utf8").trim();
        }
    } catch (e) { }
    return "";
}

// Gọi API check key
function checkKey() {
    return new Promise(function (resolve) {
        const key = readKey();

        if (!key || key === "") {
            return resolve({
                valid: false,
                message: "⛔ Chưa có key trong file key.txt!\n\n🌐 Lên web lấy key miễn phí (6h)\n📞 Hoặc liên hệ 0878139888 mua key"
            });
        }

        // Key PREMIUM
        if (key.startsWith("PREMIUM-")) {
            return resolve({
                valid: true,
                message: "✅ Key PREMIUM hợp lệ!"
            });
        }

        // Gọi API server
        const url = KEY_SERVER + "/api/check?key=" + encodeURIComponent(key);
        const client = url.startsWith("https") ? https : http;

        const req = client.get(url, { timeout: 10000 }, function (res) {
            let data = "";
            res.on("data", function (chunk) { data += chunk; });
            res.on("end", function () {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ valid: false, message: "Lỗi server!" });
                }
            });
        });

        req.on("error", function () {
            // Offline mode - cho phép key có format đúng
            if (key.match(/^TDF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
                resolve({ valid: true, message: "✅ Key OK (offline)" });
            } else {
                resolve({ valid: false, message: "❌ Key không hợp lệ!" });
            }
        });

        req.on("timeout", function () {
            req.destroy();
            if (key.match(/^TDF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
                resolve({ valid: true, message: "✅ Key OK (offline)" });
            } else {
                resolve({ valid: false, message: "❌ Timeout!" });
            }
        });
    });
}

// Auto-check mỗi 10 phút
function startAutoCheck() {
    const chalk = require("chalk");

    setInterval(async function () {
        console.log(chalk.cyan("[KEY-CHECK] Đang kiểm tra key..."));
        const result = await checkKey();

        if (!result.valid) {
            console.log(chalk.red("═══════════════════════════════════════"));
            console.log(chalk.red("⛔ KEY ĐÃ HẾT HẠN HOẶC KHÔNG HỢP LỆ!"));
            console.log(chalk.red("═══════════════════════════════════════"));
            console.log(chalk.yellow(result.message));
            console.log(chalk.red("═══════════════════════════════════════"));
            console.log(chalk.red("Bot sẽ tự động tắt sau 10 giây..."));

            setTimeout(function () {
                process.exit(1);
            }, 10000);
        } else {
            console.log(chalk.green("[KEY-CHECK] " + result.message));
        }
    }, 10 * 60 * 1000); // 10 phút
}

module.exports = { checkKey, readKey, startAutoCheck, KEY_FILE };
