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

// Uploads klasörü yoksa oluştur
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}

// --- YARDIMCI: İndirme İsmi Oluşturucu ---
const getDownloadName = (originalName, targetExt) => {
  const nameWithoutExt = path.parse(originalName).name;
  const cleanName = nameWithoutExt.replace(/\s+/g, "-");
  return `odevai_${cleanName}.${targetExt}`;
};

/* ==========================================================================
   1. JPG to PDF (PDF-LIB - DİSK MODU)
   ========================================================================== */
exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Resim yüklenmedi" });

  const inputPath = req.file.path; // Multer zaten kaydetti

  try {
    const pdfDoc = await PDFDocument.create();
    
    // Dosyayı diskten oku
    const imageBuffer = fs.readFileSync(inputPath);
    
    let image;
    const isPng = req.file.mimetype === 'image/png';
    
    if (isPng) {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      image = await pdfDoc.embedJpg(imageBuffer);
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0, y: 0,
      width: image.width, height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    
    // Temizlik (Yüklenen resmi sil)
    try { fs.unlinkSync(inputPath); } catch (e) {}

    const finalName = getDownloadName(req.file.originalname, "pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error("JPG->PDF Hatası:", error);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    res.status(500).json({ message: "Resim dönüştürme hatası" });
  }
};

/* ==========================================================================
   2. WORD to PDF (LibreOffice - DİSK MODU)
   ========================================================================== */
exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word dosyası yüklenmedi" });
  
  const inputPath = req.file.path; // Multer kaydetti
  
  // LibreOffice çıktıyı input ile aynı yere, aynı isimle (uzantısı pdf olarak) atar.
  const expectedOutputPath = inputPath.replace(path.extname(inputPath), ".pdf");

  try {
    const uniqueEnv = `file:///tmp/LO_W2P_${Date.now()}`;
    const command = `${LIBREOFFICE_PATH} -env:UserInstallation="${uniqueEnv}" --headless --convert-to pdf "${inputPath}" --outdir "${UPLOADS_DIR}"`;
    
    console.log("LibreOffice Çalışıyor...");

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("LibreOffice Hatası:", err);
        return res.status(500).json({ message: "Dönüştürme başarısız." });
      }

      // LibreOffice çıktıyı oluşturdu mu?
      if (!fs.existsSync(expectedOutputPath)) {
        console.error("PDF oluşmadı. Çıktı:", stdout);
        return res.status(500).json({ message: "PDF oluşturulamadı." });
      }

      const buffer = fs.readFileSync(expectedOutputPath);
      
      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(expectedOutputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    });
  } catch (error) {
    console.error("Hata:", error);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/* ==========================================================================
   3. PDF to WORD (Python - DİSK MODU)
   ========================================================================== */
exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  
  console.log("--> PDF to Word isteği geldi:", req.file.originalname);

  const inputPath = req.file.path; // Multer kaydetti
  const outputPath = path.join(UPLOADS_DIR, `${Date.now()}.docx`);

  try {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    // Komut: python3 script.py convert input.pdf output.docx
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" convert "${inputPath}" "${outputPath}"`;
    
    console.log("Python Başlatılıyor:", command);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Python Çalıştırma Hatası:", err);
        // Hatayı detaylı görelim
        if (stderr) console.error("STDERR:", stderr);
        return res.status(500).json({ message: "Dönüştürme başarısız." });
      }

      if (!fs.existsSync(outputPath)) {
         console.error("Word dosyası oluşmadı. Çıktı:", stdout);
         return res.status(500).json({ message: "Word dosyası oluşmadı." });
      }
      
      const buffer = fs.readFileSync(outputPath);
      
      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "docx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buffer);
    });
  } catch (error) { 
      console.error("Controller Hatası:", error);
      try { fs.unlinkSync(inputPath); } catch (e) {}
      res.status(500).json({ message: "Hata" }); 
  }
};

/* ==========================================================================
   4. PDF to EXCEL (Python - DİSK MODU)
   ========================================================================== */
exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
  
  const inputPath = req.file.path;
  const outputPath = path.join(UPLOADS_DIR, `${Date.now()}.xlsx`);

  try {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
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
      
      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}
      
      const finalName = getDownloadName(req.file.originalname, "xlsx");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    });
  } catch (error) { 
    console.error("Genel Hata:", error);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    res.status(500).json({ message: "Hata" }); 
  }
};