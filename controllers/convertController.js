const { PDFDocument } = require("pdf-lib");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Geçici klasör
const tempDir = path.join(__dirname, "..", "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

/* -----------------------------
   PDF → WORD (docx)
------------------------------ */
exports.pdfToWord = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const tempPdf = path.join(tempDir, Date.now() + ".pdf");
    const tempDocx = tempPdf.replace(".pdf", ".docx");

    fs.writeFileSync(tempPdf, req.file.buffer);

    exec(`soffice --headless --convert-to docx "${tempPdf}" --outdir "${tempDir}"`, (err) => {
      if (err) return res.status(500).json({ message: "Dönüştürme hatası", error: err });

      const fileBuffer = fs.readFileSync(tempDocx);
      fs.unlinkSync(tempPdf);
      fs.unlinkSync(tempDocx);

      res.setHeader("Content-Disposition", "attachment; filename=convert.docx");
      res.send(fileBuffer);
    });
  } catch (e) {
    res.status(500).json({ message: "Hata", error: e.message });
  }
};

/* -----------------------------
   WORD → PDF
------------------------------ */
exports.wordToPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Word dosyası yok" });

    const tempDoc = path.join(tempDir, Date.now() + ".docx");
    const tempPdf = tempDoc.replace(".docx", ".pdf");

    fs.writeFileSync(tempDoc, req.file.buffer);

    exec(`soffice --headless --convert-to pdf "${tempDoc}" --outdir "${tempDir}"`, (err) => {
      if (err) return res.status(500).json({ message: "Dönüştürme hatası", error: err });

      const buffer = fs.readFileSync(tempPdf);

      fs.unlinkSync(tempDoc);
      fs.unlinkSync(tempPdf);

      res.setHeader("Content-Disposition", "attachment; filename=convert.pdf");
      res.send(buffer);
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* -----------------------------
   PDF → EXCEL
------------------------------ */
exports.pdfToExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yok" });

    const tempPdf = path.join(tempDir, Date.now() + ".pdf");
    const tempXlsx = tempPdf.replace(".pdf", ".xlsx");
    fs.writeFileSync(tempPdf, req.file.buffer);

    exec(`soffice --headless --convert-to xlsx "${tempPdf}" --outdir "${tempDir}"`, (err) => {
      if (err) return res.status(500).json({ message: "Dönüştürme hatası", error: err });

      const buffer = fs.readFileSync(tempXlsx);

      fs.unlinkSync(tempPdf);
      fs.unlinkSync(tempXlsx);

      res.setHeader("Content-Disposition", "attachment; filename=convert.xlsx");
      res.send(buffer);
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* -----------------------------
   JPG → PDF
------------------------------ */
exports.jpgToPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "JPG yok" });

    const pdfDoc = await PDFDocument.create();
    const img = await pdfDoc.embedJpg(req.file.buffer);

    pdfDoc.addPage([img.width, img.height]).drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
