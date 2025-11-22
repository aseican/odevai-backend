const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Klasör yoksa oluştur
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Depolama Ayarı
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Benzersiz isim ver: timestamp + orijinal uzantı
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Dosya Filtresi (Sadece PDF ve Resimlere izin ver)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf", 
    "image/jpeg", 
    "image/png", 
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Word
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Hata fırlatma, sadece reddet (req.file undefined olur)
    console.log("Multer Reddedilen Dosya Tipi:", file.mimetype);
    cb(null, false); 
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB (Burası düşükse büyük PDF'ler 400 hatası verir!)
  },
});

module.exports = upload;