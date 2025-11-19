const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

// Yardımcı Fonksiyon: Güvenli dosya yolları oluşturur
const getSafePaths = (req, targetExt) => {
  const timestamp = Date.now();
  
  // Sunucuda işlem yapmak için GÜVENLİ (Sayısal) isim kullanıyoruz
  // Bu sayede "Dosya bulunamadı" hatası asla almazsın.
  const safeInputName = `${timestamp}${path.extname(req.file.originalname)}`;
  const safeOutputName = `${timestamp}.${targetExt}`;
  
  const inputPath = path.join("uploads", safeInputName);
  const outputPath = path.join("uploads", safeOutputName);

  return { inputPath, outputPath };
};

// Yardımcı Fonksiyon: Kullanıcıya gönderilecek "Markalı" isim
const getDownloadName = (originalName, targetExt) => {
  // Dosya ismindeki uzantıyı (.pdf) temizle
  const nameWithoutExt = path.parse(originalName).name;
  
  // Boşlukları tire (-) ile değiştir ki daha düzgün dursun
  const cleanName = nameWithoutExt.replace(/\s+/g, "-");

  // Senin istediğin format: odevai_dosyaismi.docx
  return `odevai_${cleanName}.${targetExt}`;
};

exports.pdfToWord = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

  const { inputPath, outputPath } = getSafePaths(req, "docx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    exec(`soffice --headless --convert-to docx "${inputPath}" --outdir uploads`, (err) => {
      if (err) {
        console.error("LibreOffice Hatası:", err);
        return res.status(500).json({ message: "Dönüştürme hatası" });
      }

      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ message: "Dosya oluşturulamadı." });
      }

      const buffer = fs.readFileSync(outputPath);

      // Temizlik
      try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}

      // --- İŞTE BURASI SENİN İSTEDİĞİN KISIM ---
      const finalName = getDownloadName(req.file.originalname, "docx");
      
      // Türkçe karakterler dosya ismini bozmasın diye encode ediyoruz
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buffer);
    });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

exports.wordToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Word yüklenmedi" });

  const { inputPath, outputPath } = getSafePaths(req, "pdf");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`soffice --headless --convert-to pdf "${inputPath}" --outdir uploads`, (err) => {
    if (err) return res.status(500).json({ message: "Word → PDF hatası" });

    if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });

    const buffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}

    // Markalı İsim
    const finalName = getDownloadName(req.file.originalname, "pdf");

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  });
};

exports.pdfToExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

  const { inputPath, outputPath } = getSafePaths(req, "xlsx");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`soffice --headless --convert-to xlsx "${inputPath}" --outdir uploads`, (err) => {
    if (err) return res.status(500).json({ message: "PDF → Excel hatası" });

    if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });

    const buffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}

    // Markalı İsim
    const finalName = getDownloadName(req.file.originalname, "xlsx");

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });
};

exports.jpgToPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "JPG yüklenmedi" });

  const { inputPath, outputPath } = getSafePaths(req, "pdf");

  fs.writeFileSync(inputPath, req.file.buffer);

  exec(`convert "${inputPath}" "${outputPath}"`, (err) => {
    if (err) return res.status(500).json({ message: "JPG → PDF hatası" });

    if (!fs.existsSync(outputPath)) return res.status(500).json({ message: "Dosya oluşturulamadı" });

    const buffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) {}

    // Markalı İsim
    const finalName = getDownloadName(req.file.originalname, "pdf");

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  });
};
// Son guncelleme kontrolu: v3