const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middleware/auth");
const {
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  toggleProductStatus,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  getUserDetails,
  updateUserRole,
  toggleUserBlockStatus,
  getAllPayments
} = require("../controllers/admin.controller");
const { uploadFile } = require("../controllers/upload.controller");
const { updateLandingPageMedia } = require("../controllers/landingPageMedia.controller");
const upload = require("../middleware/upload");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Product management
router.get("/products", getAllProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.patch("/products/:id/toggle", toggleProductStatus);
router.delete("/products/:id", deleteProduct);

// Order management
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);

// User management
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetails);
router.put("/users/:id/role", updateUserRole);
router.patch("/users/:id/block", toggleUserBlockStatus);

// Payment management
router.get("/payments", getAllPayments);

// File upload
router.post("/upload", upload.single('file'), uploadFile);

// Landing page media management
router.put("/landing-page-media", updateLandingPageMedia);

module.exports = router;

