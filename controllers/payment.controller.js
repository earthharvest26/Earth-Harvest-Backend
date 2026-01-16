const axios = require("axios");
const Order = require("../models/order");
const Payment = require("../models/payment");
const Product = require("../models/product");
const User = require("../models/user");
const { sendOrderConfirmationEmail } = require("../utils/emailService");

/**
 * Create payment link using Nomod API
 * Requires authentication
 */
exports.createPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId and amount are required"
      });
    }

    // Verify order belongs to user
    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).populate("product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid"
      });
    }

    // Prepare payment items
    const product = order.product;
    const items = [{
      name: product.productName || "Earth & Harvest Product",
      amount: amount.toString(), // Nomod expects STRING
      quantity: order.quantity
    }];

    const response = await axios.post(
      "https://api.nomod.com/v1/links",
      {
        currency: "AED",
        title: "Earth & Harvest Order",
        note: `Order ID: ${orderId}`,
        items: items,
        success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-success?orderId=${orderId}`,
        failure_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-failure?orderId=${orderId}`,
        shipping_address_required: true
      },
      {
        headers: {
          "X-API-KEY": process.env.NOMOD_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    // Save payment record
    await Payment.create({
      user: userId,
      orderId: orderId,
      paymentId: response.data.id || response.data.link_id,
      amount: parseFloat(amount),
      status: "Pending"
    });

    res.status(200).json({
      success: true,
      paymentUrl: response.data.url || response.data.checkout_url,
      paymentId: response.data.id || response.data.link_id
    });

  } catch (error) {
    console.error(
      "Create payment error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Payment creation failed",
      error: error.response?.data || error.message
    });
  }
};

/**
 * Handle payment webhook/callback from Nomod
 * This should be called by Nomod when payment is completed
 */
exports.paymentCallback = async (req, res) => {
  try {
    const { payment_id, order_id, status, amount } = req.body;

    if (!payment_id || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ paymentId: payment_id });

    if (!payment) {
      console.error("Payment record not found for payment_id:", payment_id);
      return res.status(404).json({
        success: false,
        message: "Payment record not found"
      });
    }

    // Update payment status
    if (status === "paid" || status === "success" || status === "completed") {
      payment.status = "Success";
    } else if (status === "failed" || status === "cancelled" || status === "expired") {
      payment.status = "Failed";
    } else {
      payment.status = "Pending";
    }
    await payment.save();

    // Update order status
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId).populate("product").populate("user");
      if (order) {
        const previousStatus = order.paymentStatus;
        order.paymentStatus = payment.status === "Success" ? "Completed" : "Failed";
        if (payment.status === "Success") {
          order.orderStatus = "Confirmed";
          
          // Update product stock
          const product = await Product.findById(order.product);
          if (product) {
            product.stock = Math.max(0, product.stock - order.quantity);
            await product.save();
          }

          // Send order confirmation email if payment just completed
          // IMPORTANT: Do this BEFORE sending response to prevent Render from killing the process
          if (previousStatus !== "Completed") {
            try {
              console.log(`📧 [Payment Callback] Attempting to send order confirmation email...`);
              const user = await User.findById(order.user);
              if (user && user.email) {
                const emailResult = await sendOrderConfirmationEmail(user.email, user.name, order);
                console.log(`✅ [Payment Callback] Order confirmation email sent to ${user.email}`, {
                  messageId: emailResult?.messageId,
                  duration: emailResult?.duration
                });
              } else {
                console.warn(`⚠️  [Payment Callback] User or email not found for order ${order._id}`);
              }
            } catch (emailError) {
              // Log detailed error but don't fail the payment callback
              console.error("❌ [Payment Callback] Failed to send order confirmation email:", {
                error: emailError.message,
                stack: emailError.stack,
                orderId: order._id
              });
              // Payment is still successful even if email fails
            }
          }
        }
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment status updated"
    });

  } catch (error) {
    console.error("Payment callback error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.params;

    const payment = await Payment.findOne({
      user: userId,
      orderId: orderId
    }).populate("orderId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Test payment - Simulates successful payment without actual payment gateway
 * Only works when ENABLE_TEST_PAYMENT=true in environment
 */
exports.testPayment = async (req, res) => {
  try {
    // Only allow in development or when explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_PAYMENT !== 'true') {
      return res.status(403).json({
        success: false,
        message: "Test payment is disabled in production"
      });
    }

    const userId = req.userId;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required"
      });
    }

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).populate("product").populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid"
      });
    }

    // Find or create payment record
    let payment = await Payment.findOne({ orderId: orderId });
    if (!payment) {
      payment = await Payment.create({
        user: userId,
        orderId: orderId,
        paymentId: `test_${Date.now()}`,
        amount: parseFloat(order.amountPaid),
        status: "Success"
      });
    } else {
      payment.status = "Success";
      payment.paymentId = payment.paymentId || `test_${Date.now()}`;
      await payment.save();
    }

    // Update order status
    order.paymentStatus = "Completed";
    order.orderStatus = "Confirmed";
    await order.save();

    // Update product stock
    const product = await Product.findById(order.product);
    if (product) {
      product.stock = Math.max(0, product.stock - order.quantity);
      await product.save();
    }

    // Send order confirmation email
    // IMPORTANT: Do this BEFORE sending response to prevent Render from killing the process
    try {
      console.log(`📧 [Test Payment] Attempting to send order confirmation email...`);
      const user = await User.findById(order.user);
      if (user && user.email) {
        const emailResult = await sendOrderConfirmationEmail(user.email, user.name, order);
        console.log(`✅ [Test Payment] Order confirmation email sent to ${user.email}`, {
          messageId: emailResult?.messageId,
          duration: emailResult?.duration
        });
      } else {
        console.warn(`⚠️  [Test Payment] User or email not found for order ${order._id}`);
      }
    } catch (emailError) {
      console.error("❌ [Test Payment] Failed to send order confirmation email:", {
        error: emailError.message,
        stack: emailError.stack,
        orderId: order._id
      });
      // Test payment is still successful even if email fails
    }

    res.status(200).json({
      success: true,
      message: "Test payment completed successfully",
      data: {
        order: {
          _id: order._id,
          orderId: order._id, // Also include as orderId for compatibility
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
          quantity: order.quantity,
          sizeSelected: order.sizeSelected,
          address: order.address,
          product: order.product,
          createdAt: order.createdAt
        },
        payment: {
          status: payment.status,
          amount: payment.amount
        }
      }
    });

  } catch (error) {
    console.error("Test payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Verify payment and send confirmation email if needed
 * Called from frontend after payment success redirect
 */
exports.verifyPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.params;

    // Get order with populated product and user
    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).populate("product").populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Get payment status
    const payment = await Payment.findOne({
      user: userId,
      orderId: orderId
    });

    // If payment is successful and order is confirmed, ensure email is sent
    // This is a fallback in case the webhook didn't trigger the email
    if (order.paymentStatus === "Completed" && order.orderStatus === "Confirmed") {
      try {
        console.log(`📧 [Verify Payment] Attempting to send order confirmation email (fallback)...`);
        const user = await User.findById(order.user);
        if (user && user.email) {
          const emailResult = await sendOrderConfirmationEmail(user.email, user.name, order);
          console.log(`✅ [Verify Payment] Order confirmation email sent to ${user.email}`, {
            messageId: emailResult?.messageId,
            duration: emailResult?.duration
          });
        } else {
          console.warn(`⚠️  [Verify Payment] User or email not found for order ${order._id}`);
        }
      } catch (emailError) {
        console.error("❌ [Verify Payment] Failed to send order confirmation email:", {
          error: emailError.message,
          stack: emailError.stack,
          orderId: order._id
        });
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
          product: order.product,
          quantity: order.quantity,
          sizeSelected: order.sizeSelected,
          address: order.address,
          createdAt: order.createdAt
        },
        payment: payment ? {
          status: payment.status,
          amount: payment.amount
        } : null
      }
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
