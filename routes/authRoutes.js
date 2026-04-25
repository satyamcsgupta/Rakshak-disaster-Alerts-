const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated, requireAuth } = require('../middleware/authMiddleware');

router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', authController.register);
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', authController.login);
router.get('/profile', requireAuth, authController.showProfile);
router.post('/profile', requireAuth, authController.updateProfile);
router.post('/logout', authController.logout);

module.exports = router;
