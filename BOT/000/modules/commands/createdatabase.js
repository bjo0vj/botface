const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "createdatabase",
    version: "1.0.0",
    hasPermssion: 1, // Quản trị viên nhóm
    credits: "Bot",
    description: "Tạo database tương tác cho nhóm hiện tại",
    commandCategory: "Quản trị viên",
    usages: "- Tạo database tương tác cho nhóm",
    cooldowns: 5
};

const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

module.exports.run = async function ({ api, event, Threads }) {
    const { threadID, messageID, senderID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    try {
        // Đảm bảo thư mục tồn tại
        if (!fs.existsSync(tuongtacDataPath)) {
            fs.mkdirSync(tuongtacDataPath, { recursive: true });
        }

        const groupDataPath = path.join(tuongtacDataPath, `${threadID}.json`);

        // Kiểm tra xem đã có database chưa
        if (fs.existsSync(groupDataPath)) {
            const existingData = JSON.parse(fs.readFileSync(groupDataPath, "utf8"));
            return api.sendMessage(
                `[ DATABASE TƯƠNG TÁC ]\n` +
                `────────────────────\n` +
                `✅ Nhóm này đã có database!\n` +
                `👥 Số thành viên: ${existingData.members?.length || 0}\n` +
                `📅 Tạo lúc: ${existingData.createdAt || "N/A"}\n` +
                `────────────────────\n` +
                `📌 Dùng /checktuongtac để xem thống kê`,
                threadID, messageID
            );
        }

        // Lấy thông tin nhóm
        let threadInfo = null;
        try {
            threadInfo = await api.getThreadInfo(threadID);
        } catch (e) {
            threadInfo = { participantIDs: [senderID] };
        }

        const participantIDs = threadInfo.participantIDs || [senderID];

        // Tạo database mới
        const newDatabase = {
            threadID: threadID,
            createdAt: time,
            createdBy: senderID,
            members: participantIDs.map(id => ({
                id: id,
                day: 0,
                week: 0,
                total: 0,
                lastInteract: null
            })),
            lastReset: {
                day: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
                week: moment.tz("Asia/Ho_Chi_Minh").isoWeek()
            }
        };

        // Lưu database
        fs.writeFileSync(groupDataPath, JSON.stringify(newDatabase, null, 4), "utf8");

        return api.sendMessage(
            `[ DATABASE TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `✅ Đã tạo database thành công!\n` +
            `👥 Số thành viên: ${participantIDs.length}\n` +
            `📅 Tạo lúc: ${time}\n` +
            `────────────────────\n` +
            `📁 Lưu tại: tuongtac_data/${threadID}.json\n` +
            `────────────────────\n` +
            `📌 Dùng /autochecktuongtac on để bật theo dõi\n` +
            `📌 Dùng /checktuongtac để xem thống kê`,
            threadID, messageID
        );

    } catch (error) {
        console.log("createdatabase error:", error);
        return api.sendMessage(
            `❌ Lỗi khi tạo database: ${error.message}`,
            threadID, messageID
        );
    }
};
