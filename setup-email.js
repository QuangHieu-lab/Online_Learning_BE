const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function setupEmail() {
  console.log('\n📧 Email Setup Wizard\n');
  console.log('Hướng dẫn:');
  console.log('1. Bạn cần có Gmail với 2-Step Verification đã bật');
  console.log('2. Tạo App Password tại: https://myaccount.google.com/apppasswords');
  console.log('3. Chọn "Mail" và "Other (Custom name)"');
  console.log('4. Nhập tên: "E-Learning Backend"');
  console.log('5. Copy App Password (16 ký tự)\n');

  // Read existing .env
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if email config already exists
  const hasEmailConfig = envContent.includes('EMAIL_HOST') || envContent.includes('SMTP_HOST');
  
  if (hasEmailConfig) {
    console.log('⚠️  Email configuration already exists in .env');
    const overwrite = await question('Bạn có muốn cập nhật lại? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Hủy bỏ.');
      rl.close();
      return;
    }
    
    // Remove old email config
    envContent = envContent.replace(/# =*=*\n# EMAIL CONFIGURATION.*?(?=\n# |$)/gs, '');
    envContent = envContent.replace(/EMAIL_HOST=.*\n/g, '');
    envContent = envContent.replace(/EMAIL_PORT=.*\n/g, '');
    envContent = envContent.replace(/EMAIL_USER=.*\n/g, '');
    envContent = envContent.replace(/EMAIL_PASSWORD=.*\n/g, '');
    envContent = envContent.replace(/EMAIL_FROM=.*\n/g, '');
    envContent = envContent.replace(/EMAIL_FROM_NAME=.*\n/g, '');
    envContent = envContent.replace(/SMTP_HOST=.*\n/g, '');
    envContent = envContent.replace(/SMTP_PORT=.*\n/g, '');
    envContent = envContent.replace(/SMTP_USER=.*\n/g, '');
    envContent = envContent.replace(/SMTP_PASS=.*\n/g, '');
    envContent = envContent.replace(/SMTP_FROM=.*\n/g, '');
  }

  // Get email configuration
  console.log('\n--- Nhập thông tin Email ---\n');
  
  const emailUser = await question('Email Gmail của bạn (ví dụ: yourname@gmail.com): ');
  if (!emailUser || !emailUser.includes('@')) {
    console.error('❌ Email không hợp lệ!');
    rl.close();
    return;
  }

  const emailPassword = await question('App Password (16 ký tự, có thể có khoảng trắng): ');
  if (!emailPassword || emailPassword.length < 16) {
    console.error('❌ App Password phải có ít nhất 16 ký tự!');
    rl.close();
    return;
  }

  const emailFrom = await question(`Email gửi đi (Enter để dùng: ${emailUser}): `) || emailUser;
  const emailFromName = await question('Tên hiển thị khi gửi email (Enter để dùng: E-Learning Platform): ') || 'E-Learning Platform';

  // Choose method
  console.log('\nChọn cách cấu hình:');
  console.log('1. EMAIL_* (khuyến nghị)');
  console.log('2. SMTP_*');
  const method = await question('Chọn (1 hoặc 2, Enter = 1): ') || '1';

  // Build email config
  let emailConfig = '\n# ============================================\n';
  emailConfig += '# EMAIL CONFIGURATION\n';
  emailConfig += '# ============================================\n';

  if (method === '1') {
    emailConfig += `EMAIL_HOST=smtp.gmail.com\n`;
    emailConfig += `EMAIL_PORT=587\n`;
    emailConfig += `EMAIL_USER=${emailUser}\n`;
    emailConfig += `EMAIL_PASSWORD=${emailPassword}\n`;
    emailConfig += `EMAIL_FROM=${emailFrom}\n`;
    emailConfig += `EMAIL_FROM_NAME=${emailFromName}\n`;
  } else {
    emailConfig += `SMTP_HOST=smtp.gmail.com\n`;
    emailConfig += `SMTP_PORT=587\n`;
    emailConfig += `SMTP_USER=${emailUser}\n`;
    emailConfig += `SMTP_PASS=${emailPassword}\n`;
    emailConfig += `SMTP_FROM=${emailFrom}\n`;
    emailConfig += `EMAIL_FROM_NAME=${emailFromName}\n`;
  }

  // Append to .env
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += emailConfig;

  // Write to file
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n✅ Đã cấu hình email thành công!');
  console.log('\n📝 File .env đã được cập nhật.');
  console.log('\n⚠️  Lưu ý:');
  console.log('1. Khởi động lại backend server để áp dụng thay đổi');
  console.log('2. Kiểm tra console log khi server khởi động');
  console.log('3. Test bằng cách đăng nhập vào hệ thống');
  console.log('\n📖 Xem hướng dẫn chi tiết tại: backend/EMAIL_SETUP_STEP_BY_STEP.md\n');

  rl.close();
}

setupEmail().catch((error) => {
  console.error('❌ Lỗi:', error);
  rl.close();
});
