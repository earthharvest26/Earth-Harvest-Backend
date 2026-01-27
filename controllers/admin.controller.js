const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const Payment = require("../models/payment");
const { sendOrderStatusUpdateEmail } = require("../utils/emailService");

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: "Pending" });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "Success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const recentOrders = await Order.find()
      .populate("user", "name email")
      .populate("product", "productName")
      .sort({ createdAt: -1 })
      .limit(10);

    const lowStockProducts = await Product.find({ stock: { $lte: 10 } })
      .select("productName stock")
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          pendingOrders,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentOrders,
        lowStockProducts
      }
    });

  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Create new product
 */
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.productName || !productData.sizes || productData.sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product name and at least one size are required"
      });
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });

  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get all products (admin view with all details)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, enabled } = req.query;

    const query = {};
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get all products (admin) error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Toggle product enabled/disabled status
 */
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "enabled must be a boolean value"
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { enabled },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Product ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: product
    });

  } catch (error) {
    console.error("Toggle product status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get all orders (admin view)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentStatus } = req.query;

    const query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("product", "productName images")
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
    console.error("Get all orders (admin) error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Update order status (admin)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!orderStatus || !["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"].includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid order status is required"
      });
    }

    // Get current order to check if status changed
    const currentOrder = await Order.findById(id).populate("user", "name email").populate("product", "productName");
    
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const previousStatus = currentOrder.orderStatus;

    // Update order status
    const order = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true }
    ).populate("user", "name email").populate("product", "productName");

    // Send email notification if status changed and order is not pending
    if (previousStatus !== orderStatus && orderStatus !== "Pending" && order.user) {
      try {
        console.log(`📧 [Admin Order Update] Attempting to send order status update email...`);
        const emailResult = await sendOrderStatusUpdateEmail(
          order.user.email,
          order.user.name,
          order,
          orderStatus
        );
        console.log(`✅ [Admin Order Update] Order status update email sent to ${order.user.email}`, {
          messageId: emailResult?.messageId,
          duration: emailResult?.duration
        });
      } catch (emailError) {
        // Log error but don't fail the request
        console.error("❌ [Admin Order Update] Failed to send order status update email:", {
          error: emailError.message,
          stack: emailError.stack,
          orderId: order._id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order
    });

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get all users (admin view)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select("-otp -otpExpiry")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get all users (admin) error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Update user role (admin)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Valid role (user/admin) is required"
      });
    }

    // Prevent admin from removing their own admin role
    if (id === req.userId.toString() && role === "user") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin privileges"
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-otp -otpExpiry");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user
    });

  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get user details with order history
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-otp -otpExpiry -password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user orders
    const orders = await Order.find({ user: id })
      .populate("product", "productName images")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        user,
        orders
      }
    });

  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Toggle user blocked status
 */
exports.toggleUserBlockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isBlocked must be a boolean value"
      });
    }

    // Prevent admin from blocking themselves
    if (id === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block yourself"
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked },
      { new: true }
    ).select("-otp -otpExpiry -password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: user
    });

  } catch (error) {
    console.error("Toggle user block status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get all payments (admin view)
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get all payments (admin) error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

