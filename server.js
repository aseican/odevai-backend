require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const pdfRoutes = require("./routes/pdfRoutes");

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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Tüm metodlara izin ver
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// --------------------------------

// 50 MB'a kadar dosya kabul et (Yoksa büyük PDF'lerde patlar)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

connectDB();

// Rotalar
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);

// --- KRİTİK: PORT 80 AYARI ---
// Cloudflare direkt buraya bağlanacak
app.listen(80, () => console.log("🔥 Backend 80 portunda çalışıyor"));