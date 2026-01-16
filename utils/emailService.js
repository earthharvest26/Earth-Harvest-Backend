const { Resend } = require('resend');

/**
 * ============================================
 * PRODUCTION-SAFE EMAIL SERVICE
 * ============================================
 * 
 * This service includes:
 * - Comprehensive environment variable validation
 * - Detailed logging for production debugging
 * - Graceful error handling
 * - Render.com deployment compatibility
 */

// ============================================
// ENVIRONMENT VARIABLE VALIDATION & LOGGING
// ============================================

const logEnvStatus = () => {
  const envVars = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ SET' : '❌ MISSING',
    FROM_EMAIL: process.env.FROM_EMAIL ? `✅ SET (${process.env.FROM_EMAIL})` : '❌ MISSING (using fallback)',
    NODE_ENV: process.env.NODE_ENV || 'not set',
  };

  console.log('\n📧 ============================================');
  console.log('📧 EMAIL SERVICE ENVIRONMENT CHECK');
  console.log('📧 ============================================');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`📧 ${key}: ${value}`);
  });
  console.log('📧 ============================================\n');
};

// Log environment status on module load (only once)
if (!global._emailServiceInitialized) {
  logEnvStatus();
  global._emailServiceInitialized = true;
}

// Validate and initialize Resend client
let resend = null;
let FROM_EMAIL = null;

try {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY is not set. Email functionality will be disabled.');
    console.warn('⚠️  Set RESEND_API_KEY in your Render environment variables.');
  } else {
    // Validate API key format (Resend keys typically start with 're_')
    if (!apiKey.startsWith('re_')) {
      console.warn('⚠️  RESEND_API_KEY format may be incorrect. Expected format: re_xxxxx');
    }
    
    resend = new Resend(apiKey);
    console.log('✅ Resend client initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Resend client:', error.message);
  resend = null;
}

// Set FROM_EMAIL with validation
FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

if (!process.env.FROM_EMAIL) {
  console.warn('⚠️  FROM_EMAIL not set. Using fallback: onboarding@resend.dev');
  console.warn('⚠️  For production, set FROM_EMAIL to a verified domain in Resend.');
}

// Validate FROM_EMAIL format
if (FROM_EMAIL && !FROM_EMAIL.includes('@')) {
  console.error('❌ FROM_EMAIL format is invalid. Expected format: name@domain.com');
}

/**
 * Send OTP email to user
 * @param {string} email - User email address
 * @param {number} otp - OTP code
 * @param {string} name - User name
 * @returns {Promise<{success: boolean, messageId?: string, devOtp?: number}>}
 */
const sendOTPEmail = async (email, otp, name) => {
  const startTime = Date.now();
  const logPrefix = `[OTP Email] ${email}`;
  
  console.log(`\n📧 ${logPrefix} - Starting email send...`);
  console.log(`📧 ${logPrefix} - Timestamp: ${new Date().toISOString()}`);
  
  // Validate inputs
  if (!email || !otp) {
    const error = new Error('Email and OTP are required');
    console.error(`❌ ${logPrefix} - Validation failed:`, error.message);
    throw error;
  }

  // Check if email service is configured
  if (!process.env.RESEND_API_KEY || !resend) {
    console.warn(`⚠️  ${logPrefix} - Email service not configured`);
    console.warn(`⚠️  ${logPrefix} - OTP would be: ${otp}`);
    
    // In development, we can still proceed without actually sending email
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
      console.log(`\n🔑 ==========================================`);
      console.log(`🔑 DEV MODE: OTP for ${email}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`🔑 ==========================================\n`);
      return { success: true, messageId: 'dev-mode', devOtp: otp };
    }
    
    const error = new Error('Email service not configured. Please set RESEND_API_KEY in environment variables.');
    console.error(`❌ ${logPrefix} - Configuration error:`, error.message);
    throw error;
  }

  try {
    console.log(`📧 ${logPrefix} - Building email content...`);
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Earth & Harvest OTP</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #2b2b2b;
        }
        .wrapper {
          width: 100%;
          padding: 24px 12px;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .header {
          padding: 28px 24px 20px;
          text-align: center;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 140px;
          margin-bottom: 12px;
        }
        .brand {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 0.4px;
        }
        .content {
          padding: 28px 24px;
          text-align: left;
        }
        .content h2 {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 600;
        }
        .content p {
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 16px;
          color: #555;
        }
        .otp-box {
          margin: 24px 0;
          padding: 18px;
          background: #faf7f2;
          border-radius: 12px;
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #c8945c;
          border: 1px dashed #e6d5c3;
        }
        .hint {
          font-size: 13px;
          color: #777;
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
          background-color: #fafafa;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <img 
              src="https://res.cloudinary.com/dpc7tj2ze/image/upload/v1767539648/New_Logo_Tinny_transparent_v6if1w.png"
              alt="Earth & Harvest"
              class="logo"
            />
            <div class="brand">Earth & Harvest</div>
          </div>
    
          <!-- Content -->
          <div class="content">
            <h2>Hello ${name || 'there'},</h2>
            <p>
              Use the one-time password below to securely log in to your Earth & Harvest account.
            </p>
    
            <div class="otp-box">${otp}</div>
    
            <p class="hint">
              This OTP is valid for <strong>10 minutes</strong>.  
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
    
          <!-- Footer -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} Earth & Harvest</p>
            <p>Premium, natural chews — from the Himalayas to your home.</p>
          </div>
    
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
    Hello ${name || 'there'},
    
    Your one-time password for Earth & Harvest login is:
    
    ${otp}
    
    This OTP is valid for 10 minutes.
    
    If you didn't request this, you can safely ignore this email.
    
    © ${new Date().getFullYear()} Earth & Harvest
    `;

    console.log(`📧 ${logPrefix} - Sending email via Resend API...`);
    console.log(`📧 ${logPrefix} - From: ${FROM_EMAIL}`);
    console.log(`📧 ${logPrefix} - To: ${email}`);

    const emailPayload = {
      from: `Earth & Harvest <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Your One-Time Password for Earth & Harvest',
      html: htmlContent,
      text: textContent,
    };

    // Log payload (without sensitive data)
    console.log(`📧 ${logPrefix} - Payload prepared (subject: "${emailPayload.subject}")`);

    const { data, error } = await resend.emails.send(emailPayload);

    const duration = Date.now() - startTime;

    if (error) {
      console.error(`❌ ${logPrefix} - Resend API error after ${duration}ms:`, {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        error: JSON.stringify(error, null, 2)
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    console.log(`✅ ${logPrefix} - Email sent successfully in ${duration}ms`);
    console.log(`✅ ${logPrefix} - Resend message ID: ${data?.id || 'N/A'}`);
    
    return { 
      success: true, 
      messageId: data?.id || 'sent',
      duration: `${duration}ms`
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${logPrefix} - Error after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // In development, log the OTP so user can still test
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
      console.log(`\n🔑 ==========================================`);
      console.log(`🔑 DEV MODE: OTP for ${email}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`🔑 ==========================================\n`);
      return { success: true, messageId: 'dev-mode', devOtp: otp };
    }
    
    // Re-throw error in production
    throw error;
  }
};

/**
 * Send order confirmation email to user
 * @param {string} email - User email address
 * @param {string} name - User name
 * @param {Object} order - Order object with populated product
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
const sendOrderConfirmationEmail = async (email, name, order) => {
  const startTime = Date.now();
  const logPrefix = `[Order Confirmation] ${email}`;
  const orderId = order?._id?.toString() || 'unknown';
  
  console.log(`\n📧 ${logPrefix} - Starting email send...`);
  console.log(`📧 ${logPrefix} - Order ID: ${orderId}`);
  console.log(`📧 ${logPrefix} - Timestamp: ${new Date().toISOString()}`);

  // Validate inputs
  if (!email || !order) {
    const error = new Error('Email and order are required');
    console.error(`❌ ${logPrefix} - Validation failed:`, error.message);
    throw error;
  }

  // Check if email service is configured
  if (!process.env.RESEND_API_KEY || !resend) {
    console.warn(`⚠️  ${logPrefix} - Email service not configured`);
    console.warn(`⚠️  ${logPrefix} - Order confirmation would be sent to: ${email}`);
    
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
      console.log(`\n📦 ==========================================`);
      console.log(`📦 DEV MODE: Order confirmation for ${email}`);
      console.log(`📦 Order ID: ${orderId}`);
      console.log(`📦 ==========================================\n`);
      return { success: true, messageId: 'dev-mode' };
    }
    
    const error = new Error('Email service not configured. Please set RESEND_API_KEY in environment variables.');
    console.error(`❌ ${logPrefix} - Configuration error:`, error.message);
    throw error;
  }

  try {
    console.log(`📧 ${logPrefix} - Building email content...`);
    
    const product = order.product;
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Confirmation - Earth & Harvest</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #2b2b2b;
        }
        .wrapper {
          width: 100%;
          padding: 24px 12px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .header {
          padding: 28px 24px 20px;
          text-align: center;
          border-bottom: 1px solid #eee;
          background: linear-gradient(135deg, #faf7f2 0%, #f5f0e8 100%);
        }
        .logo {
          max-width: 140px;
          margin-bottom: 12px;
        }
        .brand {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 0.4px;
          color: #c8945c;
        }
        .content {
          padding: 28px 24px;
        }
        .content h2 {
          margin: 0 0 12px;
          font-size: 22px;
          font-weight: 600;
          color: #2b2b2b;
        }
        .content p {
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 16px;
          color: #555;
        }
        .order-info {
          background: #faf7f2;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .order-info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e6d5c3;
        }
        .order-info-row:last-child {
          border-bottom: none;
        }
        .order-info-label {
          font-weight: 600;
          color: #555;
        }
        .order-info-value {
          color: #2b2b2b;
          font-weight: 500;
        }
        .product-details {
          background: #ffffff;
          border: 2px solid #e6d5c3;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .product-name {
          font-size: 18px;
          font-weight: 600;
          color: #2b2b2b;
          margin-bottom: 12px;
        }
        .address-section {
          background: #f9f9f9;
          border-radius: 12px;
          padding: 16px;
          margin: 20px 0;
        }
        .address-title {
          font-weight: 600;
          color: #555;
          margin-bottom: 8px;
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
          background-color: #fafafa;
        }
        .footer p {
          margin: 4px 0;
        }
        .success-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <img 
              src="https://res.cloudinary.com/dpc7tj2ze/image/upload/v1767539648/New_Logo_Tinny_transparent_v6if1w.png"
              alt="Earth & Harvest"
              class="logo"
            />
            <div class="brand">Earth & Harvest</div>
          </div>
    
          <!-- Content -->
          <div class="content">
            <div style="text-align: center;">
              <span class="success-badge">✓ Order Confirmed</span>
            </div>
            <h2>Hello ${name || 'there'},</h2>
            <p>
              Thank you for your order! We're excited to prepare your premium dog chews for delivery.
            </p>
    
            <div class="order-info">
              <div class="order-info-row">
                <span class="order-info-label">Order Number:</span>
                <span class="order-info-value">#${orderId.slice(-8).toUpperCase()}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Order Date:</span>
                <span class="order-info-value">${orderDate}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Total Amount:</span>
                <span class="order-info-value">AED ${order.amountPaid}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Status:</span>
                <span class="order-info-value" style="color: #10b981; font-weight: 600;">${order.orderStatus}</span>
              </div>
            </div>

            <div class="product-details">
              <div class="product-name">${product?.productName || 'Earth & Harvest Product'}</div>
              <div class="order-info-row">
                <span class="order-info-label">Size:</span>
                <span class="order-info-value">${order.sizeSelected}g</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Quantity:</span>
                <span class="order-info-value">${order.quantity}</span>
              </div>
            </div>

            ${order.address ? `
            <div class="address-section">
              <div class="address-title">Shipping Address:</div>
              <div style="color: #555; line-height: 1.6;">
                ${order.address.street || ''}<br/>
                ${order.address.city || ''}${order.address.zipCode ? `, ${order.address.zipCode}` : ''}<br/>
                ${order.address.country || ''}
              </div>
            </div>
            ` : ''}

            <p style="margin-top: 24px;">
              We'll send you another email when your order ships. If you have any questions, feel free to reach out to us.
            </p>
          </div>
    
          <!-- Footer -->
          <div class="footer">
            <p>© ${new Date().getFullYear()} Earth & Harvest</p>
            <p>Premium, natural chews — from the Himalayas to your home.</p>
          </div>
    
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
    Hello ${name || 'there'},
    
    Thank you for your order! We're excited to prepare your premium dog chews for delivery.
    
    Order Number: #${orderId.slice(-8).toUpperCase()}
    Order Date: ${orderDate}
    Total Amount: AED ${order.amountPaid}
    Status: ${order.orderStatus}
    
    Product: ${product?.productName || 'Earth & Harvest Product'}
    Size: ${order.sizeSelected}g
    Quantity: ${order.quantity}
    
    ${order.address ? `
    Shipping Address:
    ${order.address.street || ''}
    ${order.address.city || ''}${order.address.zipCode ? `, ${order.address.zipCode}` : ''}
    ${order.address.country || ''}
    ` : ''}
    
    We'll send you another email when your order ships. If you have any questions, feel free to reach out to us.
    
    © ${new Date().getFullYear()} Earth & Harvest
    Premium, natural chews — from the Himalayas to your home.
    `;

    console.log(`📧 ${logPrefix} - Sending email via Resend API...`);
    console.log(`📧 ${logPrefix} - From: ${FROM_EMAIL}`);
    console.log(`📧 ${logPrefix} - To: ${email}`);

    const emailPayload = {
      from: `Earth & Harvest <${FROM_EMAIL}>`,
      to: [email],
      subject: `Order Confirmation #${orderId.slice(-8).toUpperCase()} - Earth & Harvest`,
      html: htmlContent,
      text: textContent,
    };

    console.log(`📧 ${logPrefix} - Payload prepared (subject: "${emailPayload.subject}")`);

    const { data, error } = await resend.emails.send(emailPayload);

    const duration = Date.now() - startTime;

    if (error) {
      console.error(`❌ ${logPrefix} - Resend API error after ${duration}ms:`, {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode,
        error: JSON.stringify(error, null, 2)
      });
      
      let errorMessage = 'Failed to send email';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    console.log(`✅ ${logPrefix} - Email sent successfully in ${duration}ms`);
    console.log(`✅ ${logPrefix} - Resend message ID: ${data?.id || 'N/A'}`);
    
    return { 
      success: true, 
      messageId: data?.id || 'sent',
      duration: `${duration}ms`
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${logPrefix} - Error after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // In development, log the order info
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
      console.log(`\n📦 ==========================================`);
      console.log(`📦 DEV MODE: Order confirmation for ${email}`);
      console.log(`📦 Order ID: ${orderId}`);
      console.log(`📦 ==========================================\n`);
      return { success: true, messageId: 'dev-mode' };
    }
    
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendOrderConfirmationEmail
};
