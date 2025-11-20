const express = require("express");
const router = express.Router();
const { startPayment, callback } = require("../controllers/shopierController");
const { protect } = require("../middleware/authMiddleware");

// Ödeme Başlat (Form HTML'i döner)
router.post("/payment", protect, startPayment);

// Callback (Shopier buraya POST atar)
router.post("/callback", express.urlencoded({ extended: true }), callback);

module.exports = router;