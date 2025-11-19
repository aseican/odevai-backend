require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

// --- ROTA DOSYALARINI İÇERİ AL ---
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes"); // Ödev yapay zeka rotaları
const pdfRoutes = require("./routes/pdfRoutes"); // PDF araçları rotaları
const adminRoutes = require("./routes/adminRoutes"); // YENİ: Admin paneli rotaları

const app = express();

// --- CORS VE GÜVENLİK AYARLARI ---
app.use(cors({
    origin: [
        "https://www.odevai.pro", 
        "https://odevai.pro",
        "http://localhost:3000", 
        "https://odevai-frontend.vercel.app"
    ],
    credentials: true, // Token/Cookie izni
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// --------------------------------

// 50 MB'a kadar dosya kabul et (Büyük PDF'ler için şart)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Veritabanına Bağlan
connectDB();

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);   // Kayıt, Giriş
app.use("/api/ai", aiRoutes);       // AI Ödev İşlemleri (Kredi kontrolü burada olmalı)
app.use("/api/pdf", pdfRoutes);     // PDF Araçları
app.use("/api/admin", adminRoutes); // Admin Paneli (YENİ EKLENDİ)

// Uploads klasörünü dışarıya aç (Gerekirse resim/dosya linki vermek için)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- PORT AYARI ---
// Cloudflare için 80, Local için env.PORT
const PORT = process.env.PORT || 80;

app.listen(PORT, () => console.log(`🔥 Backend ${PORT} portunda çalışıyor`));