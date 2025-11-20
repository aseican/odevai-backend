const OpenAI = require("openai");
const User = require("../models/User");
const pdfParse = require("pdf-parse");
// PptxGenJS backend'den kaldırıldı, dosya oluşturma yükü Frontend'de.

// .env dosyasından API Key'i al
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ==========================================================================
   BÖLÜM 1: YARDIMCI ARAÇLAR VE MOTOR (UTILITIES)
   ========================================================================== */

/**
 * 1. Görsel Linki Oluşturucu (Pollinations AI)
 * Sunumlar için konuyla alakalı, yüksek çözünürlüklü görseller için link üretir.
 * Frontend bu linki alıp slayta koyacak.
 */
function generateImageUrl(keyword) {
  const encodedKey = encodeURIComponent(keyword + " high quality, detailed, professional, cinematic lighting");
  return `https://image.pollinations.ai/prompt/${encodedKey}?width=1024&height=768&nologo=true&model=flux`;
}

/**
 * 2. JSON Temizleyici
 * AI bazen JSON çıktısını Markdown blokları (```json ... ```) içine hapseder.
 * Bu fonksiyon o blokları temizler.
 */
function cleanJSON(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * 3. Gelişmiş OpenAI Motoru (Hata Yönetimli)
 * 'temperature' parametresi ile yaratıcılık seviyesini kontrol ederiz.
 */
async function callOpenAI(prompt, creativity = 0.7) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "Sen çok yetenekli, akademik formatlara hakim ve Markdown dilini mükemmel kullanan bir yapay zeka asistanısın." },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini", // Hem hızlı, hem zeki
      temperature: creativity,
      max_tokens: 4000, 
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API Hatası:", error);
    throw new Error("Yapay zeka servisine şu an ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.");
  }
}

// --- KREDİ DÜŞME FONKSİYONU (HERKES İÇİN GEÇERLİ) ---
async function handleCreditDeduction(userId, cost) {
  await User.findByIdAndUpdate(userId, { $inc: { credits: -cost } });
}

/* ==========================================================================
   BÖLÜM 2: PROMPT MÜHENDİSLİĞİ (MASTER MIND)
   ========================================================================== */

function buildSystemInstruction(level, style, length) {
  
  // --- UZUNLUK STRATEJİSİ ---
  let lengthDirective = "";
  if (length === "Kısa") {
    lengthDirective = "Özet niteliğinde, net, vurucu. Yaklaşık 400-500 kelime.";
  } else if (length === "Orta") {
    lengthDirective = "Konuyu detaylandır, örnekler ver. Yaklaşık 800-1200 kelime.";
  } else {
    lengthDirective = "ULTRA DETAYLI VE KAPSAMLI OL. Tarihçe, neden-sonuç, gelecek projeksiyonu... En az 1500-2000 kelime hedefle.";
  }

  // --- PERSONA (KİMLİK) VE KURALLAR ---
  let persona = "";
  let formatRules = "";

  switch (level) {
    case "İlkokul":
      persona = `KİMLİK: Sen çocukların sevdiği, enerjik, masalcı bir öğretmensin. TON: Eğlenceli, basit, samimi. YASAKLAR: Akademik jargon.`;
      formatRules = `- Her paragrafta en az 2-3 uygun Emoji kullan (🌟, 🚀). Başlıkları çocukların ilgisini çekecek şekilde at.`;
      break;

    case "Ortaokul":
    case "Lise":
      persona = `KİMLİK: Sen öğrencileri sınavlara hazırlayan, "hap bilgi" uzmanı, zeki bir hocasın. TON: Motive edici, net, stratejik.`;
      formatRules = `- Uzun paragraflar YASAK. Bilgileri madde madde (Bullet points) ver. Önemli yerleri **KALIN** yaz.`;
      break;

    case "Üniversite":
    case "Yüksek Lisans":
      persona = `KİMLİK: Sen Oxford Üniversitesi'nde kürsü sahibi, titiz ve eleştirel bir profesörsün. TON: Resmi, terminolojik, analitik, sofistike. YASAKLAR: Emoji, samimi hitaplar.`;
      formatRules = `- Akademik makale formatında yaz (Özet, Giriş, Literatür, Tartışma, Sonuç). Mutlaka KAYNAKÇA (APA formatında) ver.`;
      break;

    default:
      persona = "Sen çok yetenekli bir asistanısın.";
  }

  return `
    ${persona}
    GÖREV DETAYLARI: UZUNLUK: ${lengthDirective} ÜSLUP: ${style}
    FORMAT KURALLARI: ${formatRules}
    - Çıktıyı MÜKEMMEL BİR MARKDOWN formatında ver.
    - ASLA giriş cümlesi olarak "Tabii, işte ödevin" gibi meta-konuşmalar yapma. Direkt başlıkla gir.
  `;
}

/* ==========================================================================
   BÖLÜM 3: CONTROLLER FONKSİYONLARI (İŞLEYİCİLER)
   ========================================================================== */

/* 1) ÖDEV OLUŞTURMA (Ultra Güçlü Prompt ile) */
exports.generateHomework = async (req, res) => {
  const { topic, level, length, style } = req.body;
  const COST = 4;

  if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

  try {
    const systemInstruction = buildSystemInstruction(level, style, length);
    const finalPrompt = `${systemInstruction}\n\nKONU: "${topic}"\n\nLütfen yukarıdaki persona ve kurallara %100 sadık kal. Başla.`;

    const content = await callOpenAI(finalPrompt, 0.7);

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content, credits: updatedUser.credits });

  } catch (error) {
    console.error("Ödev Hatası:", error);
    res.status(500).json({ message: "AI servisi yanıt vermedi." });
  }
};

/* 2) PDF ÖZETLEME (Yönetici Özeti Formatında) */
exports.generatePdfSummary = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi." });
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 20000); 

    const COST = 4;
    if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

    const prompt = `
      GÖREV: Sen dünyanın en iyi veri analisti ve baş editörüsün.
      Aşağıdaki ham metni analiz et ve profesyonel bir "Yönetici Özeti" (Executive Summary) raporu hazırla.
      
      FORMAT:
      # 📄 Belge Analiz Raporu
      ## 🎯 Yönetici Özeti (3-4 vurucu cümle)
      ## 🔑 Anahtar Bulgular (En önemli 5-7 madde, önemli yerler **kalın**)
      ## 📊 Veri Analizi (Varsa sayısal verileri Tablo yap)
      ## 🚀 Sonuç ve Aksiyon

      METİN:
      ${textContent}
    `;

    const resultText = await callOpenAI(prompt, 0.3); // Düşük sıcaklık = Yüksek doğruluk

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    res.status(500).json({ message: "PDF işlenirken hata oluştu." });
  }
};

/* 3) ZORLAYICI SINAV HAZIRLAMA */
exports.generatePdfQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi." });
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 20000);

    const COST = 4;
    if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

    const prompt = `
      GÖREV: Sen acımasız ama adil bir sınav komisyonu başkanısın.
      Bu metinden öğrencileri zorlayacak bir sınav hazırla.
      
      İÇERİK:
      1. BÖLÜM: 5 adet Çoktan Seçmeli Soru (A,B,C,D,E). Çeldiriciler güçlü olsun.
      2. BÖLÜM: 3 adet Yorum/Klasik Soru.
      3. SONUÇ: Cevap Anahtarı ve açıklamaları.

      METİN:
      ${textContent}
    `;

    const resultText = await callOpenAI(prompt, 0.5); 

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    res.status(500).json({ message: "Sınav hazırlanamadı." });
  }
};

/* 4) PDF'TEN TED TALK KONUŞMASI */
exports.generatePdfToPresentationText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi." });
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 20000);
    
    const COST = 4;
    if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

    const prompt = `
      GÖREV: Bu teknik PDF içeriğini, binlerce kişiye hitap edilecek efsanevi bir TED Talk konuşma metnine çevir.
      KURALLAR: Giriş şok edici olsun. Dil akıcı ve ilham verici olsun. Sahne notları ekle [Gülümse], [Sessizlik].
      METİN:
      ${textContent}
    `;

    const resultText = await callOpenAI(prompt, 0.8); // Yüksek yaratıcılık

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    res.status(500).json({ message: "Metin dönüştürülemedi." });
  }
};

/* 5) ULTRA PRO SUNUM (JSON ÇIKTISI VERİR - Frontend Dosyayı Oluşturur) */
exports.generatePresentation = async (req, res) => {
  try {
    const { topic, slideCount } = req.body;
    if (!topic) return res.status(400).json({ message: "Konu gerekli" });

    const COST = 8;
    if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

    // 1. AI'dan JSON Formatında Slayt Planı İste
    const systemPrompt = `
      GÖREV: Dünyanın en iyi sunum tasarımcısı sensin (McKinsey standartlarında).
      KONU: "${topic}"
      AMAÇ: ${slideCount || 10} slaytlık, görsel odaklı ve vurucu bir sunum planı hazırla.

      KURALLAR:
      1. Sadece GEÇERLİ BİR JSON formatında çıktı ver. Başka metin yazma.
      2. "imageKeyword" alanı için Unsplash/DALL-E uyumlu, İngilizce, somut bir kelime seç (Örn: "futuristic city neon").
      3. "content" dizisi kısa ve öz maddelerden oluşsun.

      JSON ŞEMASI:
      [
        {
          "title": "Vurucu Slayt Başlığı",
          "content": ["Madde 1", "Madde 2"],
          "imageKeyword": "cyberpunk_city_night" 
        }
      ]
    `;

    const rawResponse = await callOpenAI(systemPrompt, 0.7);
    const jsonString = cleanJSON(rawResponse);
    
    let slides;
    try {
      slides = JSON.parse(jsonString);
    } catch (err) {
      console.error("JSON Parse Hatası:", rawResponse);
      return res.status(500).json({ message: "AI format hatası, lütfen tekrar deneyin." });
    }

    // 2. Krediyi Düş
    await handleCreditDeduction(req.user._id, COST);

    // 3. JSON verisini Frontend'e gönder (Frontend dosyayı oluşturacak)
    res.json({ slides, topic });

  } catch (error) {
    console.error("Sunum Hatası:", error);
    res.status(500).json({ message: error.message });
  }
};