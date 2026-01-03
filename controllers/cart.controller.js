const Cart = require("../models/cart");
const Product = require("../models/product");

/**
 * Add item to cart
 * Requires authentication
 */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, size, quantity = 1 } = req.body;

    if (!productId || !size) {
      return res.status(400).json({
        success: false,
        message: "Product ID and size are required"
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Verify size exists in product
    const sizeExists = product.sizes.some(s => s.weight.toString() === size || s.weight === size);
    if (!sizeExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid size for this product"
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        size,
        quantity
      });
    }

    await cart.save();

    // Populate product details
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      data: cart
    });

  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get user's cart
 * Requires authentication
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product", "productName images sizes rating totalReviews");

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [], user: userId }
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });

  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, quantity } = req.body;

    if (!itemId || quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Item ID and valid quantity are required"
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart"
      });
    }

    if (quantity === 0) {
      // Remove item
      cart.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: cart
    });

  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.items.pull(itemId);
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      data: cart
    });

  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart
    });

  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
