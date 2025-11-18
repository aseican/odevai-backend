const pdfParse = require("pdf-parse");
const { callOpenAI } = require("../services/aiService");
const { consumeCredits } = require("../utils/credits");

/* ---------------------------------- */
/* 1) ÖDEV OLUŞTURMA */
/* ---------------------------------- */
exports.aiHomework = async (req, res) => {
  try {
    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
Konu: ${req.body.topic}
Seviye: ${req.body.level}
Uzunluk: ${req.body.length}
Üslup: ${req.body.style}

Bu bilgilere göre kaliteli ve tamamlanmış bir ödev yaz.
Cevap ASLA yarım kalmasın.
`;

    const answer = await callOpenAI(prompt);
    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/* ---------------------------------- */
/* 2) PDF ÖZET */
/* ---------------------------------- */
exports.aiPdfSummary = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim();

    if (!text) return res.status(400).json({ message: "PDF boş!" });

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
PDF METNİNİ KALİTELİ BİR ŞEKİLDE ÖZETLE:

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
    const text = data.text?.trim();

    if (!text) return res.status(400).json({ message: "PDF boş!" });

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `
PDF METNİNE GÖRE SORULAR ÜRET:

${text}
`;

    const answer = await callOpenAI(prompt);
    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(500).json({ message: "PDF soru üretim hatası", error: e.message });
  }
};

/* ---------------------------------- */
/* 4) PDF RAW TEXT */
/* ---------------------------------- */
exports.aiPdfExtract = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yok" });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim();

    const user = await consumeCredits(req.user.id, 1);

    res.json({ content: text, credits: user.credits });

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
    const text = data.text?.trim();

    const user = await consumeCredits(req.user.id, 1);

    const prompt = `Bu sunumu temizle ve düzenle (ÖZET YAPMA):\n${text}`;
    const answer = await callOpenAI(prompt);

    res.json({ content: answer, credits: user.credits });

  } catch (e) {
    res.status(500).json({ message: "Sunum metni hatası", error: e.message });
  }
};



/* ---------------------------------- */
/* 6) PROFESYONEL TEMALI + GÖRSELLİ SUNUM */
/* ---------------------------------- */

const PptxGenJS = require("pptxgenjs");

async function findImage(keyword) {
  const prompt = `"${keyword}" konusuna uygun bir telifsiz görsel URL'si ver. SADECE URL ver.`;
  const url = await callOpenAI(prompt);
  return url.trim();
}

function theme(themeName) {
  const themes = {
    modern: { bg: "E6F0FF", title: "003366", text: "333333" },
    dark: { bg: "1E1E1E", title: "FFFFFF", text: "DDDDDD" },
    premium: { bg: "0A0A0A", title: "FFD700", text: "E0E0E0" },
    white: { bg: "FFFFFF", title: "000000", text: "333333" }
  };
  return themes[themeName] || themes.white;
}

exports.aiCreatePresentation = async (req, res) => {
  try {
    const { topic, slideCount, style, theme: selectedTheme } = req.body;

    if (!topic) {
      return res.status(400).json({ message: "Konu gerekli" });
    }

    await consumeCredits(req.user.id, 3);

    const prompt = [
      "Aşağıdaki bilgilerle bir sunum oluştur:",
      `Konu: ${topic}`,
      `Slayt Sayısı: ${slideCount}`,
      "",
      "SADECE geçerli JSON üret:",
      "[",
      "  {",
      '    "title": "Slayt başlığı",',
      '    "bullets": ["madde1","madde2","madde3"],',
      '    "imageTopic": "görsel anahtar kelime"',
      "  }",
      "]",
      "",
      "Kurallar:",
      "- Sadece JSON ver",
      "- Kod bloğu yok",
      "- Açıklama yok",
      "- Her slaytta 3–5 madde olsun"
    ].join("\n");

    const raw = await callOpenAI(prompt);

    let slides;
    try {
      slides = JSON.parse(raw.trim());
    } catch (err) {
      return res.status(500).json({
        message: "JSON hatalı",
        raw
      });
    }

    const pres = new PptxGenJS();
    const t = theme(selectedTheme);

    for (const sl of slides) {
      const slide = pres.addSlide();

      slide.background = { fill: t.bg };

      const imgUrl = await findImage(sl.imageTopic || sl.title);

      slide.addText(sl.title || "Başlık", {
        x: 0.5,
        y: 0.4,
        fontSize: 34,
        bold: true,
        color: t.title,
      });

      if (Array.isArray(sl.bullets)) {
        let y = 1.5;

        for (const bullet of sl.bullets) {
          slide.addText(`• ${bullet}`, {
            x: 0.7,
            y,
            w: 6.5,
            h: 0.5,
            fontSize: 18,
            color: t.text
          });
          y += 0.45;
        }
      }

      try {
        slide.addImage({
          url: imgUrl,
          x: 8.0,
          y: 1.5,
          w: 3.0,
          h: 2.3
        });
      } catch {}
    }

    const buffer = await pres.write("nodebuffer");

    res.setHeader("Content-Disposition", "attachment; filename=sunum.pptx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    res.send(buffer);

  } catch (e) {
    res.status(500).json({
      message: "Sunum oluşturma hatası",
      error: e.message
    });
  }
};

