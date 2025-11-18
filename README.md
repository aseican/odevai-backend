# OdevAI Backend

Node.js + Express + MongoDB + PayTR + OpenAI (GPT-4o mini) tabanlı basit bir backend iskeleti.

## Kurulum

```bash
npm install
cp .env.example .env # Windows'ta .env dosyasını elle de oluşturabilirsin
# .env içindeki değerleri doldur
npm run dev
```

## Önemli Notlar

- MONGO_URI değerini kendi MongoDB Atlas bağlantı adresinle güncelle.
- OPENAI_API_KEY ve (kullanacaksan) GROQ_API_KEY değerlerini ekle.
- PayTR bilgilerini canlı/sandbox hesabına göre doldur.
- Bu proje bir başlangıç iskeletidir; canlıya almadan önce mutlaka güvenlik, loglama, hata yönetimi ve ödeme doğrulama adımlarını güçlendir.
