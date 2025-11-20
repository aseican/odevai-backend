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

const app = express();

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- CORS AYARLARI (Cloudflare uyumlu, Preflight tam çalışır) ---
const allowedOrigins = [
  "https://www.odevai.pro",
  "https://odevai.pro",
  "https://odevai-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Preflight (OPTIONS) – TARAYICININ ZORUNLU İSTEDİĞİ CEVAP
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  // Preflight isteklerini hemen yanıtlıyoruz
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Ana CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("🚫 CORS Engellendi:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 50 MB'a kadar dosya kabul et
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/admin", adminRoutes);

// Uploads klasörünü dışarı aç
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Sağlık Kontrolü
app.get("/", (req, res) => res.send("Backend Çalışıyor!"));

// --- PORT AYARI ---
const PORT = process.env.PORT || 80;

app.listen(PORT, "0.0.0.0", () => 
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);
