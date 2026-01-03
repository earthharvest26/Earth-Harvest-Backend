const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { 
  createOrder, 
  getOrderById, 
  getUserOrders, 
  cancelOrder 
} = require("../controllers/order.controller");

// All order routes require authentication
router.use(authenticate);

router.post("/create", createOrder);
router.get("/", getUserOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

module.exports = router;
