const pdfParse = require("pdf-parse");
const User = require("../models/User");
const { consumeCredits } = require("../utils/credits");
const { callOpenAI } = require("../services/aiService");


// --- PDF ÖZETLEME ---
const aiPdfSummary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "PDF dosyası yüklenmedi" });
    }

    // PDF'ten metin çıkar
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);

    const text = pdfData.text?.trim() || "";

    if (!text || text.length < 10) {
      return res.status(400).json({
        message: "PDF içinde kullanılabilir metin bulunamadı."
      });
    }

    // Kredi tüket
    const user = await consumeCredits(req.user.id, 1);

    // AI ÖZET ÜRET
    const prompt = `
Aşağıdaki PDF metnini, akademik ve anlaşılır şekilde özetle:

${text}
    `;

    const aiResponse = await callOpenAI(prompt);

    return res.json({
      content: aiResponse,
      credits: user.credits
    });

  } catch (err) {
    console.error("PDF Summary Hatası:", err);
    return res.status(500).json({ 
      message: "PDF özetleme sırasında hata oluştu",
      error: err.message 
    });
  }
};


module.exports = {
  aiPdfSummary,
  // diğer fonksiyonlar...
};
