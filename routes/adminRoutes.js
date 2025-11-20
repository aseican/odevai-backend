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
router.put("/users/:id", updateUser);   // Kullanıcı düzenle

// Ayar güncellemeleri (PUT yaptık)
router.put("/update-prompt", updatePrompt);
router.put("/update-features", updateFeatures);

module.exports = router;