const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/emailService');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

/**
 * Send OTP to user email for login
 * Triggered when user clicks "Buy" or "Add to Cart"
 */
exports.sendOTP = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    let user = await User.findOne({ email: email });

    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (!user) {
      // Create new user
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required for new users"
        });
      }
      user = new User({
        name: name,
        email: email,
        role: 'user',
        isVerified: false
      });
    } else if (name && user.name !== name) {
      // Update name if provided and different
      user.name = name;
    }

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Still return success but log the error
      // In production, you might want to handle this differently
    }

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${email}`,
      email: email
    });

  } catch (error) {
    console.error("Error in sendOTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Verify OTP and return JWT token
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please request OTP first."
      });
    }

    if (!user.otp || user.otp !== Number(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (!user.otpExpiry || Date.now() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-otp -otpExpiry');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, countryCode, address } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (countryCode) user.countryCode = countryCode;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};