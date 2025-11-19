const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

  const inputPath = `uploads/${Date.now()}-${req.file.originalname}`;
  const outputPath = inputPath.replace(".pdf", ".docx");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`soffice --headless --convert-to docx "${inputPath}" --outdir uploads`, (err) => {
    if (err) return res.status(500).json({ message: "PDF → Word hatası", error: err });

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.setHeader("Content-Disposition", "attachment; filename=converted.docx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  });
};

exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word yüklenmedi" });

  const inputPath = `uploads/${Date.now()}-${req.file.originalname}`;
  const outputPath = inputPath.replace(".docx", ".pdf");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads`, (err) => {
    if (err) return res.status(500).json({ message: "Word → PDF hatası", error: err });

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  });
};

exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "JPG yüklenmedi" });

  const inputPath = `uploads/${Date.now()}-${req.file.originalname}`;
  const outputPath = inputPath.replace(".jpg", ".pdf");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`convert "${inputPath}" "${outputPath}"`, (err) => {
    if (err) return res.status(500).json({ message: "JPG → PDF hatası", error: err });

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  });
};

exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

  const inputPath = `uploads/${Date.now()}-${req.file.originalname}`;
  const outputPath = inputPath.replace(".pdf", ".xlsx");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`soffice --headless --convert-to xlsx "${inputPath}" --outdir uploads`, (err) => {
    if (err) return res.status(500).json({ message: "PDF → Excel hatası", error: err });

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.setHeader("Content-Disposition", "attachment; filename=converted.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });
};
