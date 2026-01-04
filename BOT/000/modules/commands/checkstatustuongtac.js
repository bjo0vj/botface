const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "checkstatustuongtac",
    version: "1.0.0",
    hasPermssion: 2, // Chỉ admin bot
    credits: "Bot",
    description: "Xem trạng thái theo dõi tương tác của tất cả các nhóm",
    commandCategory: "Admin",
    usages: "- Xem danh sách nhóm đang bật/tắt auto check tương tác",
    cooldowns: 5
};

const autoCheckPath = path.join(__dirname, "data", "autoCheckTuongTac.json");
const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

// Đọc dữ liệu config
function getAutoCheckData() {
    try {
        if (fs.existsSync(autoCheckPath)) {
            return JSON.parse(fs.readFileSync(autoCheckPath, "utf8"));
        }
    } catch (e) { }
    return { enabledThreads: {} };
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    const data = getAutoCheckData();
    const threads = Object.entries(data.enabledThreads);

    if (threads.length === 0) {
        return api.sendMessage(
            `[ STATUS TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `📭 Chưa có nhóm nào được cấu hình\n` +
            `────────────────────\n` +
            `📌 Dùng ${global.config.PREFIX}autochecktuongtac on\n` +
            `    trong nhóm để bật theo dõi\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );
    }

    // Đếm số nhóm bật/tắt
    let enabledCount = 0;
    let disabledCount = 0;
    let enabledList = [];
    let disabledList = [];

    for (const [tid, info] of threads) {
        // Kiểm tra file database có tồn tại không
        const dbPath = path.join(tuongtacDataPath, `${tid}.json`);
        const hasDB = fs.existsSync(dbPath);

        // Lấy số thành viên nếu có database
        let memberCount = 0;
        if (hasDB) {
            try {
                const dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
                memberCount = dbData.members?.length || 0;
            } catch (e) { }
        }

        // Lấy tên nhóm (nếu có)
        let threadName = tid;
        try {
            const threadInfo = await api.getThreadInfo(tid);
            threadName = threadInfo.name || tid;
        } catch (e) { }

        if (info.enabled) {
            enabledCount++;
            enabledList.push({
                id: tid,
                name: threadName,
                enabledBy: info.enabledByName || info.enabledBy,
                enabledAt: info.enabledAt,
                memberCount: memberCount,
                hasDB: hasDB
            });
        } else {
            disabledCount++;
            disabledList.push({
                id: tid,
                name: threadName,
                disabledBy: info.disabledByName || info.disabledBy,
                disabledAt: info.disabledAt
            });
        }
    }

    // Tạo output
    let message = `[ STATUS TƯƠNG TÁC ]\n`;
    message += `────────────────────\n`;
    message += `📊 Tổng: ${threads.length} nhóm\n`;
    message += `✅ Đang bật: ${enabledCount}\n`;
    message += `❌ Đã tắt: ${disabledCount}\n`;
    message += `────────────────────\n`;

    if (enabledList.length > 0) {
        message += `\n📗 NHÓM ĐANG BẬT:\n`;
        for (let i = 0; i < enabledList.length; i++) {
            const g = enabledList[i];
            message += `${i + 1}. ${g.name}\n`;
            message += `   👥 ${g.memberCount} thành viên\n`;
            message += `   👤 Bật bởi: ${g.enabledBy}\n`;
            message += `   ⏰ ${g.enabledAt}\n`;
        }
    }

    if (disabledList.length > 0) {
        message += `\n📕 NHÓM ĐÃ TẮT:\n`;
        for (let i = 0; i < disabledList.length; i++) {
            const g = disabledList[i];
            message += `${i + 1}. ${g.name}\n`;
            message += `   👤 Tắt bởi: ${g.disabledBy || "N/A"}\n`;
            message += `   ⏰ ${g.disabledAt || "N/A"}\n`;
        }
    }

    message += `\n────────────────────\n`;
    message += `⏰ Cập nhật: ${time}`;

    return api.sendMessage(message, threadID, messageID);
};
