const OpenAI = require("openai");
const User = require("../models/User");
const pdfParse = require("pdf-parse");
const PptxGenJS = require("pptxgenjs");

// .env dosyasından API Key'i al
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ==========================================================================
   BÖLÜM 1: YARDIMCI ARAÇLAR VE MOTOR (UTILITIES)
   ========================================================================== */

/**
 * 1. Görsel Motoru (Pollinations AI)
 * Sunumlar için konuyla alakalı, yüksek çözünürlüklü görseller üretir.
 * Flux modelini kullanarak daha gerçekçi sonuçlar hedefler.
 */
function generateImageUrl(keyword) {
  const encodedKey = encodeURIComponent(keyword + " high quality, detailed, professional, cinematic lighting");
  return `https://image.pollinations.ai/prompt/${encodedKey}?width=1024&height=768&nologo=true&model=flux`;
}

/**
 * 2. JSON Temizleyici ve Onarıcı
 * AI bazen JSON çıktısını Markdown blokları (```json ... ```) içine hapseder.
 * Bu fonksiyon o blokları temizler ve saf JSON stringini döndürür.
 */
function cleanJSON(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * 3. Gelişmiş OpenAI Motoru (Hata Yönetimli)
 * 'temperature' parametresi ile yaratıcılık seviyesini kontrol ederiz.
 * (0.1 = Robotik/Kesin, 1.0 = Şairane/Yaratıcı)
 */
async function callOpenAI(prompt, creativity = 0.7) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "Sen çok yetenekli, akademik formatlara hakim ve Markdown dilini mükemmel kullanan bir yapay zeka asistanısın." },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini", // Hem hızlı, hem ucuz, hem zeki
      temperature: creativity,
      max_tokens: 4000, // Uzun cevaplar için limit
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API Hatası:", error);
    throw new Error("Yapay zeka servisine şu an ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.");
  }
}

// --- KREDİ DÜŞME FONKSİYONU (HERKES İÇİN GEÇERLİ) ---
async function handleCreditDeduction(userId, cost) {
  // Admin kontrolü yok, herkesten düşer. Atomik işlem ($inc) kullanılır.
  await User.findByIdAndUpdate(userId, { $inc: { credits: -cost } });
}

/* ==========================================================================
   BÖLÜM 2: PROMPT MÜHENDİSLİĞİ (MASTER MIND)
   ========================================================================== */

/**
 * Bu fonksiyon, kullanıcının seçtiği seviyeye ve üsluba göre
 * AI'ın kişiliğini (Persona) ve kurallarını (Ruleset) sıfırdan inşa eder.
 */
function buildSystemInstruction(level, style, length) {
  
  // --- UZUNLUK STRATEJİSİ ---
  let lengthDirective = "";
  if (length === "Kısa") {
    lengthDirective = "Özet niteliğinde, net, vurucu ve lafı uzatmayan bir yapı kur. Yaklaşık 400-500 kelime.";
  } else if (length === "Orta") {
    lengthDirective = "Konuyu detaylandır, örnekler ver, alt başlıklarla zenginleştir. Yaklaşık 800-1200 kelime.";
  } else {
    lengthDirective = "ULTRA DETAYLI VE KAPSAMLI OL. Konunun tarihçesine, nedenlerine, sonuçlarına ve geleceğine değin. En az 1500-2000 kelime hedefle.";
  }

  // --- PERSONA (KİMLİK) VE KURALLAR ---
  let persona = "";
  let formatRules = "";

  switch (level) {
    case "İlkokul":
      persona = `
        KİMLİK: Sen çocukların çok sevdiği, enerjik, masalcı bir öğretmensin.
        TON: Eğlenceli, basit, samimi ve merak uyandırıcı.
        YASAKLAR: Akademik jargon, uzun ve karmaşık cümleler, sıkıcı tanımlar.
        GÖREV: Konuyu bir oyun veya hikaye gibi anlat.
      `;
      formatRules = `
        - Her paragrafta en az 2-3 uygun Emoji kullan (🌟, 🚀, 🎈).
        - Başlıkları çocukların ilgisini çekecek şekilde at (Örn: "Biliyor Muydun?", "Sihirli Bilgiler").
        - "Merhaba küçük kaşif!" gibi hitaplarla başla.
      `;
      break;

    case "Ortaokul":
    case "Lise":
      persona = `
        KİMLİK: Sen öğrencileri LGS/YKS sınavlarına hazırlayan, "hap bilgi" uzmanı, zeki bir özel ders hocasısın.
        TON: Motive edici, net, akılda kalıcı ve stratejik.
        GÖREV: Konunun sınavda çıkabilecek kısımlarını vurgula, gereksiz detaylardan kaçın.
      `;
      formatRules = `
        - Uzun paragraflar YASAK. Bilgileri madde madde (Bullet points) ver.
        - Önemli tarihleri, terimleri ve formülleri **KALIN** yazarak vurgula.
        - Konunun özünü anlatan bir "Özet Kutusu" ekle.
      `;
      break;

    case "Üniversite":
    case "Yüksek Lisans":
      persona = `
        KİMLİK: Sen Oxford Üniversitesi'nde kürsü sahibi, alanında otorite, titiz ve eleştirel bir profesörsün.
        TON: Resmi, terminolojik, analitik, objektif ve sofistike.
        YASAKLAR: Emoji, "arkadaşlar" gibi samimi hitaplar, yüzeysel genellemeler, kaynak gösterilmeyen iddialar.
        GÖREV: Konuyu sadece anlatma; eleştir, antitezler sun, sentez yap ve literatürle destekle.
      `;
      formatRules = `
        - Akademik makale formatında yaz (Özet, Giriş, Literatür Taraması, Metodoloji/Analiz, Tartışma, Sonuç).
        - Mutlaka metin içi atıf ve en sonda KAYNAKÇA (APA formatında) ver.
        - Karmaşık verileri analiz et.
        - Alt başlıkları hiyerarşik kullan (#, ##, ###).
      `;
      break;

    default:
      persona = "Sen çok yetenekli, bilgili ve yardımsever bir yapay zeka asistanısın.";
  }

  // --- ÜSLUP AYARI ---
  let styleInstruction = "";
  if (style === "Akademik") styleInstruction = "Dilin son derece resmi, nesnel, kanıta dayalı ve didaktik olsun.";
  if (style === "Samimi") styleInstruction = "Sanki bir arkadaşınla kahve içerken konuşuyormuş gibi rahat, içten ve 'sen' diliyle yaz.";
  if (style === "Mizahi") styleInstruction = "Araya ince espriler, ironiler, kelime şakaları ve popüler kültür göndermeleri sıkıştır.";
  if (style === "Eleştirel") styleInstruction = "Konuya şüpheci yaklaş, açıklarını bul, karşıt görüşleri savun, sorgula.";

  // MASTER PROMPT ÇIKTISI
  return `
    ${persona}
    
    GÖREV DETAYLARI:
    ----------------
    UZUNLUK HEDEFİ: ${lengthDirective}
    ÜSLUP TALİMATI: ${styleInstruction}
    
    FORMAT KURALLARI:
    ${formatRules}
    - Çıktıyı MÜKEMMEL VE HATASIZ BİR MARKDOWN formatında ver.
    - Okunabilirliği artırmak için paragrafları böl.
    - ASLA giriş cümlesi olarak "Tabii, işte ödevin" gibi meta-konuşmalar yapma. Direkt başlıkla konuya gir.
  `;
}

/* ==========================================================================
   BÖLÜM 3: CONTROLLER FONKSİYONLARI (İŞLEYİCİLER)
   ========================================================================== */

/* --------------------------------------------------------------------------
   1) ÖDEV OLUŞTURMA (HOMEWORK GENERATOR)
   -------------------------------------------------------------------------- */
exports.generateHomework = async (req, res) => {
  const { topic, level, length, style } = req.body;

  // Kredi Kontrolü (4 Kredi)
  const COST = 4;
  if (req.user.credits < COST) {
    return res.status(403).json({ message: "Yetersiz kredi. Premium içerik için yükleme yapın." });
  }

  try {
    // 1. Zekayı İnşa Et
    const systemInstruction = buildSystemInstruction(level, style, length);

    // 2. Final Promptu Oluştur
    const finalPrompt = `
      ${systemInstruction}
      
      KONU: "${topic}"
      
      Lütfen yukarıdaki persona ve kurallara %100 sadık kalarak, benzeri olmayan, 
      intihal kontrolünden geçebilecek özgünlükte, harika bir içerik oluştur.
      
      Başla.
    `;

    // 3. AI'ı Ateşle (Sıcaklık: 0.7 - Dengeli Yaratıcılık)
    const content = await callOpenAI(finalPrompt, 0.7);

    // 4. Krediyi Düş ve Kaydet
    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    // 5. Cevabı Döndür
    res.json({ content, credits: updatedUser.credits });

  } catch (error) {
    console.error("Ödev Hatası:", error);
    res.status(500).json({ message: "Üzgünüz, AI şu an aşırı yoğun. Lütfen tekrar deneyin." });
  }
};

/* --------------------------------------------------------------------------
   2) PDF DERİNLEMESİNE ANALİZ (EXECUTIVE SUMMARY)
   -------------------------------------------------------------------------- */
exports.generatePdfSummary = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Lütfen bir PDF dosyası yükleyin." });

    // PDF'i Metne Çevir
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 30000); 

    const COST = 4;
    if (req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Sen dünyanın en iyi veri analisti ve baş editörüsün.
      Aşağıdaki ham metni analiz et ve profesyonel bir "Yönetici Özeti" (Executive Summary) raporu hazırla.

      RAPOR FORMATI:
      # 📄 Belge Analiz Raporu

      ## 🎯 Yönetici Özeti
      (Metnin ne anlattığını, amacını ve sonucunu 3-4 vurucu cümleyle özetle.)

      ## 🔑 Anahtar Bulgular (Key Takeaways)
      - (En önemli 5-7 maddeyi buraya listele. Önemsiz detayları at.)
      - (Önemli terimleri **kalın** yaz.)

      ## 📊 Veri Analizi
      (Eğer metinde istatistik, tarih, para birimi veya sayısal veri varsa bunları mutlaka bir MARKDOWN TABLOSU haline getir. Yoksa bu başlığı atla.)

      ## 🚀 Aksiyon Planı / Sonuç
      (Bu metinden çıkarılması gereken ders veya yapılması gereken eylem nedir?)

      METİN:
      ${textContent}
    `;

    // Analiz olduğu için yaratıcılığı düşük tutuyoruz (0.3), doğruluk artsın.
    const resultText = await callOpenAI(prompt, 0.3);

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    console.error("PDF Özet Hatası:", error);
    res.status(500).json({ message: "PDF işlenirken hata oluştu." });
  }
};

/* --------------------------------------------------------------------------
   3) ZORLAYICI SINAV HAZIRLAMA (EXAM CREATOR)
   -------------------------------------------------------------------------- */
exports.generatePdfQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });

    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 30000);

    const COST = 4;
    if (req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Sen acımasız ama adil bir sınav komisyonu başkanısın.
      Aşağıdaki metinden öğrencilerin bilgisini, dikkatini ve analiz yeteneğini ölçecek kapsamlı bir sınav kağıdı hazırla.

      BÖLÜM 1: ÇOKTAN SEÇMELİ (5 Soru)
      - Sorular bilgi değil, yorum ve dikkat gerektirsin.
      - Şıklar birbirine yakın olsun (Çeldirici şıklar güçlü olsun).
      - A, B, C, D, E şıkları olsun.

      BÖLÜM 2: AÇIK UÇLU VE YORUM (3 Soru)
      - Öğrencinin metni yorumlamasını iste. "Metne göre yazarın amacı nedir?", "Bu durumun sonuçları ne olabilir?" gibi.

      BÖLÜM 3: DOĞRU / YANLIŞ (5 Soru)
      - Metindeki ince detaylardan D/Y soruları çıkar.

      --- CEVAP ANAHTARI ---
      (En altta, her bölümün doğru cevaplarını ve *neden* o cevabın doğru olduğunu kısaca açıkla.)

      METİN:
      ${textContent}
    `;

    const resultText = await callOpenAI(prompt, 0.5); 

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    console.error("Sınav Hatası:", error);
    res.status(500).json({ message: "Sınav hazırlanamadı." });
  }
};

/* --------------------------------------------------------------------------
   4) PDF'TEN TED TALK KONUŞMASI (SPEECH WRITER)
   -------------------------------------------------------------------------- */
exports.generatePdfToPresentationText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "PDF yüklenmedi" });
    
    const data = await pdfParse(req.file.buffer);
    const textContent = data.text?.trim().slice(0, 20000);
    
    const COST = 4;
    if (req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    const prompt = `
      GÖREV: Bu sıkıcı ve teknik PDF içeriğini, binlerce kişiye hitap edilecek efsanevi bir TED Talk konuşma metnine çevir.

      KURALLAR:
      - Giriş çok etkileyici bir anekdot, soru veya şok edici bir veriyle başlasın.
      - Dil çok akıcı, ilham verici, retorik ve duygusal olsun.
      - Metnin aralarına parantez içinde sahne notları ekle. Örn: [Gülümse], [Seyirciye dön], [Sessizlik], [Slaydı değiştir].
      - Konuyu basitleştir ama derinliğini kaybetme. "Storytelling" (Hikayeleştirme) tekniğini kullan.
      - Finalde ayakta alkışlatacak, izleyiciyi harekete geçirecek bir kapanış (Call to Action) yap.

      METİN:
      ${textContent}
    `;

    const resultText = await callOpenAI(prompt, 0.8);

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    console.error("Konuşma Metni Hatası:", error);
    res.status(500).json({ message: "Metin dönüştürülemedi." });
  }
};

/* --------------------------------------------------------------------------
   5) ULTRA PRO SUNUM OLUŞTURUCU (PPTX GENERATOR)
   -------------------------------------------------------------------------- */
function getThemeColors(themeName) {
  // Modern ve estetik renk paletleri
  const themes = {
    modern: { bg: "FFFFFF", title: "1A202C", text: "4A5568", bar: "3182CE" }, // Kurumsal Mavi
    dark:   { bg: "1A202C", title: "F7FAFC", text: "A0AEC0", bar: "63B3ED" }, // Gece Modu
    nature: { bg: "F0FFF4", title: "22543D", text: "48BB78", bar: "2F855A" }, // Doğa Yeşili
    premium:{ bg: "000000", title: "FFD700", text: "E2E8F0", bar: "B794F4" }, // Altın Siyah
    sunset: { bg: "FFF5F5", title: "742A2A", text: "C53030", bar: "F56565" }  // Sıcak Tonlar
  };
  return themes[themeName] || themes.modern;
}

exports.generatePresentation = async (req, res) => {
  try {
    const { topic, slideCount, theme: selectedTheme } = req.body;

    if (!topic) return res.status(400).json({ message: "Konu gerekli" });

    const COST = 8;
    if (req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
    }

    // 1. AI'dan JSON Formatında Slayt Planı İste
    const systemPrompt = `
      GÖREV: Dünyanın en iyi sunum tasarımcısı sensin (McKinsey, Apple standartlarında).
      KONU: "${topic}"
      
      AMAÇ: ${slideCount || 10} slaytlık, izleyiciyi sıkmayan, görsel odaklı ve vurucu bir sunum planı hazırla.

      KURALLAR:
      1. Sadece ve sadece GEÇERLİ BİR JSON formatında çıktı ver. Başka hiçbir giriş/çıkış cümlesi yazma.
      2. "imageKeyword" alanı için Unsplash/DALL-E uyumlu, İngilizce, somut bir kelime seç (Örn: "meeting room" yerine "futuristic glass meeting room 4k").
      3. "content" dizisi içindeki maddeler kısa ve öz olsun (Cümle değil, madde). En fazla 4 madde.

      JSON ŞEMASI:
      [
        {
          "title": "Vurucu Slayt Başlığı",
          "content": ["Kısa Madde 1", "Kısa Madde 2", "Kısa Madde 3"],
          "imageKeyword": "cyberpunk_city_night_neon" 
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

    // 2. PPTX Dosyasını İnşa Et
    const pres = new PptxGenJS();
    const t = getThemeColors(selectedTheme);

    // Kapak Slaytı
    const coverSlide = pres.addSlide();
    coverSlide.background = { fill: t.bg };
    coverSlide.addText(topic.toUpperCase(), { 
      x: 0.5, y: 2.5, w: "90%", fontSize: 48, bold: true, align: "center", color: t.title, fontFace: "Arial" 
    });
    coverSlide.addText("Hazırlayan: OdevAI Asistanı", { 
      x: 0.5, y: 4, w: "90%", fontSize: 18, align: "center", color: t.text, fontFace: "Arial" 
    });

    // İçerik Slaytları Döngüsü
    for (const [index, sl] of slides.entries()) {
      const slide = pres.addSlide();
      slide.background = { fill: t.bg };
      
      // Dekoratif Çubuk (Tasarım detayı)
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 0.9, w: 1.5, h: 0.08, fill: t.bar });

      // Başlık
      slide.addText(sl.title, { 
        x: 0.5, y: 0.3, w: "90%", fontSize: 36, bold: true, color: t.title, fontFace: "Arial" 
      });

      // Görsel (Pollinations AI - Sağ Taraf)
      if (sl.imageKeyword) {
        const imgUrl = generateImageUrl(sl.imageKeyword);
        slide.addImage({ path: imgUrl, x: 5.5, y: 1.5, w: 4.2, h: 3.5, sizing: { type: "contain", w: 4.2, h: 3.5 } });
      }

      // Maddeler (Sol Taraf)
      if (Array.isArray(sl.content)) {
        let yPos = 1.5;
        sl.content.forEach((bullet) => {
          slide.addText(`• ${bullet}`, { 
            x: 0.5, y: yPos, w: 4.8, h: 0.6, 
            fontSize: 20, color: t.text, align: "left",
            paraSpaceAfter: 12, fontFace: "Arial"
          });
          yPos += 0.8;
        });
      }
      
      // Footer / Sayfa Numarası
      slide.addText(`OdevAI | Slayt ${index + 1}`, { 
        x: 0.5, y: 5.3, fontSize: 10, color: t.text, align: "left", fontFace: "Arial" 
      });
    }

    // 3. Krediyi Düş
    await handleCreditDeduction(req.user._id, COST);

    // 4. Dosyayı Gönder
    const buffer = await pres.write("nodebuffer");
    res.setHeader("Content-Disposition", "attachment; filename=sunum.pptx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.send(buffer);

  } catch (error) {
    console.error("Sunum Hatası:", error);
    res.status(500).json({ message: error.message });
  }
};