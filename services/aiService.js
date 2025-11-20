const OpenAI = require("openai");

// API Anahtarı kontrolü (Hata ayıklamayı kolaylaştırır)
if (!process.env.OPENAI_API_KEY) {
  console.error("FATAL ERROR: OPENAI_API_KEY tanımlanmamış!");
  // Sunucuyu çökertmeyelim ama loglara basalım
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * OpenAI GPT-4o-mini modelini çağıran merkezi servis.
 * 
 * @param {string} prompt - Kullanıcının isteği (User Prompt)
 * @param {string|null} customSystemPrompt - (Opsiyonel) Özel sistem talimatı. 
 * Eğer boş bırakılırsa varsayılan "Sessiz Asistan" modu kullanılır.
 * 
 * @returns {Promise<string>} - Yapay zekanın cevabı
 */
async function callOpenAI(prompt, customSystemPrompt = null) {
  
  // 1. Varsayılan "Sessiz ve İtaatkar" Mod
  // Eğer controller özel bir rol (örn: "Sen bir sunum json üreticisisin") göndermediyse bunu kullan.
  const defaultSystem = `
Sen profesyonel bir içerik üreticisisin.
Kurallar:
- Kullanıcıya asla soru sorma.
- "Merhaba", "Tabii ki", "İşte cevabın" gibi sohbet ifadeleri KULLANMA.
- Sadece istenen net bilgiyi ver.
- Cevabın sonunda ekstra öneri veya soru sorma.
- İçerik bittiğinde dur.
`;

  // Hangi sistem mesajını kullanacağız?
  const systemContent = customSystemPrompt || defaultSystem;

  try {
    // 2. Güncel API Çağrısı (Chat Completions)
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Hızlı, ucuz ve zeki
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Yaratıcılık dengesi (0: Robotik, 1: Çok yaratıcı)
      max_tokens: 4000, // Uzun ödevler için limit (yaklaşık 3000 kelime)
    });

    // 3. Cevabı Temizle ve Döndür
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content.trim();
    } else {
      throw new Error("OpenAI boş cevap döndürdü.");
    }

  } catch (error) {
    // 4. Hata Yönetimi
    console.error("OpenAI API Hatası:", error.message);

    // Eğer API Key hatalıysa veya bakiye bittiyse bunu loglarda görelim
    if (error.response) {
      console.error(error.response.status, error.response.data);
    }

    // Kullanıcıya dönecek genel hata mesajı
    throw new Error("Yapay zeka servisi şu an yanıt veremiyor. Lütfen daha sonra tekrar deneyin.");
  }
}

module.exports = { callOpenAI };