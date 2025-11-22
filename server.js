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
// const shopierRoutes = require("./routes/shopierRoutes"); // HATA VERDİĞİ İÇİN KAPALI

const app = express();

// --- TRUST PROXY AYARI (Nginx İçin Şart) ---
// Rate limit ve IP loglamanın doğru çalışması için
app.set('trust proxy', 1);

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- CORS AYARLARI (GÜVENLİK VE İZİNLER) ---
const allowedOrigins = [
  "https://www.odevai.pro",
  "https://odevai.pro",
  "https://api.odevai.pro",
  "https://odevai-frontend.vercel.app", // Frontend Adresin
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(cors({
    origin: (origin, callback) => {
      // Postman veya Server-to-Server isteklerde origin null olabilir, izin veriyoruz
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

// --- DOSYA BOYUTU LİMİTLERİ ---
// Büyük PDF ve Resimler için limitleri artırdık
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
// app.use("/api/shopier", shopierRoutes); // GEÇİCİ KAPALI

// Uploads klasörünü dışarıya aç (Resim/Dosya erişimi için)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Backend Çalışıyor! 🚀 (Timeout: 10dk)"));

// --- PORT VE SUNUCU BAŞLATMA ---
const PORT = 5000;

const server = app.listen(PORT, "0.0.0.0", () => 
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);

// --- KRİTİK: ZAMAN AŞIMI AYARI ---
// Varsayılan 2 dakikadır. OCR işlemleri 3-5 dakika sürebilir.
// Bunu 10 dakikaya (600.000 ms) çıkarıyoruz.
server.setTimeout(600000);