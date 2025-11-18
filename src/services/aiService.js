const axios = require('axios');
    const OpenAI = require('openai');

    const openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    // OpenAI GPT-4o mini ile genel amaçlı chat completion
    const callOpenAI = async (messages, model = 'gpt-4o-mini') => {
      if (!openai) {
        throw new Error('OPENAI_API_KEY tanımlı değil');
      }
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7
      });
      return completion.choices[0]?.message?.content || '';
    };

    // Groq için basit HTTP client (opsiyonel)
    const callGroq = async (messages, model = 'mixtral-8x7b-32768') => {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY tanımlı değil');
      }
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages,
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return res.data.choices[0]?.message?.content || '';
    };

    // Ödev üretme için sistem promptu
    const buildHomeworkPrompt = ({ topic, level, length, style, referencesStyle }) => {
      const systemMsg = {
        role: 'system',
        content: `Sen akademik yazı yazma konusunda uzman bir Ödev Asistanısın.
Kullanıcının verdiği konuya göre özgün, anlaşılır ve seviyeye uygun bir ödev oluştur.
Çıktıyı şu yapıda ver:
1) Başlık
2) Ödev Planı (madde madde)
3) Giriş
4) Gelişme bölümleri (alt başlıklarla)
5) Sonuç
6) Önerilen Kaynakça (${referencesStyle} formatında mümkün olduğunca gerçekçi fakat uydurma olmayan referanslar.
Seviye: ${level}. Uzunluk: ${length}. Yazım tarzı: ${style}.`
      };
      return systemMsg;
    };

    const buildPdfSummaryPrompt = () => ({
      role: 'system',
      content: `Sen PDF içeriklerini öğrenciler için sadeleştirip özetleyen bir asistansın.
Metni madde madde, anlaşılır, örnekli ve seviyeye uygun şekilde özetle. En sonunda 3-5 tane "çıkabilecek sınav sorusu" ekle.`
    });

    const buildQuestionGeneratorPrompt = () => ({
      role: 'system',
      content: `Sen verilen metinden sınav soruları üreten bir öğretmensin.
Çoktan seçmeli, doğru-yanlış ve kısa cevaplı karışık 15 soru üret. Sonunda cevap anahtarını ekle.`
    });

    module.exports = {
      callOpenAI,
      callGroq,
      buildHomeworkPrompt,
      buildPdfSummaryPrompt,
      buildQuestionGeneratorPrompt
    };
