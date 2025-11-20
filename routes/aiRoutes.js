const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // Multer (Dosya Yükleme) Middleware

// Controller'dan Yeni ve Güçlendirilmiş Fonksiyonları Çekiyoruz
const { 
  generateHomework, 
  generatePdfSummary, 
  generatePdfQuestions, 
  generatePdfToPresentationText, 
  generatePresentation 
} = require("../controllers/aiController");

/* ==========================================================================
   AI ROTALARI (Endpoints)
   Hepsi korumalıdır (protect middleware), yani giriş yapmadan kullanılamaz.
   ========================================================================== */

// 1. Ödev Oluşturma
// URL: /api/ai/homework
router.post("/homework", protect, generateHomework);

// 2. PDF Özetleme (Dosya Yüklemeli)
// URL: /api/ai/pdf-summary
router.post("/pdf-summary", protect, upload.single("file"), generatePdfSummary);

// 3. PDF Soru Üretme (Dosya Yüklemeli)
// URL: /api/ai/pdf-questions
router.post("/pdf-questions", protect, upload.single("file"), generatePdfQuestions);

// 4. PDF'ten Sunum Metni Çıkarma (TED Talk Tarzı - Dosya Yüklemeli)
// URL: /api/ai/pdf-to-text
router.post("/pdf-to-text", protect, upload.single("file"), generatePdfToPresentationText);

// 5. Sunum Oluşturma (JSON Döner -> Frontend PPTX Yapar)
// URL: /api/ai/create-presentation
router.post("/create-presentation", protect, generatePresentation);

module.exports = router;