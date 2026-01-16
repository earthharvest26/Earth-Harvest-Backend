const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { 
  createPayment, 
  paymentCallback, 
  getPaymentStatus,
  verifyPayment,
  testPayment
} = require("../controllers/payment.controller");

// Public route for Nomod webhook (no auth required)
router.post("/callback", paymentCallback);

// Protected routes
router.use(authenticate);
router.post("/create", createPayment);
router.post("/test", testPayment); // Test payment endpoint
router.get("/status/:orderId", getPaymentStatus);
router.get("/verify/:orderId", verifyPayment);

module.exports = router;
