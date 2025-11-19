const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const { protect } = require("../middleware/auth");

const {
  pdfToWord,
  wordToPdf,
  pdfToExcel,
  jpgToPdf
} = require("../controllers/convertController");

// PDF → Word
router.post("/pdf-to-word", protect, upload.single("file"), pdfToWord);

// Word → PDF
router.post("/word-to-pdf", protect, upload.single("file"), wordToPdf);

// PDF → Excel
router.post("/pdf-to-excel", protect, upload.single("file"), pdfToExcel);

// JPG → PDF
router.post("/jpg-to-pdf", protect, upload.single("file"), jpgToPdf);

module.exports = router;
