const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit"); // EKLENDİ

const { 
  register, 
  login, 
  me, 
  updateDetails, 
  forgotPassword, 
  resetPassword 
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// --- GÜVENLİK DUVARI: RATE LIMITER ---
// Aynı IP'den 24 saat içinde sadece 2 hesap açabilsin
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 Saat
  max: 2, // Maksimum 2 deneme
  message: { message: "Bu IP adresinden çok fazla hesap oluşturuldu. Lütfen daha sonra tekrar deneyin." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- HERKES ERİŞEBİLİR (Public) ---
router.post("/register", registerLimiter, register); // LİMİTERİ BURAYA EKLEDİK
router.post("/login", login);

// Şifre İşlemleri
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:resetToken", resetPassword);

// --- SADECE GİRİŞ YAPANLAR (Protected) ---
router.get("/me", protect, me);
router.put("/updateDetails", protect, updateDetails);

module.exports = router;