const express = require("express");
const router = express.Router();
// Yeni fonksiyonları (forgotPassword, resetPassword) buraya ekledik:
const { 
  register, 
  login, 
  me, 
  updateDetails, 
  forgotPassword, 
  resetPassword 
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// --- HERKES ERİŞEBİLİR (Public) ---
router.post("/register", register);
router.post("/login", login);

// Şifre İşlemleri
router.post("/forgotpassword", forgotPassword); // Mail gönderme isteği
router.put("/resetpassword/:resetToken", resetPassword); // Yeni şifre belirleme (Token URL'den gelir)

// --- SADECE GİRİŞ YAPANLAR (Protected) ---
router.get("/me", protect, me);
router.put("/updateDetails", protect, updateDetails);

module.exports = router;