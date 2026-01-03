const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middleware/auth");
const {
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUserRole,
  getAllPayments
} = require("../controllers/admin.controller");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Product management
router.get("/products", getAllProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Order management
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);

// User management
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);

// Payment management
router.get("/payments", getAllPayments);

module.exports = router;

