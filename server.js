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

// --- CORS AYARLARI (Güçlü ve Preflight uyumlu) ---
const allowedOrigins = [
  "https://www.odevai.pro",
  "https://odevai.pro",
  "https://odevai-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // origin yoksa (örn: Postman) veya whitelist'teyse izin ver
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("🚫 CORS Engellendi:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ⭐ Preflight (OPTIONS) isteklerini mutlaka kabul et
app.options("*", cors());

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

app.listen(PORT, () =>
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);
