module.exports.config = {
	name: 'menu',
	version: '2.0.0',
	hasPermssion: 0,
	credits: 'TDF-2803 | zL: 0878139888',
	description: 'Xem danh sách tất cả chức năng của bot',
	commandCategory: 'Tiện ích',
	usages: '[tên lệnh | all | số thứ tự]',
	cooldowns: 3,
	usePrefix: true,
	images: [],
	envConfig: {
		autoUnsend: {
			status: true,
			timeOut: 120
		}
	}
};

const { autoUnsend = this.config.envConfig.autoUnsend } = global.config == undefined ? {} : global.config.menu == undefined ? {} : global.config.menu;
const { compareTwoStrings, findBestMatch } = require('string-similarity');

// Định nghĩa các nhóm chức năng (chỉ lệnh thực sự tồn tại)
const categories = {
	"🤖 AI & CHAT": {
		description: "Trò chuyện với AI thông minh",
		commands: ["ask", "ai", "sim", "autorep", "autotrans", "loppy"]
	},
	"🖼️ HÌNH ẢNH": {
		description: "Tạo, chỉnh sửa hình ảnh",
		commands: ["ảnh", "gái", "ghép", "vẽ", "tachnen", "cover", "taoanhbox", "4k", "imgur", "lo", "bantho"]
	},
	"🎵 GIẢI TRÍ": {
		description: "Nhạc, video, giải trí",
		commands: ["ytb", "scl", "lyrics", "vdanime", "vdcos", "vdgai", "vdtrai", "xnxx", "tiktok"]
	},
	"⚙️ QUẢN TRỊ NHÓM": {
		description: "Quản lý nhóm, thành viên",
		commands: ["kick", "adduser", "admin", "anti", "antispam", "rule", "setname", "pending", "tromthanhvien", "pin"]
	},
	"🛡️ BẢO MẬT": {
		description: "Chống spam, bảo vệ nhóm",
		commands: ["anti", "antispam", "batgiam"]
	},
	"💰 KINH TẾ & GAME": {
		description: "Game, kiếm tiền ảo",
		commands: ["bank", "money", "setmoney", "work", "taixiu", "bauucua", "tile"]
	},
	"📋 THÔNG TIN": {
		description: "Xem thông tin bot, nhóm, user",
		commands: ["info", "uid", "boxid", "uptime", "ping", "check", "listbox"]
	},
	"🔧 TIỆN ÍCH": {
		description: "Các công cụ hữu ích",
		commands: ["menu", "help", "getid", "dịch", "say", "note", "locdau", "getlink", "upload", "file", "contact", "shortcut", "gỡ"]
	},
	"📥 TẢI XUỐNG": {
		description: "Tải video, nhạc, file",
		commands: ["autodown3", "autoyt", "tiktok", "ytb", "scl"]
	},
	"⚡ ADMIN BOT": {
		description: "Lệnh dành cho Admin bot",
		commands: ["addadmin", "deleteadmin", "restart", "load", "shell", "run", "cmd", "code", "setprefix", "setting", "sendnoti", "out", "global", "rent", "doiacc", "buff", "cleardata", "spam", "spamping", "spamtag", "taglientuc"]
	},
	"🎲 KHÁC": {
		description: "Các lệnh khác",
		commands: ["hi", "danhgia", "event", "api", "crawl", "cc", "stk", "fl", "spt", "autody", "chuilientuc"]
	}
};

module.exports.run = async function ({ api, event, args }) {
	const moment = require("moment-timezone");
	const { sendMessage: send, unsendMessage: un } = api;
	const { threadID: tid, messageID: mid, senderID: sid } = event;
	const cmds = global.client.commands;
	const prefix = (global.data.threadData.get(tid) || {}).PREFIX || global.config.PREFIX || "/";
	const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");
	const botName = global.config.BOTNAME || "TDF-2803";

	// Nếu có tham số - hiển thị thông tin lệnh cụ thể
	if (args.length >= 1) {
		// Kiểm tra nếu là số - chọn nhóm
		if (!isNaN(args[0])) {
			const catKeys = Object.keys(categories);
			const index = parseInt(args[0]) - 1;
			if (index >= 0 && index < catKeys.length) {
				const catName = catKeys[index];
				const cat = categories[catName];
				let txt = `╔══════════════════╗\n   ${catName}\n╚══════════════════╝\n`;
				txt += `📝 ${cat.description}\n\n`;
				txt += `📋 DANH SÁCH LỆNH:\n`;
				cat.commands.forEach((cmd, i) => {
					const cmdInfo = cmds.get(cmd);
					if (cmdInfo) {
						txt += `${i + 1}. ${prefix}${cmd} - ${cmdInfo.config.description || "Không có mô tả"}\n`;
					}
				});
				txt += `\n⏰ Time: ${time}`;
				return send({ body: txt }, tid, (a, b) => {
					if (autoUnsend.status) setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, b.messageID);
				}, mid);
			}
		}

		// Kiểm tra nếu là "all" - hiển thị tất cả lệnh
		if (args[0].toLowerCase() === 'all') {
			const data = cmds.values();
			let txt = `╔══════════════════╗\n   📋 TẤT CẢ LỆNH\n╚══════════════════╝\n\n`;
			let count = 0;
			for (const cmd of data) {
				txt += `${++count}. ${prefix}${cmd.config.name} - ${cmd.config.description}\n`;
			}
			txt += `\n────────────────────\n`;
			txt += `📊 Tổng: ${count} lệnh\n`;
			txt += `⏰ Time: ${time}`;
			return send({ body: txt }, tid, (a, b) => {
				if (autoUnsend.status) setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, b.messageID);
			}, mid);
		}

		// Tìm kiếm lệnh cụ thể
		const cmdName = args.join(' ').toLowerCase();
		if (cmds.has(cmdName)) {
			const cmd = cmds.get(cmdName).config;
			const txt = `╔══════════════════╗\n   📖 CHI TIẾT LỆNH\n╚══════════════════╝\n\n` +
				`📌 Tên: ${cmd.name}\n` +
				`📝 Mô tả: ${cmd.description}\n` +
				`📂 Nhóm: ${cmd.commandCategory}\n` +
				`🔐 Quyền: ${getPermText(cmd.hasPermssion)}\n` +
				`⏳ Cooldown: ${cmd.cooldowns}s\n` +
				`📋 Cách dùng: ${prefix}${cmd.usages}\n` +
				`👤 Tác giả: ${cmd.credits}\n` +
				`📀 Version: ${cmd.version}`;
			return send({ body: txt }, tid, mid);
		}

		// Gợi ý lệnh tương tự
		const allCmds = Array.from(cmds.keys());
		const match = findBestMatch(cmdName, allCmds);
		if (match.bestMatch.rating >= 0.3) {
			return send(`❓ Không tìm thấy lệnh "${cmdName}"\n💡 Bạn có muốn nói "${match.bestMatch.target}" không?`, tid, mid);
		}
		return send(`❌ Không tìm thấy lệnh "${cmdName}"`, tid, mid);
	}

	// Hiển thị menu chính
	let txt = `━━━ 🤖 ${botName.toUpperCase()} ━━━\n\n`;
	txt += `👋 Danh sách chức năng:\n\n`;

	let count = 0;
	for (const [catName, cat] of Object.entries(categories)) {
		count++;
		txt += `${count}. ${catName} (${cat.commands.length})\n`;
	}

	txt += `\n━━━━━━━━━━━━━━━━\n`;
	txt += `📊 Tổng: ${cmds.size} lệnh | 🔹 Prefix: "${prefix}"\n`;
	txt += `⏰ ${time}\n\n`;
	txt += `💡 ${prefix}menu [1-${Object.keys(categories).length}] xem nhóm\n`;
	txt += `💡 ${prefix}menu all xem tất cả\n`;
	txt += `💡 ${prefix}menu [tên] xem chi tiết\n`;

	// console.log(`[DEBUG menu.js] Sending message to tid: ${tid}, mid: ${mid}`);
	return send({ body: txt }, tid, (err, info) => {
		// if (err) console.log(`[DEBUG menu.js] sendMessage error:`, err);
		// else console.log(`[DEBUG menu.js] sendMessage success, messageID: ${info?.messageID}`);
		if (autoUnsend.status && info?.messageID) setTimeout(v1 => un(v1), 1000 * autoUnsend.timeOut, info.messageID);
	}, mid);
};

function getPermText(perm) {
	switch (perm) {
		case 0: return "👤 Thành viên";
		case 1: return "👑 Quản trị viên nhóm";
		case 2: return "🔰 Admin Bot";
		case 3: return "⭐ Người điều hành";
		default: return "👤 Thành viên";
	}
}