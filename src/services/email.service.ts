import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter for sending emails
const createTransporter = () => {
  // Support both EMAIL_* and SMTP_* variables (SMTP_* as fallback)
  const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const emailPort = process.env.EMAIL_PORT || process.env.SMTP_PORT;
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const emailPassword = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

  if (!emailHost || !emailUser || !emailPassword) {
    console.warn('⚠️  Email credentials not configured. Email sending will be disabled.');
    console.warn('   Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD (or SMTP_* equivalents)');
    return null;
  }

  const port = parseInt(emailPort || '587');
  const isSecure = port === 465;

  console.log(`📧 Email service configured: ${emailUser} via ${emailHost}:${port}`);

  return nodemailer.createTransport({
    host: emailHost,
    port: port,
    secure: isSecure, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

const transporter = createTransporter();

/**
 * Send email notification
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; message: string }> => {
  if (!transporter) {
    console.warn('Email service not configured. Email would be sent to:', { to, subject });
    return { success: false, message: 'Email service not configured' };
  }

  try {
    // Support both EMAIL_FROM and SMTP_FROM
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@example.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'E-Learning Platform';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html,
    });

    console.log(`✅ Email sent successfully to ${to}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return { success: false, message: error.message || 'Failed to send email' };
  }
};

/**
 * Send login notification email
 */
export const sendLoginNotification = async (
  email: string,
  name: string,
  loginMethod: 'email' | 'google',
  timestamp: Date = new Date()
): Promise<void> => {
  const loginTime = timestamp.toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const subject = 'Thông báo đăng nhập - E-Learning Platform';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4CAF50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 0 0 5px 5px;
        }
        .info-box {
          background-color: white;
          padding: 15px;
          border-left: 4px solid #4CAF50;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Thông báo đăng nhập</h1>
      </div>
      <div class="content">
        <p>Xin chào <strong>${name}</strong>,</p>
        
        <div class="info-box">
          <p><strong>Thông tin đăng nhập:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phương thức:</strong> ${loginMethod === 'google' ? 'Google Sign-In' : 'Email/Password'}</li>
            <li><strong>Thời gian:</strong> ${loginTime}</li>
          </ul>
        </div>

        <div class="warning">
          <p><strong>⚠️ Lưu ý bảo mật:</strong></p>
          <p>Nếu bạn không thực hiện đăng nhập này, vui lòng:</p>
          <ol>
            <li>Đổi mật khẩu ngay lập tức</li>
            <li>Liên hệ với bộ phận hỗ trợ</li>
            <li>Kiểm tra các hoạt động đăng nhập gần đây</li>
          </ol>
        </div>

        <p>Trân trọng,<br><strong>Đội ngũ E-Learning Platform</strong></p>
      </div>
      <div class="footer">
        <p>Email này được gửi tự động. Vui lòng không trả lời email này.</p>
        <p>&copy; ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, subject, html);
};
