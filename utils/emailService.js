const nodemailer = require('nodemailer');

// Create transporter with better configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // For development only
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development'
});

// Verify transporter configuration (only in production or when explicitly enabled)
if (process.env.VERIFY_EMAIL_SERVICE !== 'false') {
  transporter.verify(function (error, success) {
    if (error) {
      console.log('⚠️  Email service configuration issue:', error.message);
      console.log('📧 Please configure SMTP_USER and SMTP_PASS in your .env file');
      console.log('🔐 For Gmail, you need to:');
      console.log('   1. Enable 2-Step Verification');
      console.log('   2. Generate an App Password at: https://myaccount.google.com/apppasswords');
      console.log('   3. Use the App Password (not your regular password)');
      console.log('💡 For development, set VERIFY_EMAIL_SERVICE=false to skip verification');
    } else {
      console.log('✅ Email service is ready to send emails');
    }
  });
}

/**
 * Send OTP email to user
 * @param {string} email - User email address
 * @param {number} otp - OTP code
 * @param {string} name - User name
 */
const sendOTPEmail = async (email, otp, name) => {
  // Check if email service is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email service not configured. OTP would be:', otp);
    console.warn('📧 In development, you can check the console for the OTP');
    // In development, we can still proceed without actually sending email
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔑 OTP for ${email}: ${otp}`);
      return { success: true, messageId: 'dev-mode', devOtp: otp };
    }
    throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS in .env');
  }

  try {
    const mailOptions = {
      from: `"Earth & Harvest" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your One-Time Password for Earth & Harvest',
      html: `
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
      `,
      text: `
    Hello ${name || 'there'},
    
    Your one-time password for Earth & Harvest login is:
    
    ${otp}
    
    This OTP is valid for 10 minutes.
    
    If you didn’t request this, you can safely ignore this email.
    
    © ${new Date().getFullYear()} Earth & Harvest
    `
    };
    

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your SMTP credentials.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      throw new Error('Email service connection timeout. Please check your network and SMTP settings.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Email service connection refused. Please check SMTP_HOST and SMTP_PORT.');
    }
    
    // In development, log the OTP so user can still test
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_OTP === 'true') {
      console.log(`\n🔑 ==========================================`);
      console.log(`🔑 DEV MODE: OTP for ${email}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`🔑 ==========================================\n`);
      console.log('💡 Configure email service (SMTP_USER, SMTP_PASS) to receive OTP via email');
      return { success: true, messageId: 'dev-mode', devOtp: otp };
    }
    
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  transporter
};

