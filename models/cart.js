import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  user: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User",
     required: true 
    },

  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      size: String,
      quantity: Number
    }
  ],
},{timestamps:true});

cartSchema.index({user:1});

export default mongoose.model("Cart", cartSchema);
