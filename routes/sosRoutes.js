const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', requireAuth, sosController.createSOS);

module.exports = router;
