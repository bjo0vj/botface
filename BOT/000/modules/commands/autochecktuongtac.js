const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "autochecktuongtac",
    version: "1.0.0",
    hasPermssion: 1, // Quản trị viên nhóm
    credits: "Bot",
    description: "Bật/tắt chế độ theo dõi tương tác đặc biệt cho nhóm",
    commandCategory: "Quản trị viên",
    usages: "[on/off] - Bật hoặc tắt chế độ theo dõi tương tác",
    cooldowns: 3
};

const dataPath = path.join(__dirname, "data", "autoCheckTuongTac.json");
const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

// Đảm bảo file và folder tồn tại
function ensureDataFile() {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({ enabledThreads: {} }, null, 4));
    }
    if (!fs.existsSync(tuongtacDataPath)) {
        fs.mkdirSync(tuongtacDataPath, { recursive: true });
    }
}

// Đọc dữ liệu
function getData() {
    ensureDataFile();
    try {
        return JSON.parse(fs.readFileSync(dataPath, "utf8"));
    } catch (e) {
        return { enabledThreads: {} };
    }
}

// Ghi dữ liệu
function saveData(data) {
    ensureDataFile();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), "utf8");
}

// Tạo database cho nhóm
async function createGroupDatabase(api, threadID, senderID) {
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const groupDataPath = path.join(tuongtacDataPath, `${threadID}.json`);

    // Nếu đã có thì không tạo lại
    if (fs.existsSync(groupDataPath)) {
        return JSON.parse(fs.readFileSync(groupDataPath, "utf8"));
    }

    // Lấy thông tin nhóm
    let participantIDs = [senderID];
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        participantIDs = threadInfo.participantIDs || [senderID];
    } catch (e) { }

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

    fs.writeFileSync(groupDataPath, JSON.stringify(newDatabase, null, 4), "utf8");
    return newDatabase;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    // Lấy tên người dùng
    let senderName = "User";
    try {
        const userInfo = await api.getUserInfo(senderID);
        senderName = userInfo[senderID]?.name || global.data.userName.get(senderID) || "User";
    } catch (e) {
        senderName = global.data.userName.get(senderID) || "User";
    }

    // Kiểm tra tham số
    const option = args[0]?.toLowerCase();

    if (!option || (option !== "on" && option !== "off")) {
        // Hiển thị trạng thái hiện tại
        const data = getData();
        const isEnabled = data.enabledThreads[threadID]?.enabled || false;
        const statusText = isEnabled ? "✅ BẬT" : "❌ TẮT";

        return api.sendMessage(
            `[ AUTO CHECK TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `📊 Trạng thái hiện tại: ${statusText}\n` +
            `────────────────────\n` +
            `📌 Hướng dẫn sử dụng:\n` +
            `• ${global.config.PREFIX}autochecktuongtac on - Bật theo dõi\n` +
            `• ${global.config.PREFIX}autochecktuongtac off - Tắt theo dõi\n` +
            `────────────────────\n` +
            `⏰ Time: ${time}`,
            threadID, messageID
        );
    }

    const data = getData();

    if (option === "on") {
        // Tạo database cho nhóm
        const groupDB = await createGroupDatabase(api, threadID, senderID);
        const memberCount = groupDB.members?.length || 0;

        // Bật chế độ theo dõi
        data.enabledThreads[threadID] = {
            enabled: true,
            enabledBy: senderID,
            enabledByName: senderName,
            enabledAt: time
        };
        saveData(data);

        return api.sendMessage(
            `[ AUTO CHECK TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `✅ Đã BẬT chế độ theo dõi tương tác\n` +
            `📊 Database đã được tạo/cập nhật\n` +
            `👥 Số thành viên: ${memberCount}\n` +
            `────────────────────\n` +
            `💬 Mọi tin nhắn sẽ được đếm vào:\n` +
            `   • Bộ đếm ngày\n` +
            `   • Bộ đếm tuần\n` +
            `────────────────────\n` +
            `📁 File: tuongtac_data/${threadID}.json\n` +
            `👤 Bật bởi: ${senderName}\n` +
            `⏰ Time: ${time}\n` +
            `────────────────────\n` +
            `📌 Dùng ${global.config.PREFIX}checktuongtac để xem thống kê`,
            threadID, messageID
        );
    } else if (option === "off") {
        // Tắt chế độ theo dõi (không xóa database)
        if (data.enabledThreads[threadID]) {
            data.enabledThreads[threadID].enabled = false;
            data.enabledThreads[threadID].disabledBy = senderID;
            data.enabledThreads[threadID].disabledByName = senderName;
            data.enabledThreads[threadID].disabledAt = time;
        }
        saveData(data);

        return api.sendMessage(
            `[ AUTO CHECK TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `❌ Đã TẮT chế độ theo dõi tương tác\n` +
            `📊 Dữ liệu vẫn được giữ nguyên\n` +
            `────────────────────\n` +
            `👤 Tắt bởi: ${senderName}\n` +
            `⏰ Time: ${time}`,
            threadID, messageID
        );
    }
};

// Lưu tương tác khi có tin nhắn
module.exports.handleEvent = async function ({ event }) {
    if (!event.isGroup) return;

    const { threadID, senderID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    try {
        // Kiểm tra xem nhóm có bật auto check không
        const data = getData();
        if (!data.enabledThreads[threadID]?.enabled) return;

        // Đường dẫn database nhóm
        const groupDataPath = path.join(tuongtacDataPath, `${threadID}.json`);
        if (!fs.existsSync(groupDataPath)) return;

        // Đọc database
        let groupDB = JSON.parse(fs.readFileSync(groupDataPath, "utf8"));

        // Kiểm tra reset ngày/tuần
        const today = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
        const currentWeek = moment.tz("Asia/Ho_Chi_Minh").isoWeek();

        // Reset ngày nếu cần
        if (groupDB.lastReset.day !== today) {
            groupDB.members.forEach(m => m.day = 0);
            groupDB.lastReset.day = today;
        }

        // Reset tuần nếu cần
        if (groupDB.lastReset.week !== currentWeek) {
            groupDB.members.forEach(m => m.week = 0);
            groupDB.lastReset.week = currentWeek;
        }

        // Tìm hoặc thêm member
        let member = groupDB.members.find(m => m.id === senderID);
        if (!member) {
            member = {
                id: senderID,
                day: 0,
                week: 0,
                total: 0,
                lastInteract: null
            };
            groupDB.members.push(member);
        }

        // Cập nhật tương tác
        member.day++;
        member.week++;
        member.total++;
        member.lastInteract = time;

        // Lưu database
        fs.writeFileSync(groupDataPath, JSON.stringify(groupDB, null, 4), "utf8");

    } catch (e) {
        // Silent fail
    }
};
