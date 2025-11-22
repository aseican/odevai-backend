const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { PDFDocument } = require("pdf-lib");

// --- AYARLAR ---
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const PYTHON_SCRIPT = path.join(process.cwd(), "convert_script.py");

// LibreOffice Yolu (Linux ve Windows uyumlu)
const LIBREOFFICE_PATH = process.platform === "win32" 
  ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"' 
  : "soffice"; 

if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}

// --- YARDIMCI FONKSİYONLAR ---

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

// --- 1. PDF to WORD (PYTHON İLE - DETAYLI LOGLU) ---
exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  
  console.log("--> PDF to Word isteği geldi:", req.file.originalname);
  
  const { inputPath, outputPath } = getSafePaths(req, "docx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    console.log("1. Dosya kaydedildi:", inputPath);

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    
    // KOMUTU OLUŞTURUYORUZ
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" convert "${inputPath}" "${outputPath}"`;
    
    console.log("2. Python Başlatılıyor. Komut:", command);

    exec(command, (err, stdout, stderr) => {
      // Python çıktısını her durumda logla
      if (stdout) console.log("Python STDOUT:", stdout);
      if (stderr) console.error("Python STDERR:", stderr);

      if (err) {
        console.error("!!! PYTHON ÇALIŞTIRMA HATASI !!!");
        console.error(err);
        return res.status(500).json({ message: "Dönüştürme işlemi başarısız oldu." });
      }

      if (!fs.existsSync(outputPath)) {
         console.error("HATA: İşlem bitti ama Word dosyası oluşmadı.");
         return res.status(500).json({ message: "Word dosyası oluşturulamadı." });
      }
      
      console.log("3. Başarılı! Word dosyası gönderiliyor.");
      const buffer = fs.readFileSync(outputPath);
      
      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "docx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buffer);
    });
  } catch (error) { 
      console.error("Controller Genel Hata:", error);
      res.status(500).json({ message: "Sunucu içi hata." }); 
  }
};

// --- 2. WORD to PDF (LibreOffice) ---
exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word dosyası yüklenmedi" });
  
  const { inputPath, outputPath } = getSafePaths(req, "pdf");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    const uniqueEnv = `file:///tmp/LO_W2P_${Date.now()}`;
    const command = `${LIBREOFFICE_PATH} -env:UserInstallation="${uniqueEnv}" --headless --convert-to pdf "${inputPath}" --outdir "${UPLOADS_DIR}"`;
    
    exec(command, (err) => {
      if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "PDF oluşmadı." });
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    });
  } catch (error) { res.status(500).json({ message: "Hata" }); }
};

// --- 3. PDF to EXCEL (Python) ---
exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "xlsx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" convert "${inputPath}" "${outputPath}"`;
    
    exec(command, (err) => {
      if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Excel oluşmadı." });
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "xlsx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    });
  } catch (error) { res.status(500).json({ message: "Hata" }); }
};

// --- 4. JPG to PDF (PDF-LIB) ---
exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Resim yüklenmedi" });
  try {
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(req.file.buffer);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const pdfBytes = await pdfDoc.save();
    const finalName = getDownloadName(req.file.originalname, "pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) { res.status(500).json({ message: "Resim hatası" }); }
};