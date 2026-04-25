const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', alertController.homePage);
router.get('/alerts', requireAuth, alertController.userAlertList);
router.get('/alerts/:id', requireAuth, alertController.alertDetails);
router.post('/alerts/:id/safe', requireAuth, alertController.markAsSafe);
router.get('/preparedness', alertController.preparednessGuide);

module.exports = router;
