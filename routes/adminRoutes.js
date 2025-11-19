const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { 
  getAllUsers, 
  updateUser, 
  getStats, 
  updatePrompt, 
  updateFeatures 
} = require("../controllers/adminController");

// Tüm admin işlemleri için önce Giriş(protect) sonra Admin Yetkisi(admin) kontrolü yapılır
router.use(protect, admin);

router.get("/stats", getStats);         // İstatistikler
router.get("/users", getAllUsers);      // Kullanıcı listesi
router.put("/users/:id", updateUser);   // Kullanıcı düzenle (Kredi/Ban)

// Senin özel ayarların
router.post("/update-prompt", updatePrompt);
router.post("/update-features", updateFeatures);

module.exports = router;