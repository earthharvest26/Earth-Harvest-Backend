const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { 
  addToCart, 
  getCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} = require("../controllers/cart.controller");

// All cart routes require authentication
router.use(authenticate);

router.post("/add", addToCart);
router.get("/", getCart);
router.put("/update", updateCartItem);
router.delete("/item/:itemId", removeFromCart);
router.delete("/clear", clearCart);

module.exports = router;
