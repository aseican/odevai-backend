const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

// TAM YOL (Absolute Path)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
// Python scriptinin yerini tam belirtiyoruz
const PYTHON_SCRIPT = path.join(process.cwd(), "convert_script.py");

if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}

const getSafePaths = (req, targetExt) => {
  const timestamp = Date.now();
  const safeInputName = `${timestamp}${path.extname(req.file.originalname)}`;
  const safeOutputName = `${timestamp}.${targetExt}`;
  const inputPath = path.join(UPLOADS_DIR, safeInputName);
  const outputPath = path.join(UPLOADS_DIR, safeOutputName);
  return { inputPath, outputPath };
};

const getDownloadName = (originalName, targetExt) => {
  const nameWithoutExt = path.parse(originalName).name;
  const cleanName = nameWithoutExt.replace(/\s+/g, "-");
  return `odevai_${cleanName}.${targetExt}`;
};

// --- 1. PDF to WORD (PYTHON İLE - YÜKSEK KALİTE) ---
exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  console.log("--> PDF to Word (Python) isteği geldi:", req.file.originalname);

  const { inputPath, outputPath } = getSafePaths(req, "docx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    // Python komutunu çalıştırıyoruz
    // python3 convert_script.py "girdi.pdf" "cikti.docx"
    const command = `python3 "${PYTHON_SCRIPT}" "${inputPath}" "${outputPath}"`;
    
    console.log("Python Çalıştırılıyor:", command);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Python Hatası:", err);
        console.error("Stderr:", stderr); // Python hatasını görelim
        return res.status(500).json({ message: "Dönüştürme başarısız (Python)." });
      }

      // Python çıktısını kontrol et
      if (stdout) console.log("Python Çıktısı:", stdout);

      if (!fs.existsSync(outputPath)) {
        console.error("HATA: Dosya oluşmadı.");
        return res.status(500).json({ message: "Dosya oluşturulamadı." });
      }

      console.log("BAŞARILI: Word dosyası hazır ->", outputPath);
      const buffer = fs.readFileSync(outputPath);
      
      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}

      const finalName = getDownloadName(req.file.originalname, "docx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buffer);
    });
  } catch (error) {
    console.error("Genel Hata:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

// --- 2. WORD to PDF (LibreOffice) ---
exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "pdf");
  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    const uniqueEnv = `file:///tmp/LO_W2P_${Date.now()}`;
    const command = `soffice "-env:UserInstallation=${uniqueEnv}" --headless --convert-to pdf "${inputPath}" --outdir "${UPLOADS_DIR}"`;

    exec(command, (err) => {
      if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      const finalName = getDownloadName(req.file.originalname, "pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    });
  } catch (error) { res.status(500).json({ message: "Hata" }); }
};

// --- 3. PDF to EXCEL (LibreOffice) ---
exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "xlsx");
  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    const uniqueEnv = `file:///tmp/LO_P2E_${Date.now()}`;
    const command = `soffice "-env:UserInstallation=${uniqueEnv}" --headless --infilter="writer_pdf_import" --convert-to xlsx "${inputPath}" --outdir "${UPLOADS_DIR}"`;

    exec(command, (err) => {
      if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      const finalName = getDownloadName(req.file.originalname, "xlsx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    });
  } catch (error) { res.status(500).json({ message: "Hata" }); }
};

// --- 4. JPG to PDF (ImageMagick) ---
exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "JPG yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "pdf");
  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    const command = `convert "${inputPath}" "${outputPath}"`;
    exec(command, (err) => {
      if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      const finalName = getDownloadName(req.file.originalname, "pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    });
  } catch (error) { res.status(500).json({ message: "Hata" }); }
};