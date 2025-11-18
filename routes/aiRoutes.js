const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

// Middleware
const { protect } = require("../middleware/auth");

// Controller
const {
  aiHomework,
  aiPdfSummary,
  aiPdfQuestions,
  aiPdfExtract,
  aiPdfPresentationToText,
  aiCreatePresentation
} = require("../controllers/aiController");

/* -------------------- AI ROUTES -------------------- */

// 1) Ödev Oluşturma
router.post("/homework", protect, aiHomework);

// 2) PDF Özetleme
router.post("/pdf-summary", protect, upload.single("file"), aiPdfSummary);

// 3) PDF → Soru Üretme
router.post("/pdf-questions", protect, upload.single("file"), aiPdfQuestions);

// 4) PDF → Metin Çıkarma
router.post("/pdf-extract", protect, upload.single("file"), aiPdfExtract);

// 5) PDF → Sunumdan Metin Çıkarma
router.post("/pdf-presentation-to-text", protect, upload.single("file"), aiPdfPresentationToText);

// 6) Sunum Oluşturucu
router.post("/create-presentation", protect, upload.single("file"), aiCreatePresentation);
router.post("/create-presentation", protect, aiCreatePresentation);


module.exports = router;
