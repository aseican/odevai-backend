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

// --- 1. JPG to PDF (PDF-LIB ile - DOCKERSIZ & HIZLI) ---
exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Resim yüklenmedi" });

  try {
    const pdfDoc = await PDFDocument.create();
    
    let image;
    const isPng = req.file.mimetype === 'image/png';
    
    if (isPng) {
      image = await pdfDoc.embedPng(req.file.buffer);
    } else {
      image = await pdfDoc.embedJpg(req.file.buffer);
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0, y: 0,
      width: image.width, height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    
    const finalName = getDownloadName(req.file.originalname, "pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error("JPG->PDF Hatası:", error);
    res.status(500).json({ message: "Resim dönüştürme hatası" });
  }
};

// --- 2. WORD to PDF (LibreOffice ile - NO DOCKER) ---
exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word dosyası yüklenmedi" });
  
  const { inputPath, outputPath } = getSafePaths(req, "pdf");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    // Linux/Windows uyumlu geçici klasör ayarı
    const uniqueEnv = `file:///tmp/LO_W2P_${Date.now()}`;
    
    // Komut: LibreOffice'i 'headless' (arayüzsüz) modda çalıştır
    const command = `${LIBREOFFICE_PATH} -env:UserInstallation="${uniqueEnv}" --headless --convert-to pdf "${inputPath}" --outdir "${UPLOADS_DIR}"`;
    
    console.log("LibreOffice Çalışıyor (Word -> PDF)...");

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("LibreOffice Hatası:", err);
        return res.status(500).json({ message: "Dönüştürme başarısız (LibreOffice kurulu mu?)" });
      }

      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ message: "PDF oluşturulamadı." });
      }

      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    });
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

// --- 3. PDF to WORD (Python ile - GÜNCELLENDİ) ---
exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "docx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);
    
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    // DİKKAT: Araya 'convert' parametresini ekledik!
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" convert "${inputPath}" "${outputPath}"`;

    console.log("PDF->Word Python Başlatılıyor:", command);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Python Hatası (PDF->Word):", stderr || err);
        // Detaylı hata görmek için stdout da basalım
        console.log("Python Çıktısı:", stdout);
        return res.status(500).json({ message: "Dönüştürme başarısız." });
      }

      if (!fs.existsSync(outputPath)) {
         console.error("Word dosyası oluşmadı. Çıktı:", stdout);
         return res.status(500).json({ message: "Word dosyası oluşmadı." });
      }
      
      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "docx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buffer);
    });
  } catch (error) { 
      console.error("Controller Hatası:", error);
      res.status(500).json({ message: "Hata" }); 
  }
};

// --- 4. PDF to EXCEL (Python ile - GÜNCELLENDİ) ---
exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  const { inputPath, outputPath } = getSafePaths(req, "xlsx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    // DİKKAT: Araya 'convert' parametresini ekledik!
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" convert "${inputPath}" "${outputPath}"`;
    
    console.log("Python Çalışıyor (PDF -> Excel)...");

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Python Hatası (PDF->Excel):", stderr || err);
        return res.status(500).json({ message: "Dönüştürme başarısız (Tablo bulunamadı)." });
      }

      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ message: "Excel dosyası oluşturulamadı." });
      }

      const buffer = fs.readFileSync(outputPath);
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "xlsx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    });
  } catch (error) { 
    console.error("Genel Hata:", error);
    res.status(500).json({ message: "Hata" }); 
  }
};