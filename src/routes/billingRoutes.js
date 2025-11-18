const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPayment,
  paytrCallback
} = require('../controllers/billingController');

router.post('/create-payment', protect, createPayment);
router.post('/paytr-callback', paytrCallback); // PayTR sunucusundan çağrılır

module.exports = router;
