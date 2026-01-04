const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "loaddatabase",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Bot",
    description: "Đồng bộ thành viên: thêm mới + xóa người đã rời",
    commandCategory: "Quản trị viên",
    usages: "- Cập nhật database thành viên",
    cooldowns: 3
};

const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

function getGroupData(threadID) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        }
    } catch (e) { }
    return null;
}

function saveGroupData(threadID, data) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    let groupData = getGroupData(threadID);

    if (!groupData) {
        return api.sendMessage(
            `⚠️ Chưa có database!\n📌 Dùng ${global.config.PREFIX}autochecktuongtac on`,
            threadID, messageID
        );
    }

    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const currentMemberIDs = threadInfo.participantIDs || [];
        const existingIDs = groupData.members.map(m => m.id);

        // Xóa thành viên đã rời
        const beforeCount = groupData.members.length;
        groupData.members = groupData.members.filter(m => currentMemberIDs.includes(m.id));
        const removedCount = beforeCount - groupData.members.length;

        // Thêm thành viên mới
        const afterIDs = groupData.members.map(m => m.id);
        const newIDs = currentMemberIDs.filter(id => !afterIDs.includes(id));

        for (const id of newIDs) {
            groupData.members.push({
                id: id,
                day: 0,
                week: 0,
                total: 0,
                lastInteract: null
            });
        }

        groupData.lastSync = time;
        groupData.lastSyncBy = senderID;
        saveGroupData(threadID, groupData);

        return api.sendMessage(
            `[ LOAD DATABASE ]\n` +
            `────────────────────\n` +
            `✅ Đồng bộ thành công!\n` +
            `➕ Thêm mới: ${newIDs.length}\n` +
            `➖ Đã xóa: ${removedCount}\n` +
            `👥 Tổng: ${groupData.members.length}\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );

    } catch (e) {
        return api.sendMessage(`❌ Lỗi: ${e.message}`, threadID, messageID);
    }
};
