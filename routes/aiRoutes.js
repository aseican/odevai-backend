const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // Multer upload middleware'in (Dosya yükleme için)

// Controller'dan YENİ ve GÜÇLENDİRİLMİŞ fonksiyon isimlerini çekiyoruz
const { 
  generateHomework, 
  generatePdfSummary, 
  generatePdfQuestions, 
  generatePdfToPresentationText, 
  generatePresentation 
} = require("../controllers/aiController");

// --- ROTALAR ---

// 1. Ödev Oluşturma (Master Promptlu)
router.post("/homework", protect, generateHomework);

// 2. PDF İşlemleri (Dosya yüklemesi olduğu için 'upload.single' kullanıyoruz)
router.post("/pdf-summary", protect, upload.single("file"), generatePdfSummary);
router.post("/pdf-questions", protect, upload.single("file"), generatePdfQuestions);
router.post("/pdf-to-text", protect, upload.single("file"), generatePdfToPresentationText); // TED Talk tarzı metin için

// 3. Sunum Oluşturma (PPTX İndirme)
router.post("/create-presentation", protect, generatePresentation);

module.exports = router;