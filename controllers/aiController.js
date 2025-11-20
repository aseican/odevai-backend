const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const pdfParse = require("pdf-parse");
const PptxGenJS = require("pptxgenjs");

// .env dosyasından API Key'i al
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ==========================================================================
   YARDIMCI FONKSİYONLAR VE ARAÇLAR
   ========================================================================== */

// 1. Görsel Oluşturucu (Sunumlar için)
function generateImageUrl(keyword) {
  const encodedKey = encodeURIComponent(keyword);
  return `https://image.pollinations.ai/prompt/${encodedKey}?width=1024&height=768&nologo=true&model=flux`;
}

// 2. JSON Temizleyici (AI'ın verdiği Markdown kirliliğini temizler)
function cleanJSON(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

// 3. Model Ayarları ve Çağırma (Sıcaklık ayarı ile yaratıcılığı kontrol ediyoruz)
async function callGemini(prompt, creativity = 0.7) {
  // gemini-1.5-pro daha zeki, flash daha hızlı. Premium hissi için PRO kullanabiliriz ama Flash da iş görür.
  // Şimdilik Flash ile devam edelim, hız önemli.
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: creativity, // 0.0 = Robotik, 1.0 = Şairane
      maxOutputTokens: 8192,   // Maksimum uzunluk (Çok uzun cevaplar için)
    }
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/* ==========================================================================
   GELİŞMİŞ PROMPT MİMARİSİ (PROMPT ENGINEERING V2.0)
   ========================================================================== */

// Bu fonksiyon, kullanıcının seçtiği seviyeye göre AI'ın "Beynini" yeniden programlar.
function buildSystemInstruction(level, style, length) {
  
  // A) UZUNLUK STRATEJİSİ
  let lengthDirective = "";
  if (length === "Kısa") lengthDirective = "Özet niteliğinde, net ve vurucu ol. Lafı uzatma. Yaklaşık 300-500 kelime.";
  else if (length === "Orta") lengthDirective = "Konuyu detaylandır ama boğma. Örnekler ver. Yaklaşık 800-1200 kelime.";
  else lengthDirective = "ULTRA DETAYLI OLACAKSIN. Konunun atomlarına in. Tarihçe, neden-sonuç, gelecek projeksiyonu... Her şeyi yaz. En az 1500-2000 kelime hedefle.";

  // B) PERSONA (KİMLİK) STRATEJİSİ
  let persona = "";
  let formatRules = "";

  switch (level) {
    case "İlkokul":
      persona = `
        KİMLİK: Sen çocukların en sevdiği, Disney karakteri gibi konuşan neşeli bir öğretmensin.
        TON: Enerjik, masalsı, basit ve oyunlaştırılmış.
        YASAKLAR: Akademik terimler, uzun paragraflar, sıkıcı cümleler.
        ÖZEL GÖREV: Her paragrafta çocukların hayal gücünü çalıştıracak sorular sor.
      `;
      formatRules = `
        - Bol bol Emoji kullan (🌟, 🚀, 🎈).
        - Başlıkları sanki bir hikaye kitabı gibi at.
        - "Biliyor muydun?" kutucukları oluştur.
      `;
      break;

    case "Ortaokul":
    case "Lise":
      persona = `
        KİMLİK: Sen öğrencileri LGS/YKS sınavlarına hazırlayan, "hap bilgi" uzmanı, karizmatik bir özel ders hocasısın.
        TON: Motive edici, net, akılda kalıcı ve stratejik.
        ÖZEL GÖREV: Konuyu anlatırken sınavda çıkabilecek yerleri özellikle vurgula.
      `;
      formatRules = `
        - Uzun yazı blokları YASAK. Bilgileri madde madde (Bullet points) ver.
        - Önemli tarihleri, terimleri ve formülleri **KALIN** yaz.
        - Karşılaştırma yaparken Markdown Tablosu kullan.
        - Konunun özünü anlatan bir "TL;DR" (Özet) kutusu ekle.
      `;
      break;

    case "Üniversite":
    case "Yüksek Lisans":
      persona = `
        KİMLİK: Sen Oxford Üniversitesi'nde ders veren, alanında otorite sahibi, titiz ve eleştirel bir profesörsün.
        TON: Resmi, terminolojik, analitik, objektif ve sofistike.
        YASAKLAR: Emoji, "arkadaşlar" gibi samimi hitaplar, yüzeysel genellemeler.
        ÖZEL GÖREV: Konuyu sadece anlatma; eleştir, antitezler sun ve sentez yap.
      `;
      formatRules = `
        - Akademik makale formatında yaz (Özet, Giriş, Metodoloji, Tartışma, Sonuç).
        - Mutlaka literatürden (gerçek veya temsili) referanslar ver (APA formatında).
        - Karmaşık verileri Markdown tablolarıyla sun.
        - Alt başlıkları hiyerarşik kullan (#, ##, ###).
      `;
      break;

    default:
      persona = "Sen çok yetenekli ve yardımsever bir yapay zeka asistanısın.";
  }

  // C) ÜSLUP AYARI
  let styleInstruction = "";
  if (style === "Akademik") styleInstruction = "Dilin son derece resmi, nesnel ve kanıta dayalı olsun.";
  if (style === "Samimi") styleInstruction = "Sanki bir arkadaşınla kahve içerken konuşuyormuş gibi rahat ve içten yaz.";
  if (style === "Mizahi") styleInstruction = "Araya ince espriler, ironiler ve popüler kültür göndermeleri sıkıştır.";
  if (style === "Eleştirel") styleInstruction = "Konuya şüpheci yaklaş, açıklarını bul, karşıt görüşleri savun.";

  // MASTER PROMPT BİRLEŞTİRME
  return `
    ${persona}
    
    GÖREV DETAYLARI:
    ----------------
    UZUNLUK HEDEFİ: ${lengthDirective}
    ÜSLUP TALİMATI: ${styleInstruction}
    
    FORMAT KURALLARI:
    ${formatRules}
    - Çıktıyı MÜKEMMEL BİR MARKDOWN formatında ver.
    - Başlıkları ve alt başlıkları hiyerarşik kullan.
    - Okuyucuyu metnin içinde tutmak için paragrafları kısa tut (Akademik hariç).
    - ASLA ve ASLA giriş cümlesi olarak "Tabii, işte ödevin" gibi şeyler yazma. Direkt başlıkla gir.
  `;
}

/* ==========================================================================
   CONTROLLER FONKSİYONLARI
   ========================================================================== */

/* ---------------------------------- */
/* 1) PREMIUM ÖDEV OLUŞTURMA          */
/* ---------------------------------- */
exports.generateHomework = async (req, res) => {
  const { topic, level, length, style } = req.body;

  // Kredi Kontrolü (4 Kredi)
  const COST = 4;
  if (!req.user || req.user.credits < COST) {
    return res.status(403).json({ message: "Yetersiz kredi. Premium içerik için yükleme yapın." });
  }

  try {
    // Zekayı İnşa Et
    const systemInstruction = buildSystemInstruction(level, style, length);

    const finalPrompt = `
      ${systemInstruction}
      
      KONU: "${topic}"
      
      Lütfen yukarıdaki persona ve kurallara %100 sadık kalarak, benzeri olmayan, 
      intihal kontrolünden geçebilecek özgünlükte, harika bir içerik oluştur.
      
      Başla.
    `;

    // AI'ı Ateşle (Creativity 0.7 idealdir)
    const content = await callGemini(finalPrompt, 0.7);

    // Kredi Düş
    req.user.credits -= COST;
    await req.user.save();

    res.json({ content, credits: req.user.credits });

  } catch (error) {
    console.error("Ödev Hatası:", error);
    res.status(500).json({ message: "Üzgünüz, AI şu an aşırı yoğun. Lütfen tekrar deneyin." });
  }
};

/* ---------------------------------- */
/* 2) PDF DERİNLEMESİNE ANALİZ (ÖZET) */
/* ---------------------------------- */
exports.generatePdfSummary = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    // Token limitini zorlayalım, daha fazla okusun (30.000 karakter)
    const textContent = data.text?.trim().slice(0, 30000); 

    const COST = 4;
    if (!req.user || req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Sen dünyanın en iyi veri analisti ve editörüsün.
      Aşağıdaki ham metni analiz et ve yönetici özeti (Executive Summary) formatında raporla.

      KURALLAR:
      1. **Yönetici Özeti:** Metnin ne anlattığını 3 cümlede vurucu şekilde özetle.
      2. **Anahtar Bulgular:** Metindeki en önemli 5-7 maddeyi bullet point ile listele.
      3. **Sayısal Veriler:** Metinde geçen istatistik, tarih veya para birimi varsa bunları bir TABLO haline getir.
      4. **Aksiyon Planı:** Bu metinden çıkarılması gereken ders veya yapılması gereken eylem nedir?
      5. **Format:** Profesyonel Markdown kullan. Başlıklar, Kalın Yazılar, Alıntılar (> Quote).

      METİN:
      ${textContent}
    `;

    const resultText = await callGemini(prompt, 0.4); // Daha düşük yaratıcılık = Daha fazla doğruluk

    req.user.credits -= COST;
    await req.user.save();

    res.json({ content: resultText, credits: req.user.credits });

  } catch (error) {
    console.error("PDF Özet Hatası:", error);
    res.status(500).json({ message: "PDF işlenirken hata oluştu." });
  }
};

/* ---------------------------------- */
/* 3) ZORLAYICI SINAV HAZIRLAMA       */
/* ---------------------------------- */
exports.generatePdfQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 30000);

    const COST = 4;
    if (!req.user || req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Sen acımasız ama adil bir sınav hazırlayıcısısın.
      Aşağıdaki metinden öğrencilerin bilgisini ve analiz yeteneğini ölçecek bir sınav kağıdı hazırla.

      BÖLÜM 1: ÇOKTAN SEÇMELİ (5 Soru)
      - Sorular bilgi değil, yorum ve dikkat gerektirsin.
      - Şıklar birbirine yakın olsun (Çeldirici şıklar güçlü olsun).
      - A, B, C, D, E şıkları olsun.

      BÖLÜM 2: AÇIK UÇLU (3 Soru)
      - Öğrencinin metni yorumlamasını iste. "Sizce neden...", "Metne göre..." gibi.

      BÖLÜM 3: DOĞRU / YANLIŞ (5 Soru)
      - Metindeki ince detaylardan D/Y soruları çıkar.

      BÖLÜM 4: CEVAP ANAHTARI
      - En altta, her bölümün doğru cevaplarını ve *neden* o cevabın doğru olduğunu kısaca açıkla.

      METİN:
      ${textContent}
    `;

    const resultText = await callGemini(prompt, 0.5);

    req.user.credits -= COST;
    await req.user.save();

    res.json({ content: resultText, credits: req.user.credits });

  } catch (error) {
    console.error("Sınav Hatası:", error);
    res.status(500).json({ message: "Sınav hazırlanamadı." });
  }
};

/* ---------------------------------- */
/* 4) PDF'TEN TED TALK KONUŞMASI      */
/* ---------------------------------- */
exports.generatePdfToPresentationText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
    
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 20000);
    
    const COST = 4;
    if (!req.user || req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Bu sıkıcı PDF dosyasını, sahnede binlerce kişiye yapılacak efsanevi bir TED Talk konuşma metnine çevir.

      KURALLAR:
      - Giriş çok etkileyici bir soruyla veya hikayeyle başlasın.
      - Dil çok akıcı, ilham verici ve retorik olsun.
      - Aralara [Gülümse], [Durakla], [Seyirciye Bak] gibi sahne notları ekle.
      - Konuyu basitleştir ama derinliğini kaybetme.
      - Finalde ayakta alkışlatacak bir kapanış yap.

      METİN:
      ${textContent}
    `;

    const resultText = await callGemini(prompt, 0.8); // Yüksek yaratıcılık

    req.user.credits -= COST;
    await req.user.save();

    res.json({ content: resultText, credits: req.user.credits });

  } catch (error) {
    console.error("Konuşma Metni Hatası:", error);
    res.status(500).json({ message: "Metin dönüştürülemedi." });
  }
};

/* ---------------------------------- */
/* 5) ULTRA PRO SUNUM (PPTX)          */
/* ---------------------------------- */
function getThemeColors(themeName) {
  // Daha modern renk paletleri
  const themes = {
    modern: { bg: "FFFFFF", title: "1A202C", text: "4A5568", bar: "3182CE" }, // Mavi-Beyaz
    dark:   { bg: "1A202C", title: "F7FAFC", text: "A0AEC0", bar: "63B3ED" }, // Koyu Mod
    nature: { bg: "F0FFF4", title: "22543D", text: "48BB78", bar: "2F855A" }, // Yeşil
    premium:{ bg: "000000", title: "FFD700", text: "E2E8F0", bar: "B794F4" }, // Altın-Siyah
    sunset: { bg: "FFF5F5", title: "742A2A", text: "C53030", bar: "F56565" }  // Kırmızı tonlar
  };
  return themes[themeName] || themes.modern;
}

exports.generatePresentation = async (req, res) => {
  try {
    const { topic, slideCount, theme: selectedTheme } = req.body;

    if (!topic) return res.status(400).json({ message: "Konu gerekli" });

    // Sunum pahalı (8 Kredi)
    const COST = 8;
    if (!req.user || req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const systemPrompt = `
      GÖREV: Dünyanın en iyi sunum tasarımcısı sensin (McKinsey veya Apple standartlarında).
      KONU: "${topic}"
      
      AMAÇ: ${slideCount || 10} slaytlık, izleyiciyi sıkmayan, görsel odaklı ve vurucu bir sunum planı hazırla.

      KURALLAR:
      1. Sadece JSON formatında çıktı ver. Başka hiçbir metin yazma.
      2. "imageKeyword" alanı için Unsplash/DALL-E uyumlu İngilizce bir kelime seç.
      3. "content" dizisi içindeki maddeler kısa ve öz olsun (Cümle değil, madde).

      JSON ŞEMASI:
      [
        {
          "title": "Vurucu Başlık",
          "content": ["Madde 1", "Madde 2", "Madde 3"],
          "imageKeyword": "futuristic_city_cyberpunk" 
        }
      ]
    `;

    const rawResponse = await callGemini(systemPrompt, 0.7);
    const jsonString = cleanJSON(rawResponse);
    
    let slides;
    try {
      slides = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON Parse Hatası:", rawResponse);
      return res.status(500).json({ message: "AI format hatası, lütfen tekrar deneyin." });
    }

    // PPTX Oluşturma
    const pres = new PptxGenJS();
    const t = getThemeColors(selectedTheme);

    // Kapak Slaytı (Ekstra Özellik)
    const coverSlide = pres.addSlide();
    coverSlide.background = { fill: t.bg };
    coverSlide.addText(topic.toUpperCase(), { x: 0.5, y: 2.5, w: "90%", fontSize: 48, bold: true, align: "center", color: t.title });
    coverSlide.addText("Hazırlayan: OdevAI Asistanı", { x: 0.5, y: 4, w: "90%", fontSize: 18, align: "center", color: t.text });

    // İçerik Slaytları
    for (const [index, sl] of slides.entries()) {
      const slide = pres.addSlide();
      
      slide.background = { fill: t.bg };
      // Dekoratif Çubuk
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 0.8, w: 1.5, h: 0.1, fill: t.bar });

      // Başlık
      slide.addText(sl.title, { x: 0.5, y: 0.3, w: "90%", fontSize: 36, bold: true, color: t.title });

      // Görsel
      if (sl.imageKeyword) {
        const imgUrl = generateImageUrl(sl.imageKeyword);
        // Görseli biraz daha estetik koyalım (Sağ taraf)
        slide.addImage({ path: imgUrl, x: 5.5, y: 1.5, w: 4.2, h: 3.5, sizing: { type: "contain", w: 4.2, h: 3.5 } });
      }

      // Maddeler (Sol taraf)
      if (Array.isArray(sl.content)) {
        let yPos = 1.5;
        sl.content.forEach((bullet) => {
          slide.addText(`• ${bullet}`, { 
            x: 0.5, y: yPos, w: 4.8, h: 0.6, 
            fontSize: 20, color: t.text, align: "left",
            paraSpaceAfter: 10 
          });
          yPos += 0.8;
        });
      }
      
      // Footer / Sayfa No
      slide.addText(`OdevAI | Slayt ${index + 1}`, { x: 0.5, y: 5.3, fontSize: 10, color: t.text, align: "left" });
    }

    req.user.credits -= COST;
    await req.user.save();

    const buffer = await pres.write("nodebuffer");
    res.setHeader("Content-Disposition", "attachment; filename=sunum.pptx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.send(buffer);

  } catch (error) {
    console.error("Sunum Hatası:", error);
    res.status(500).json({ message: error.message });
  }
};