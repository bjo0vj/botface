const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
    name: "websync",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Bot",
    description: "Đồng bộ dữ liệu lên web server (tự động)",
    commandCategory: "Admin",
    usages: "[on/off] - Bật/tắt auto sync lên Render",
    cooldowns: 5
};

const codePath = path.join(__dirname, "..", "..", "code.txt");
const autoCheckPath = path.join(__dirname, "data", "autoCheckTuongTac.json");
const tuongtacDataPath = path.join(__dirname, "tuongtac_data");

let syncInterval = null;
let isAutoSync = false;

// Đọc config
function getConfig() {
    try {
        if (fs.existsSync(codePath)) {
            const lines = fs.readFileSync(codePath, "utf8").split('\n').filter(l => l.trim());
            return {
                code: lines[0]?.trim(),
                password: lines[1]?.trim(),
                renderUrl: lines[2]?.trim()
            };
        }
    } catch (e) { }
    return null;
}

// Đọc danh sách nhóm đã bật
function getEnabledGroups() {
    try {
        if (fs.existsSync(autoCheckPath)) {
            return JSON.parse(fs.readFileSync(autoCheckPath, "utf8")).enabledThreads || {};
        }
    } catch (e) { }
    return {};
}

// Đọc thành viên nhóm
function getGroupMembers(threadID) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8")).members || [];
        }
    } catch (e) { }
    return [];
}

// Lưu dữ liệu nhóm
function saveGroupData(threadID, data) {
    const filePath = path.join(tuongtacDataPath, `${threadID}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}

// Gửi data lên Render
async function pushDataToRender(api) {
    const config = getConfig();
    if (!config || !config.renderUrl || config.renderUrl.includes('your-app')) {
        return { success: false, message: 'No Render URL' };
    }

    try {
        const enabledGroups = getEnabledGroups();
        const groups = {};
        const members = {};

        for (const [gid, info] of Object.entries(enabledGroups)) {
            if (info.enabled) {
                let groupName = gid;
                try {
                    const threadInfo = await api.getThreadInfo(gid);
                    groupName = threadInfo.name || gid;
                } catch (e) { }

                const memberList = getGroupMembers(gid);

                groups[gid] = {
                    name: groupName,
                    memberCount: memberList.length,
                    enabledAt: info.enabledAt,
                    enabledByName: info.enabledByName
                };

                members[gid] = memberList.map(m => ({
                    id: m.id,
                    name: global.data.userName.get(m.id) || "User",
                    day: m.day || 0,
                    week: m.week || 0,
                    total: m.total || 0,
                    lastInteract: m.lastInteract || "-"
                }));
            }
        }

        // Gửi lên Render
        await axios.post(`${config.renderUrl}/bot/update`, {
            code: config.code,
            groups,
            members
        });

        return { success: true, groupCount: Object.keys(groups).length };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// Kiểm tra và xử lý kick queue từ Render
async function processKickQueue(api) {
    const config = getConfig();
    if (!config || !config.renderUrl) return;

    try {
        const response = await axios.get(`${config.renderUrl}/bot/kicks?code=${config.code}`);
        const kicks = response.data.kicks || [];

        for (const kick of kicks) {
            try {
                await api.sendMessage(
                    `🚫 KICK TỪ WEB\n` +
                    `────────────────\n` +
                    `👤 ${kick.memberName}\n` +
                    `⏰ ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY")}`,
                    kick.groupId
                );

                await api.removeUserFromGroup(kick.memberId, kick.groupId);

                // Xóa khỏi database
                const dbPath = path.join(tuongtacDataPath, `${kick.groupId}.json`);
                if (fs.existsSync(dbPath)) {
                    const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
                    data.members = data.members.filter(m => m.id !== kick.memberId);
                    saveGroupData(kick.groupId, data);
                }

                console.log(`[WEBSYNC] Kicked ${kick.memberName}`);
            } catch (e) {
                console.log(`[WEBSYNC] Kick error: ${e.message}`);
            }
        }
    } catch (e) {
        // Silent
    }
}

// Kiểm tra và xử lý loaddata queue
async function processLoadQueue(api) {
    const config = getConfig();
    if (!config || !config.renderUrl) return;

    try {
        const response = await axios.get(`${config.renderUrl}/bot/loads?code=${config.code}`);
        const loads = response.data.loads || [];

        for (const load of loads) {
            try {
                const dbPath = path.join(tuongtacDataPath, `${load.groupId}.json`);
                if (!fs.existsSync(dbPath)) continue;

                let groupData = JSON.parse(fs.readFileSync(dbPath, "utf8"));

                const threadInfo = await api.getThreadInfo(load.groupId);
                const currentMemberIDs = threadInfo.participantIDs || [];

                // Xóa người đã rời
                groupData.members = groupData.members.filter(m => currentMemberIDs.includes(m.id));

                // Thêm người mới
                const afterIDs = groupData.members.map(m => m.id);
                for (const id of currentMemberIDs) {
                    if (!afterIDs.includes(id)) {
                        groupData.members.push({ id, day: 0, week: 0, total: 0, lastInteract: null });
                    }
                }

                groupData.lastSync = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
                saveGroupData(load.groupId, groupData);

                console.log(`[WEBSYNC] Loaded group ${load.groupId}`);
            } catch (e) { }
        }
    } catch (e) { }
}

// Bắt đầu auto sync
function startAutoSync(api) {
    if (syncInterval) clearInterval(syncInterval);

    isAutoSync = true;

    // Sync mỗi 30 giây
    syncInterval = setInterval(async () => {
        if (!isAutoSync) return;

        // Push data
        await pushDataToRender(api);

        // Process kick queue
        await processKickQueue(api);

        // Process load queue
        await processLoadQueue(api);

    }, 30000); // 30 giây

    console.log('[WEBSYNC] Auto sync started (every 30s)');
}

function stopAutoSync() {
    isAutoSync = false;
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
    console.log('[WEBSYNC] Auto sync stopped');
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    const option = args[0]?.toLowerCase();

    if (option === 'on') {
        startAutoSync(api);

        // Sync ngay lập tức
        const result = await pushDataToRender(api);

        return api.sendMessage(
            `[ WEB SYNC ]\n` +
            `────────────────────\n` +
            `✅ Đã BẬT auto sync!\n` +
            `🔄 Sync mỗi 30 giây\n` +
            `📊 Đã sync ${result.groupCount || 0} nhóm\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );
    } else if (option === 'off') {
        stopAutoSync();

        return api.sendMessage(
            `[ WEB SYNC ]\n` +
            `────────────────────\n` +
            `❌ Đã TẮT auto sync\n` +
            `────────────────────\n` +
            `⏰ ${time}`,
            threadID, messageID
        );
    } else {
        // Sync thủ công 1 lần
        const result = await pushDataToRender(api);

        if (result.success) {
            return api.sendMessage(
                `[ WEB SYNC ]\n` +
                `────────────────────\n` +
                `✅ Đã sync lên Render!\n` +
                `📊 Số nhóm: ${result.groupCount}\n` +
                `────────────────────\n` +
                `📌 Dùng:\n` +
                `• ${global.config.PREFIX}websync on - Bật auto sync\n` +
                `• ${global.config.PREFIX}websync off - Tắt auto sync\n` +
                `────────────────────\n` +
                `⏰ ${time}`,
                threadID, messageID
            );
        } else {
            return api.sendMessage(
                `❌ Lỗi sync: ${result.message}\n\n` +
                `📌 Kiểm tra:\n` +
                `1. Đã chạy /code [render_url] chưa?\n` +
                `2. Render đã deploy chưa?`,
                threadID, messageID
            );
        }
    }
};

// Auto start khi bot load
module.exports.onLoad = function ({ api }) {
    const config = getConfig();
    if (config && config.renderUrl && !config.renderUrl.includes('your-app')) {
        startAutoSync(api);
    }
};
