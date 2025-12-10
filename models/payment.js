import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  orderId: String,
  paymentId: String,
  signature: String,

  amount: Number,

  status: {
    type: String,
    enum: ["Success", "Failed"],
    default: "Success"
  },

  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({user:1});

export default mongoose.model("Payment", paymentSchema);
