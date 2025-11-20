const multer = require("multer");

// Dosyaları önce RAM'e (Hafızaya) alıyoruz, sonra işleyip sileceğiz.
// Bu yöntem sunucuda çöp dosya birikmesini engeller.
const storage = multer.memoryStorage();

// 50 MB Limit ve Sadece PDF/Görsel kontrolü (Opsiyonel)
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = upload;