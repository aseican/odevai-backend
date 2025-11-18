const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { listTasks } = require('../controllers/taskController');

router.get('/', protect, listTasks);

module.exports = router;
