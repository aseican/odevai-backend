const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  aiHomework,
  aiPdfSummary,
  aiPdfQuestions
} = require('../controllers/aiController');

router.post('/homework', protect, aiHomework);
router.post('/pdf-summary', protect, aiPdfSummary);
router.post('/pdf-questions', protect, aiPdfQuestions);

module.exports = router;
