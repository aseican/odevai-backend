require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

// --- ROTA DOSYALARINI İÇERİ AL ---
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const pdfRoutes = require("./routes/pdfRoutes"); // Varsa açarsın
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const shopierRoutes = require("./routes/shopierRoutes"); // Shopier rotası eklendi

const app = express();

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- CORS AYARLARI ---
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

app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- ROTALARI AKTİF ET ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/shopier", shopierRoutes); // Shopier rotası aktif

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("Backend Çalışıyor! 🚀"));

// --- PORT AYARI ---
const PORT = 5000;

// Sunucuyu başlat ve zaman aşımını artır
const server = app.listen(PORT, "0.0.0.0", () => 
  console.log(`🔥 Backend ${PORT} portunda çalışıyor`)
);

// Zaman aşımı süresini 5 dakikaya (300.000 ms) çıkarıyoruz
// Sunum oluşturma gibi uzun işlemler için bu gereklidir.
server.setTimeout(300000);