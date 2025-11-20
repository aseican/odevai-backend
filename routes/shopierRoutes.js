const express = require("express");
const router = express.Router();
const { startPayment, callback } = require("../controllers/shopierController");
const { protect } = require("../middleware/authMiddleware");

router.post("/payment", protect, startPayment);
router.post("/callback", express.urlencoded({ extended: true }), callback);

module.exports = router;
