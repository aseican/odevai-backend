const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
  getStats,
  getUsers,
  updateCredits,
  updatePrompt,
  updateFeatures
} = require("../controllers/adminController");

// Admin → Tüm rotalar protect + admin
router.use(protect);
router.use(admin);

/* ROUTES */
router.get("/stats", getStats);
router.get("/users", getUsers);

router.post("/credits", updateCredits);
router.post("/prompt", updatePrompt);
router.post("/features", updateFeatures);

module.exports = router;
