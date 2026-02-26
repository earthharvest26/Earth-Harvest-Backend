const Order = require("../models/order");
const Product = require("../models/product");
const Cart = require("../models/cart");
const User = require("../models/user");
const { calculateBulkDiscount } = require("../utils/discount");

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
    console.log("Looking for product with ID:", productId);
    const product = await Product.findById(productId);
    if (!product) {
      console.error("Product not found for ID:", productId);
      // Try to list available products for debugging
      const availableProducts = await Product.find({}).select('_id productName').limit(5);
      console.log("Available products:", availableProducts.map(p => ({ id: p._id, name: p.productName })));
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${productId}`
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

    // Calculate price with bulk discount (10 dirhams off per packet for 5+ packets)
    const priceCalculation = calculateBulkDiscount(quantity, selectedSize.price);
    const finalAmount = priceCalculation.finalAmount;

    // Validate that the provided amount matches the calculated amount (with tolerance for rounding)
    const amountDifference = Math.abs(parseFloat(amount) - finalAmount);
    if (amountDifference > 0.01) {
      console.warn(`Amount mismatch: provided=${amount}, calculated=${finalAmount}`);
      // Use calculated amount for security
    }

    // Normalize phone number in address (remove spaces) if present
    const normalizedAddress = { ...address };
    if (normalizedAddress.phone) {
      normalizedAddress.phone = normalizedAddress.phone.replace(/\s+/g, '');
    }

    // Save address to user profile if user doesn't have one or if it's incomplete
    const user = await User.findById(userId);
    if (user) {
      const hasIncompleteAddress = !user.address || 
        !user.address.street || 
        !user.address.city || 
        !user.address.state || 
        !user.address.country;
      
      if (hasIncompleteAddress && normalizedAddress.street && normalizedAddress.city && normalizedAddress.state) {
        // Update user address with the address from checkout
        user.address = {
          street: normalizedAddress.street,
          city: normalizedAddress.city,
          state: normalizedAddress.state,
          country: normalizedAddress.country || "United Arab Emirates",
          zipCode: normalizedAddress.zipCode || user.address?.zipCode
        };
        
        // Also update phone number if provided and user doesn't have one
        if (normalizedAddress.phone && !user.phoneNumber) {
          user.phoneNumber = normalizedAddress.phone;
        }
        
        // Update name if provided and user doesn't have one
        if (normalizedAddress.name && !user.name) {
          user.name = normalizedAddress.name;
        }
        
        await user.save();
      }
    }

    // Create order
    const order = await Order.create({
      user: userId,
      product: productId,
      sizeSelected,
      quantity,
      address: normalizedAddress,
      amountPaid: finalAmount.toFixed(2),
      originalAmount: priceCalculation.originalAmount.toFixed(2),
      discountAmount: priceCalculation.discountAmount.toFixed(2),
      discountPercentage: priceCalculation.hasDiscount ? (priceCalculation.discountAmount / priceCalculation.originalAmount * 100) : 0, // Calculate percentage for display
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
        _id: order._id,
        orderId: order._id, // For compatibility
        amount: finalAmount,
        originalAmount: priceCalculation.originalAmount,
        discountAmount: priceCalculation.discountAmount,
        discountPercentage: priceCalculation.hasDiscount ? (priceCalculation.discountAmount / priceCalculation.originalAmount * 100) : 0, // Calculate percentage for display
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
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
