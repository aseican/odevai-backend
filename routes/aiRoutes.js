const express = require("express");
const router = express.Router();

// --- MIDDLEWARE ---
// Doğru dosya isimlerini kullanıyoruz
const { protect } = require("../middleware/authMiddleware"); 
const upload = require("../middleware/upload"); // Merkezi upload ayarı

// --- CONTROLLER ---
const {
  aiHomework,
  aiPdfSummary,
  aiPdfQuestions,
  aiPdfExtract,
  aiPdfPresentationToText,
  aiCreatePresentation
} = require("../controllers/aiController");

/* -------------------- AI ROUTES -------------------- */

// 1) Ödev Oluşturma (Sadece Metin/JSON, dosya yok)
router.post("/homework", protect, aiHomework);

// 2) PDF Özetleme (Dosya yükleme var)
router.post("/pdf-summary", protect, upload.single("file"), aiPdfSummary);

// 3) PDF → Soru Üretme (Dosya yükleme var)
router.post("/pdf-questions", protect, upload.single("file"), aiPdfQuestions);

// 4) PDF → Metin Çıkarma (Dosya yükleme var)
router.post("/pdf-extract", protect, upload.single("file"), aiPdfExtract);

// 5) PDF Sunumdan Metin Çıkarma (Dosya yükleme var)
// Frontend'de genelde bu isimle çağrılır, tutarlı olsun diye düzelttim
router.post("/presentation-to-text", protect, upload.single("file"), aiPdfPresentationToText);

// 6) Sunum Oluşturucu (Sıfırdan konu ile)
// DİKKAT: Burada dosya yüklenmiyor, sadece konu (topic) gönderiliyor.
// O yüzden upload.single("file") middleware'ini kaldırdım.
router.post("/create-presentation", protect, aiCreatePresentation);

module.exports = router;