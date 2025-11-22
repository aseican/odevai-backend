require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

// --- ROTA DOSYALARINI İÇERİ AL ---
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
//const shopierRoutes = require("./routes/shopierRoutes");

const app = express();

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- CORS AYARLARI (GÜVENLİK VE İZİNLER) ---
// Buraya sitenin tüm varyasyonlarını ekliyoruz
const allowedOrigins = [
  "https://www.odevai.pro",  // Hata veren adres buydu
  "https://odevai.pro",
  "https://api.odevai.pro",
  "http://localhost:5173",   // Local test için
  "http://localhost:3000",
];

app.use(cors({
    origin: (origin, callback) => {
      // origin null ise (bazen mobilden veya postman'den gelirse) izin ver
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS Engellendi:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// Büyük dosyalar için limitleri artır (OCR için şart)
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
//app.use("/api/shopier", shopierRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Backend Çalışıyor! 🚀 (OCR Ready)"));

// --- PORT AYARI ---
const PORT = 5000;

const server = app.listen(PORT, "0.0.0.0", () => 
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);

// --- KRİTİK AYAR: ZAMAN AŞIMI (TIMEOUT) ---
// OCR işlemleri uzun sürer (özellikle taranmış PDF'ler).
// Varsayılan 2 dakikadır, bunu 10 dakikaya (600.000 ms) çıkarıyoruz.
server.setTimeout(600000);