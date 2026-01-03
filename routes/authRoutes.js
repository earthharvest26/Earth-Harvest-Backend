const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const express = require('express');

const router = express.Router();

// Public routes
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOtp);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;


