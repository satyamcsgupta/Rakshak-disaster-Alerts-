const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/checkin', requireAuth, statusController.checkIn);
router.get('/me', requireAuth, statusController.getMyCheckIn);

module.exports = router;
