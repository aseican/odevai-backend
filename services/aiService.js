const OpenAI = require("openai");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callOpenAI(prompt) {

  const systemInstructions = `
Sen bir metin üretme asistanısın.
Kurallar:
- Kullanıcıya asla soru sorma.
- Yardım teklif etme.
- “Daha fazla nasıl yardımcı olabilirim?” gibi ifadeleri ASLA kullanma.
- Sadece istenen içeriği üret.
- Cevabın sonunda ekstra cümle, soru veya öneri EKLEME.
- İçerik tamamlandığında sadece noktayı koy ve bitir.
`;

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: systemInstructions
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return response.output_text.trim();
}

module.exports = { callOpenAI };
