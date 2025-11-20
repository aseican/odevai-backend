require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

// --- ROTA DOSYALARINI İÇERİ AL ---
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const pdfRoutes = require("./routes/pdfRoutes"); // Varsa
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); // Ödeme rotası

const app = express();

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- CORS AYARLARI (Gelişmiş Güvenlik) ---
const allowedOrigins = [
  "https://www.odevai.pro",
  "https://odevai.pro",
  "https://odevai-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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

// Dosya boyutu limiti (PDF yüklemeleri için)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes); // Eğer pdfRoutes dosyan varsa kullan
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

// Uploads klasörünü dışarı aç
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Sağlık Kontrolü
app.get("/", (req, res) => res.send("Backend (API) Çalışıyor! 🚀"));

// --- PORT AYARI (KRİTİK DÜZELTME) ---
// Port 80 dolu olduğu için 5000 kullanıyoruz!
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => 
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);