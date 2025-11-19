const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const {
  pdfToWord,
  wordToPdf,
  jpgToPdf,
  pdfToExcel
} = require("../controllers/pdfController");

const { protect } = require("../middleware/auth");

router.post("/pdf-to-word", protect, upload.single("file"), pdfToWord);
router.post("/word-to-pdf", protect, upload.single("file"), wordToPdf);
router.post("/jpg-to-pdf", protect, upload.single("file"), jpgToPdf);
router.post("/pdf-to-excel", protect, upload.single("file"), pdfToExcel);

module.exports = router;
