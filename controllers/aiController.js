const pdfParse = require("pdf-parse");
const { callOpenAI } = require("../services/aiService");
const { consumeCredits } = require("../utils/credits");
const PptxGenJS = require("pptxgenjs");

// --- YARDIMCI FONKSİYONLAR ---

// Görsel Oluşturucu (Ücretsiz AI Image Generator kullanır)
// ChatGPT URL veremez, halüsinasyon görür. Bu yöntem gerçek resim üretir.
function generateImageUrl(keyword) {
  const encodedKey = encodeURIComponent(keyword);
  // Pollinations.ai ücretsiz ve key gerektirmeyen harika bir servistir
  return `https://image.pollinations.ai/prompt/${encodedKey}?width=1024&height=768&nologo=true`;
}

// JSON Temizleyici (AI bazen ```json ... ``` şeklinde verir, onu temizleriz)
function cleanJSON(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/* ---------------------------------- */
/* 1) ÖDEV OLUŞTURMA (GÜÇLENDİRİLMİŞ) */
/* ---------------------------------- */
exports.aiHomework = async (req, res) => {
  try {
    const { topic, level, length, style } = req.body;
    
    // Kredi düş
    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
GÖREV: Aşağıdaki kriterlere göre profesyonel, akademik ve özgün bir ödev hazırla.

KONU: ${topic}
SEVİYE: ${level} (Örn: Lise, Üniversite)
UZUNLUK: ${length}
ÜSLUP: ${style}

KURALLAR:
1. Giriş, Gelişme ve Sonuç bölümleri net olsun.
2. Konuyu derinlemesine ele al.
3. Asla yarım bırakma, cümleyi tamamla.
4. Markdown formatında yaz (Başlıklar # ile, kalın yazılar ** ile).
`;

    const answer = await callOpenAI(prompt);
    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    console.error("Ödev Hatası:", e);
    res.status(e.status || 500).json({ message: e.message || "Ödev oluşturulamadı" });
  }
};

/* ---------------------------------- */
/* 2) PDF ÖZET */
/* ---------------------------------- */
exports.aiPdfSummary = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim().slice(0, 15000); // Token limiti aşmasın diye ilk 15bin karakter

    if (!text) return res.status(400).json({ message: "PDF içeriği okunamadı veya boş!" });

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
Aşağıdaki metni analiz et ve en önemli noktaları madde madde özetle.
Anlaşılır ve akıcı bir Türkçe kullan.

METİN:
${text}
`;

    const answer = await callOpenAI(prompt);
    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(500).json({ message: "PDF özet hatası", error: e.message });
  }
};

/* ---------------------------------- */
/* 3) PDF SORU OLUŞTURUCU */
/* ---------------------------------- */
exports.aiPdfQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim().slice(0, 15000);

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
Aşağıdaki metne dayanarak öğrencilerin bilgisini ölçecek 5 adet zorlayıcı test sorusu (cevap anahtarıyla birlikte) veya 5 adet klasik soru hazırla.

METİN:
${text}
`;

    const answer = await callOpenAI(prompt);
    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(500).json({ message: "PDF soru üretim hatası", error: e.message });
  }
};

/* ---------------------------------- */
/* 4) PDF RAW TEXT (Kredisiz olabilir istersen) */
/* ---------------------------------- */
exports.aiPdfExtract = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yok" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim();

    // Sadece metin çıkarıyor, istersen kredi düşme satırını silebilirsin.
    // const user = await consumeCredits(req.user.id, 1);

    res.json({ content: text });

  } catch (e) {
    res.status(500).json({ message: "PDF metin çıkarma hatası", error: e.message });
  }
};

/* ---------------------------------- */
/* 5) SUNUM PDF → TEXT */
/* ---------------------------------- */
exports.aiPdfPresentationToText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yok" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim().slice(0, 10000);

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
Bu bir sunum dosyasının içeriği. Bunu bir konuşmacının okuyacağı akıcı bir sunum metnine çevir.
Slayt slayt ayırmak yerine bütünlüklü bir metin olsun.

İÇERİK:
${text}`;
    
    const answer = await callOpenAI(prompt);

    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(500).json({ message: "Sunum metni hatası", error: e.message });
  }
};

/* ---------------------------------- */
/* 6) PROFESYONEL SUNUM OLUŞTURUCU (PPTX) */
/* ---------------------------------- */
function getThemeColors(themeName) {
  const themes = {
    modern: { bg: "F0F4F8", title: "102A43", text: "334E68", bar: "334E68" },
    dark:   { bg: "102A43", title: "F0F4F8", text: "D9E2EC", bar: "486581" },
    nature: { bg: "F0FFF4", title: "164E32", text: "234E52", bar: "38A169" },
    premium:{ bg: "000000", title: "FFD700", text: "E0E0E0", bar: "FFD700" }
  };
  return themes[themeName] || themes.modern;
}

exports.aiCreatePresentation = async (req, res) => {
  try {
    const { topic, slideCount, theme: selectedTheme } = req.body;

    if (!topic) return res.status(400).json({ message: "Konu gerekli" });

    // Sunum pahalı bir işlem, 3 kredi düşüyoruz
    const user = await consumeCredits(req.user.id, 3);

    const systemPrompt = `
Sen profesyonel bir sunum tasarımcısısın.
Verilen konuda ${slideCount} slaytlık bir sunum planı çıkar.
Çıktı SADECE ve SADECE geçerli bir JSON formatında olmalı.
Dizi (Array) formatında döndür.

JSON FORMATI ŞÖYLE OLMALI:
[
  {
    "title": "Slayt Başlığı",
    "content": ["Madde 1", "Madde 2", "Madde 3"],
    "imageKeyword": "ingilizce_gorsel_anahtar_kelimesi" 
  }
]

NOT: "imageKeyword" alanı için DALL-E veya Unsplash'te aratılabilecek İngilizce kısa bir kelime yaz.
`;

    const rawResponse = await callOpenAI(`KONU: ${topic}`, systemPrompt);
    
    // JSON Temizliği
    const jsonString = cleanJSON(rawResponse);
    let slides;
    try {
      slides = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON Parse Hatası:", rawResponse);
      return res.status(500).json({ message: "AI geçersiz format üretti, lütfen tekrar deneyin." });
    }

    // PPTX Oluşturma
    const pres = new PptxGenJS();
    const t = getThemeColors(selectedTheme);

    // Her slaytı döngüye al
    for (const [index, sl] of slides.entries()) {
      const slide = pres.addSlide();
      
      // Arkaplan
      slide.background = { fill: t.bg };

      // Süsleme (Üstte çizgi)
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.2, fill: t.bar });

      // Başlık
      slide.addText(sl.title, {
        x: 0.5, y: 0.5, w: "90%", fontSize: 32,
        bold: true, color: t.title, align: "left"
      });

      // Görsel (Pollinations AI)
      if (sl.imageKeyword) {
        const imgUrl = generateImageUrl(sl.imageKeyword);
        try {
            // Görseli sağa koy
            slide.addImage({ path: imgUrl, x: 6.5, y: 1.5, w: 3.2, h: 3.2 });
        } catch (e) {
            console.log("Resim eklenemedi:", e.message);
        }
      }

      // Maddeler (Sol taraf)
      if (Array.isArray(sl.content)) {
        let yPos = 1.5;
        sl.content.forEach((bullet) => {
          slide.addText(`• ${bullet}`, {
            x: 0.5, y: yPos, w: 5.5, h: 0.5,
            fontSize: 18, color: t.text, align: "left"
          });
          yPos += 0.6;
        });
      }
      
      // Sayfa numarası
      slide.addText(`${index + 1}`, { x: 9.5, y: 5.3, fontSize: 12, color: t.text });
    }

    // Sunumu Buffer olarak oluştur ve gönder
    const buffer = await pres.write("nodebuffer");

    res.setHeader("Content-Disposition", "attachment; filename=sunum.pptx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.send(buffer);

  } catch (e) {
    console.error("Sunum Hatası:", e);
    res.status(500).json({ message: e.message });
  }
};