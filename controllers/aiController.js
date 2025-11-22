const OpenAI = require("openai");
const User = require("../models/User");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// --- AYARLAR ---
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const PYTHON_SCRIPT = path.join(process.cwd(), "convert_script.py");

// .env dosyasından API Key'i al
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ==========================================================================
   BÖLÜM 1: YARDIMCI ARAÇLAR VE MOTOR (UTILITIES)
   ========================================================================== */

/**
 * Python Scriptini Çalıştıran Yardımcı Fonksiyon
 * Node.js ile Python arasındaki köprüyü kurar.
 */
const runPythonScript = (args) => {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    // Argümanları güvenli şekilde birleştir
    const command = `${pythonCmd} "${PYTHON_SCRIPT}" ${args.map(a => `"${a}"`).join(" ")}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Python Hatası:", stderr || stdout);
        reject(stderr || stdout || "İşlem başarısız");
      } else {
        resolve(stdout);
      }
    });
  });
};

/**
 * Görsel Linki Oluşturucu (Pollinations AI)
 */
function generateImageUrl(keyword) {
  const encodedKey = encodeURIComponent(keyword + " high quality, detailed, professional, cinematic lighting");
  return `https://image.pollinations.ai/prompt/${encodedKey}?width=1024&height=768&nologo=true&model=flux`;
}

/**
 * JSON Temizleyici
 */
function cleanJSON(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * Gelişmiş OpenAI Motoru (Hata Yönetimli)
 */
async function callOpenAI(prompt, creativity = 0.7, systemMessage = null) {
  try {
    // Varsayılan sistem mesajı (Eğer özel bir şey gönderilmediyse)
    const defaultSystem = "Sen çok yetenekli, akademik formatlara hakim ve Markdown dilini mükemmel kullanan bir yapay zeka asistanısın.";
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage || defaultSystem },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini", 
      temperature: creativity,
      max_tokens: 4000, 
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API Hatası:", error);
    throw new Error("Yapay zeka servisine şu an ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.");
  }
}

// --- KREDİ DÜŞME FONKSİYONU ---
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
   BÖLÜM 3: CONTROLLER FONKSİYONLARI (MEVCUTLAR)
   ========================================================================== */

/* 1) ÖDEV OLUŞTURMA */
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

/* 2) PDF ÖZETLEME */
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

    const resultText = await callOpenAI(prompt, 0.3);

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

    const resultText = await callOpenAI(prompt, 0.8);

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: resultText, credits: updatedUser.credits });

  } catch (error) {
    res.status(500).json({ message: "Metin dönüştürülemedi." });
  }
};

/* 5) ULTRA PRO SUNUM */
exports.generatePresentation = async (req, res) => {
  try {
    const { topic, slideCount } = req.body;
    if (!topic) return res.status(400).json({ message: "Konu gerekli" });

    const COST = 8;
    if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

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

    await handleCreditDeduction(req.user._id, COST);
    res.json({ slides, topic });

  } catch (error) {
    console.error("Sunum Hatası:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================================================
   BÖLÜM 4: YENİ EKLENEN ÖZELLİKLER (YOUTUBE & CHATPDF)
   ========================================================================== */

/* 6) YOUTUBE VİDEO ÖZETİ */
exports.summarizeYoutube = async (req, res) => {
  const { videoUrl } = req.body;
  const COST = 10; // Kredi bedeli

  if (!videoUrl) return res.status(400).json({ message: "YouTube linki gerekli." });
  if (req.user.credits < COST) return res.status(403).json({ message: "Yetersiz kredi." });

  const tempTxtPath = path.join(UPLOADS_DIR, `yt_${Date.now()}.txt`);

  try {
    // 1. Python ile altyazıyı çek
    await runPythonScript(["youtube", videoUrl, tempTxtPath]);

    // 2. .txt dosyasını oku
    const transcript = fs.readFileSync(tempTxtPath, "utf-8");

    // 3. OpenAI Promptu
    const prompt = `
      GÖREV: Aşağıdaki YouTube videosunun metnini analiz et.
      ÇIKTI FORMATI (Markdown):
      # 🎬 Video Özeti: [Video Konusu]
      ## 📌 Temel Fikir
      (Buraya 1 paragraf ana fikir)
      ## 💡 Önemli Noktalar
      - (Madde 1)
      - (Madde 2)
      - ...
      METİN:
      ${transcript.substring(0, 15000)}
    `;
    
    const aiResponse = await callOpenAI(prompt, 0.5);

    // 4. Temizlik ve Kredi
    try { fs.unlinkSync(tempTxtPath); } catch(e) {}
    
    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ content: aiResponse, credits: updatedUser.credits });

  } catch (error) {
    console.error("Youtube Özeti Hatası:", error);
    // Dosya kalırsa temizle
    try { fs.unlinkSync(tempTxtPath); } catch(e) {}
    res.status(500).json({ message: "Video özetlenemedi. Altyazı kapalı olabilir." });
  }
};

/* 7) CHATPDF - PDF İLE SOHBET */
exports.chatWithPdf = async (req, res) => {
  const COST = 5; 

  // --- LOGLAMA (HATA AYIKLAMA İÇİN) ---
  console.log("--> ChatPDF İsteği Geldi!");
  console.log("Body (Soru):", req.body);
  // Dosya ismini logla, undefined ise "YOK" yaz
  console.log("File (Dosya):", req.file ? req.file.filename : "YOK");

  // 1. KRİTİK KONTROLLER
  // Multer dosyayı kaydetmediyse veya dosya gelmediyse durdur
  if (!req.file || !req.file.filename) {
      console.error("HATA: Dosya backend'e ulaşmadı.");
      return res.status(400).json({ message: "PDF dosyası yüklenemedi veya eksik." });
  }
  
  const { question } = req.body;
  if (!question) {
      console.error("HATA: Soru eksik.");
      return res.status(400).json({ message: "Lütfen bir soru yazın." });
  }

  if (req.user.credits < COST) {
      return res.status(403).json({ message: "Yetersiz kredi." });
  }

  // 2. DOSYA YOLLARI
  // path.join kullanarak işletim sistemi farkını (Linux/Windows) ortadan kaldırıyoruz
  const inputPdfPath = path.join(UPLOADS_DIR, req.file.filename); 
  const tempTxtPath = inputPdfPath + ".txt";

  try {
    // 3. PYTHON İLE METİN ÇIKARMA (OCR Destekli)
    // 'pdf_text' parametresi convert_script.py içindeki text çıkarma fonksiyonunu çağırır
    await runPythonScript(["pdf_text", inputPdfPath, tempTxtPath]);

    // 4. METNİ OKUMA VE KONTROL ETME
    if (!fs.existsSync(tempTxtPath)) {
        throw new Error("Python metin dosyasını oluşturamadı (OCR başarısız olabilir).");
    }
    
    let pdfText = fs.readFileSync(tempTxtPath, "utf-8");
    
    // Eğer PDF boşsa veya okunamadıysa
    if (!pdfText || pdfText.trim().length === 0) {
        throw new Error("PDF içeriği boş. Okunabilir bir metin bulunamadı.");
    }

    // Token limiti için metni kırp (50.000 karakter güvenli sınırdır)
    if (pdfText.length > 50000) {
        pdfText = pdfText.substring(0, 50000) + "\n...(Metnin geri kalanı sistem tarafından kırpıldı)";
    }

    // 5. OPENAI SORGUSU
    const systemPrompt = "Sen bu PDF belgesinin uzmanısın. Kullanıcının sorusunu SADECE aşağıdaki belge içeriğine dayanarak cevapla. Eğer bilgi belgede yoksa, uydurma ve 'Bu bilgi belgede yer almıyor' de.";
    const userPrompt = `BELGE İÇERİĞİ:\n${pdfText}\n\nKULLANICI SORUSU: ${question}`;

    // callOpenAI fonksiyonunu çağır (aiService.js içindeki veya dosyanın üstündeki)
    const aiResponse = await callOpenAI(userPrompt, 0.5, systemPrompt);

    // 6. TEMİZLİK (İşlem başarılıysa dosyaları sil)
    try { 
      if(fs.existsSync(inputPdfPath)) fs.unlinkSync(inputPdfPath); 
      if(fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath); 
    } catch(e) {
      console.error("Dosya silme uyarısı:", e.message);
    }

    // 7. KREDİ DÜŞME VE CEVAP
    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ answer: aiResponse, credits: updatedUser.credits });

  } catch (error) {
    console.error("ChatPDF Hatası:", error);

    // Hata olsa bile sunucuda çöp dosya bırakma
    try { 
      if(fs.existsSync(inputPdfPath)) fs.unlinkSync(inputPdfPath); 
      if(fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath); 
    } catch(e) {}
    
    // Kullanıcıya hatayı dön
    res.status(500).json({ message: "PDF okunamadı veya cevap üretilemedi." });
  }

  try {
    // 1. Python ile PDF metnini çıkar
    await runPythonScript(["pdf_text", inputPdfPath, tempTxtPath]);

    // 2. Metni oku
    if (!fs.existsSync(tempTxtPath)) {
        throw new Error("Metin dosyası oluşturulamadı.");
    }
    
    let pdfText = fs.readFileSync(tempTxtPath, "utf-8");
    
    if (pdfText.length > 50000) pdfText = pdfText.substring(0, 50000) + "\n...(Metin kısaltıldı)";

    const systemPrompt = "Sen bu PDF belgesinin uzmanısın. Kullanıcının sorusunu SADECE aşağıdaki belgeye dayanarak cevapla.";
    const userPrompt = `BELGE İÇERİĞİ:\n${pdfText}\n\nKULLANICI SORUSU: ${question}`;

    const aiResponse = await callOpenAI(userPrompt, 0.5, systemPrompt);

    // Temizlik
    try { 
      fs.unlinkSync(inputPdfPath); 
      fs.unlinkSync(tempTxtPath); 
    } catch(e) {}

    await handleCreditDeduction(req.user._id, COST);
    const updatedUser = await User.findById(req.user._id);

    res.json({ answer: aiResponse, credits: updatedUser.credits });

  } catch (error) {
    console.error("ChatPDF Hatası:", error);
    try { 
      if(fs.existsSync(inputPdfPath)) fs.unlinkSync(inputPdfPath); 
      if(fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath); 
    } catch(e) {}
    
    res.status(500).json({ message: "PDF okunamadı veya cevap üretilemedi." });
  }
};