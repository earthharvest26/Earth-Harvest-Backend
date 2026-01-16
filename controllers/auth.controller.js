const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
    // IMPORTANT: Do this BEFORE sending response to prevent Render from killing the process
    let emailResult;
    try {
      console.log(`📧 [Send OTP] Attempting to send OTP email to ${email}...`);
      emailResult = await sendOTPEmail(email, otp, user.name);
      
      // If dev mode returned, it's still successful
      if (emailResult && emailResult.devOtp) {
        console.log(`✅ [Send OTP] OTP generated (dev mode). Check console for OTP code.`);
      } else {
        console.log(`✅ [Send OTP] OTP email sent successfully`, {
          messageId: emailResult?.messageId,
          duration: emailResult?.duration
        });
      }
    } catch (emailError) {
      console.error('❌ [Send OTP] Email sending failed:', {
        error: emailError.message || emailError,
        stack: emailError.stack,
        email: email
      });
      
      // In development or if ALLOW_DEV_OTP is set, allow OTP to be shown in console
      if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
        console.log(`\n🔑 ==========================================`);
        console.log(`🔑 DEV MODE: OTP for ${email}`);
        console.log(`🔑 OTP Code: ${otp}`);
        console.log(`🔑 ==========================================\n`);
        // Continue - don't fail the request in dev mode
      } else {
        // In production, return error if email fails
        return res.status(500).json({
          success: false,
          message: emailError.message || "Failed to send OTP email. Please check your email configuration."
        });
      }
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
 * Check if email belongs to an admin (public endpoint for frontend)
 */
exports.checkAdminEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        isAdmin: false
      });
    }

    res.status(200).json({
      success: true,
      isAdmin: user.role === 'admin' && !!user.password
    });

  } catch (error) {
    console.error("Error in checkAdminEmail:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Admin login with password
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required. Please use OTP login for regular users."
      });
    }

    // Check if password is set
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Password not set. Please contact administrator to set your password."
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Update last login and verification status
    user.isVerified = true;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in adminLogin:", error);
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