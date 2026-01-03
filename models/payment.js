const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  orderId: { type: String, required: true },
  paymentId: { type: String, required: true },
  signature: String,

  amount: { type: Number, required: true },

  status: {
    type: String,
    enum: ["Pending", "Success", "Failed"],
    default: "Pending"
  },

  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({user:1});

module.exports = mongoose.model("Payment", paymentSchema);
