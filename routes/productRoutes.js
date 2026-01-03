const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getFeaturedProducts
} = require("../controllers/product.controller");

// Public routes - no authentication required
router.get("/", getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductById);

module.exports = router;

