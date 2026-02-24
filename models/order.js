const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Product'
    },
    sizeSelected: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: Number,
        phone: String
    },
    amountPaid: String,
    originalAmount: String, // Original amount before discount
    discountAmount: String, // Discount amount
    discountPercentage: { type: Number, default: 0 }, // Discount percentage applied
    paymentId: String,
    paymentStatus: {
        type: String,
        enum: ["Pending","Completed","Failed"],
        default: "Pending"
    },
    orderStatus: {
        type: String,
        enum: ["Pending","Confirmed","Shipped","Delivered","Cancelled"],
        default: "Pending"
    }
},{timestamps:true});

orderSchema.index({user:1});

orderSchema.index({user:1,product:1});

module.exports = mongoose.model('Order',orderSchema);