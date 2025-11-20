const express = require("express");
const router = express.Router();
const { register, login, me, updateDetails } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Herkes erişebilir
router.post("/register", register);
router.post("/login", login);

// Sadece giriş yapanlar erişebilir (protect)
router.get("/me", protect, me);
router.put("/updateDetails", protect, updateDetails); // <-- YENİ EKLENEN SATIR

module.exports = router;