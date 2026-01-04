const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "checktuongtac",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Bot",
    description: "Xem số lần tương tác của tất cả thành viên trong nhóm",
    commandCategory: "Người dùng",
    usages: "- Hiển thị tương tác ngày/tuần của tất cả thành viên",
    cooldowns: 3
};

const tuongtacDataPath = path.join(__dirname, "tuongtac_data");
const autoCheckPath = path.join(__dirname, "data", "autoCheckTuongTac.json");

// Đọc dữ liệu auto check config
function getAutoCheckData() {
    try {
        if (fs.existsSync(autoCheckPath)) {
            return JSON.parse(fs.readFileSync(autoCheckPath, "utf8"));
        }
    } catch (e) { }
    return { enabledThreads: {} };
}

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

// Lưu dữ liệu nhóm
function saveGroupData(threadID, data) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

// Đồng bộ FULL: thêm mới + xóa người rời
async function fullSyncMembers(api, threadID, groupData) {
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const currentMemberIDs = threadInfo.participantIDs || [];
        const existingIDs = groupData.members.map(m => m.id);

        // Xóa thành viên đã rời nhóm
        const originalCount = groupData.members.length;
        groupData.members = groupData.members.filter(m => currentMemberIDs.includes(m.id));
        const removedCount = originalCount - groupData.members.length;

        // Thêm thành viên mới
        const afterRemoveIDs = groupData.members.map(m => m.id);
        const newMemberIDs = currentMemberIDs.filter(id => !afterRemoveIDs.includes(id));

        for (const id of newMemberIDs) {
            groupData.members.push({
                id: id,
                day: 0,
                week: 0,
                total: 0,
                lastInteract: null
            });
        }

        // Lưu lại
        groupData.lastSync = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
        saveGroupData(threadID, groupData);

        return {
            removedCount,
            addedCount: newMemberIDs.length,
            totalCount: groupData.members.length
        };
    } catch (e) {
        return { removedCount: 0, addedCount: 0, totalCount: groupData.members.length, error: e.message };
    }
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    const autoCheckData = getAutoCheckData();
    const isEnabled = autoCheckData.enabledThreads[threadID]?.enabled || false;

    let groupData = getGroupData(threadID);

    if (!groupData) {
        return api.sendMessage(
            `[ CHECK TƯƠNG TÁC ]\n` +
            `────────────────────\n` +
            `⚠️ Chưa có database cho nhóm này!\n` +
            `📌 Dùng ${global.config.PREFIX}autochecktuongtac on\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );
    }

    // SYNC: Thêm mới + Xóa người rời
    const syncResult = await fullSyncMembers(api, threadID, groupData);

    // Đọc lại sau sync
    groupData = getGroupData(threadID);
    const members = groupData.members || [];

    if (members.length === 0) {
        return api.sendMessage(`⚠️ Không có thành viên nào trong database`, threadID, messageID);
    }

    // Sắp xếp theo ngày giảm dần
    const sortedMembers = [...members].sort((a, b) => (b.day || 0) - (a.day || 0));

    // Tạo danh sách
    let lines = [];
    for (let i = 0; i < sortedMembers.length; i++) {
        const m = sortedMembers[i];
        const userName = global.data.userName.get(m.id) || "User";
        const lastTime = m.lastInteract || "-";
        lines.push(`${i + 1}. ${userName} | Ngày: ${m.day || 0} | Tuần: ${m.week || 0} | Cuối: ${lastTime}`);
    }

    const statusText = isEnabled ? "✅ BẬT" : "❌ TẮT";

    // Thông báo sync
    let syncMsg = "";
    if (syncResult.addedCount > 0 || syncResult.removedCount > 0) {
        syncMsg = `🔄 Sync: +${syncResult.addedCount} mới, -${syncResult.removedCount} rời\n`;
    }

    const message =
        `[ TƯƠNG TÁC NHÓM ]\n` +
        `────────────────────\n` +
        syncMsg +
        lines.join('\n') +
        `\n────────────────────\n` +
        `👥 Tổng: ${members.length} | Auto: ${statusText}\n` +
        `⏰ ${time}`;

    return api.sendMessage(message, threadID, messageID);
};
