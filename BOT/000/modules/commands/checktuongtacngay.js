const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "checktuongtacngay",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Bot",
    description: "Xem thành viên có tương tác ngày lớn hơn số nhập vào",
    commandCategory: "Người dùng",
    usages: "[số] - Lọc thành viên có tương tác ngày > số nhập",
    cooldowns: 3
};

const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

// Đọc dữ liệu tương tác của nhóm
function getGroupData(threadID) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        }
    } catch (e) { }
    return null;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    // Lấy số để lọc
    const minCount = parseInt(args[0]) || 0;

    // Đọc dữ liệu tương tác
    const groupData = getGroupData(threadID);

    if (!groupData) {
        return api.sendMessage(
            `⚠️ Chưa có database cho nhóm này!\n` +
            `📌 Dùng ${global.config.PREFIX}autochecktuongtac on để tạo`,
            threadID, messageID
        );
    }

    const members = groupData.members || [];

    // Lọc thành viên có tương tác ngày > minCount
    const filtered = members.filter(m => (m.day || 0) > minCount);

    if (filtered.length === 0) {
        return api.sendMessage(
            `[ TƯƠNG TÁC NGÀY > ${minCount} ]\n` +
            `────────────────────\n` +
            `📭 Không có thành viên nào có\n` +
            `    tương tác ngày > ${minCount}\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );
    }

    // Sắp xếp giảm dần
    const sorted = filtered.sort((a, b) => (b.day || 0) - (a.day || 0));

    // Tạo danh sách
    let lines = [];
    let count = 1;

    for (const member of sorted) {
        let userName = global.data.userName.get(member.id) || "User";
        const lastTime = member.lastInteract || "-";
        lines.push(`${count}. ${userName} | Ngày: ${member.day || 0} | Cuối: ${lastTime}`);
        count++;
    }

    const message =
        `[ TƯƠNG TÁC NGÀY > ${minCount} ]\n` +
        `────────────────────\n` +
        `👥 Tìm thấy: ${filtered.length} thành viên\n` +
        `────────────────────\n` +
        lines.join('\n') +
        `\n────────────────────\n` +
        `⏰ ${time}`;

    return api.sendMessage(message, threadID, messageID);
};
