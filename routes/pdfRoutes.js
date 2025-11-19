const express = require("express");
const router = express.Router();

// Middleware'ler
const { protect } = require("../middleware/authMiddleware"); // Giriş zorunlu
const upload = require("../middleware/upload"); // Dosya yükleme (Multer)

// Controller (Az önce düzelttiğimiz dosya)
const { 
  pdfToWord, 
  wordToPdf, 
  pdfToExcel, 
  jpgToPdf 
} = require("../controllers/pdfController");

// Rotalar (Sadece Giriş Şart, Kredi Düşmez)
router.post("/pdf-to-word", protect, upload.single("file"), pdfToWord);
router.post("/word-to-pdf", protect, upload.single("file"), wordToPdf);
router.post("/pdf-to-excel", protect, upload.single("file"), pdfToExcel);
router.post("/jpg-to-pdf",  protect, upload.single("file"), jpgToPdf);

module.exports = router;