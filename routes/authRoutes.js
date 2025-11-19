const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Bu adrese POST isteği gelirse 'register' fonksiyonunu çalıştır
router.post("/register", register);

// Bu adrese POST isteği gelirse 'login' fonksiyonunu çalıştır
router.post("/login", login);

// Bu adrese GET isteği gelirse ÖNCE 'protect' (token kontrolü) yap, sonra 'me' çalıştır
router.get("/me", protect, me);

module.exports = router;