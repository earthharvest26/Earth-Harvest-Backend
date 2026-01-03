const axios = require("axios");
const Order = require("../models/order");
const Payment = require("../models/payment");
const Product = require("../models/product");

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
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = payment.status === "Success" ? "Completed" : "Failed";
        if (payment.status === "Success") {
          order.orderStatus = "Confirmed";
          
          // Update product stock
          const product = await Product.findById(order.product);
          if (product) {
            product.stock = Math.max(0, product.stock - order.quantity);
            await product.save();
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
