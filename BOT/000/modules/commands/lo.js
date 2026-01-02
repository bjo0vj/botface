const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "lo",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Bot",
  description: "Gửi ảnh lò chè ô ngẫu nhiên",
  commandCategory: "Người dùng",
  usages: "[lo/locheo]",
  cooldowns: 5
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body } = event;

  if (!body) return;
  const lowerBody = body.toLowerCase().trim();

  // Kiểm tra nếu tin nhắn là "lo", "locheo", "lọ", "lọ chéo", etc.
  const validCommands = ["lo", "locheo", "lọ", "lọ chéo", "lọ cheo", "lo chéo", "lo cheo"];
  if (validCommands.includes(lowerBody)) {
    const imageDir = path.join(__dirname, 'data', 'locheo');

    try {
      // Đọc tất cả ảnh trong thư mục
      const files = fs.readdirSync(imageDir).filter(file =>
        ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
      );

      if (files.length === 0) {
        return api.sendMessage("❌ Không có ảnh nào trong bộ sưu tập!", threadID, messageID);
      }

      // Chọn ngẫu nhiên 1 ảnh
      const randomFile = files[Math.floor(Math.random() * files.length)];
      const attachment = fs.createReadStream(path.join(imageDir, randomFile));

      return api.sendMessage({
        body: "🔥 Ảnh lò chè ô đây của bạn! 🔥",
        attachment: attachment
      }, threadID, messageID);

    } catch (error) {
      console.error('Lỗi khi gửi ảnh locheo:', error);
      return api.sendMessage("❌ Có lỗi xảy ra khi lấy ảnh!", threadID, messageID);
    }
  }
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;
  const imageDir = path.join(__dirname, 'data', 'locheo');

  try {
    // Đọc tất cả ảnh trong thư mục
    const files = fs.readdirSync(imageDir).filter(file =>
      ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
    );

    if (files.length === 0) {
      return api.sendMessage("❌ Không có ảnh nào trong bộ sưu tập!", threadID, messageID);
    }

    // Chọn ngẫu nhiên 1 ảnh
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const attachment = fs.createReadStream(path.join(imageDir, randomFile));

    return api.sendMessage({
      body: "🔥 Ảnh lò chè ô đây của bạn! 🔥",
      attachment: attachment
    }, threadID, messageID);

  } catch (error) {
    console.error('Lỗi khi gửi ảnh locheo:', error);
    return api.sendMessage("❌ Có lỗi xảy ra khi lấy ảnh!", threadID, messageID);
  }
};
