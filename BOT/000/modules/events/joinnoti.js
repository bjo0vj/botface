module.exports.config = {
    name: "join",
    eventType: ["log:subscribe"],
    version: "1.0.0",
    credits: "TDF-2803",
    description: "Thong bao nguoi vao nhom"
};

module.exports.run = async function ({ api, event }) {
    const { threadID } = event;
    const botID = api.getCurrentUserID();
    const botName = global.config.BOTNAME || "TDF-2803";
    const prefix = global.config.PREFIX || "/";

    try {
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == botID)) {
            api.changeNickname("[ " + prefix + " ] " + botName, threadID, botID);
            return api.sendMessage("Ket noi thanh cong! Dung " + prefix + "menu de xem lenh.", threadID);
        } else {
            var names = [];
            for (var i = 0; i < event.logMessageData.addedParticipants.length; i++) {
                names.push(event.logMessageData.addedParticipants[i].fullName);
            }
            return api.sendMessage("Chao mung " + names.join(", ") + " den voi nhom!", threadID);
        }
    } catch (e) {
        console.log("Loi join:", e.message);
    }
}
