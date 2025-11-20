const express = require("express");
const router = express.Router();
const { startPayment, paymentCallback } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/start", protect, startPayment);
router.post("/callback", paymentCallback);

module.exports = router;