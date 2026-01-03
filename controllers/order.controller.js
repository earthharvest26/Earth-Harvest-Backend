const Order = require("../models/order");
const Product = require("../models/product");
const Cart = require("../models/cart");

/**
 * Create order from cart or direct purchase
 * Requires authentication
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      productId,
      sizeSelected,
      quantity,
      address,
      amount,
      fromCart = false,
      cartItemId = null
    } = req.body;

    if (!productId || !sizeSelected || !quantity || !address || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: productId, sizeSelected, quantity, address, and amount are required"
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

    // Verify size and calculate price
    const selectedSize = product.sizes.find(
      s => s.weight.toString() === sizeSelected || s.weight === sizeSelected
    );

    if (!selectedSize) {
      return res.status(400).json({
        success: false,
        message: "Invalid size selected"
      });
    }

    // Verify stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} items available.`
      });
    }

    // Create order
    const order = await Order.create({
      user: userId,
      product: productId,
      sizeSelected,
      quantity,
      address,
      amountPaid: amount.toString(),
      paymentStatus: "Pending",
      orderStatus: "Pending"
    });

    // If order was created from cart, remove item from cart
    if (fromCart && cartItemId) {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cart.items.pull(cartItemId);
        await cart.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: order._id,
        amount: parseFloat(amount)
      }
    });

  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get order by ID
 * Requires authentication
 */
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).populate("product", "productName images sizes rating");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get all orders for authenticated user
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 50, page = 1 } = req.query;

    const query = { user: userId };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate("product", "productName images sizes")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Cancel order (user can only cancel pending orders)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.orderStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled"
      });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order
    });

  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
