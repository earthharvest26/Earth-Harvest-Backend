const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: String,
    countryCode: String,
    address:{
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: Number
    },
    otp: Number,
    otpExpiry : {
        type: Date
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    }
},{timestamps: true});

userSchema.index({email:1});

module.exports = mongoose.model('User',userSchema);