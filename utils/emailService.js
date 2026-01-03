const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('Email service error:', error);
  console.log('Please configure SMTP_USER and SMTP_PASS in your .env file');
  console.log('For Gmail, you may need to use an App Password instead of your regular password');
  console.log('For development, you can use services like Mailtrap or Ethereal Email');
  } else {
    console.log('Email service is ready to send emails');
  }
});

/**
 * Send OTP email to user
 * @param {string} email - User email address
 * @param {number} otp - OTP code
 * @param {string} name - User name
 */
const sendOTPEmail = async (email, otp, name) => {
  try {
    const mailOptions = {
      from: `"Earth & Harvest" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your OTP for Earth & Harvest Login',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 10px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              padding: 20px;
            }
            .otp-box {
              background-color: #f4f4f4;
              padding: 20px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 Earth & Harvest</h1>
            </div>
            <div class="content">
              <h2>Hello ${name || 'there'}!</h2>
              <p>Thank you for choosing Earth & Harvest. Use the OTP below to complete your login:</p>
              <div class="otp-box">${otp}</div>
              <p>This OTP will expire in 10 minutes.</p>
              <p>If you didn't request this OTP, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Earth & Harvest. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name || 'there'}!
        
        Your OTP for Earth & Harvest login is: ${otp}
        
        This OTP will expire in 10 minutes.
        
        If you didn't request this OTP, please ignore this email.
        
        © ${new Date().getFullYear()} Earth & Harvest. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  transporter
};

