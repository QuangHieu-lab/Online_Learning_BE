const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('📧 Thêm cấu hình Email vào .env\n');

// App Password từ hình ảnh
const appPassword = 'wdvt wqoe edcv cdgh';

// Đọc file .env hiện tại
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('⚠️  File .env chưa tồn tại, sẽ tạo mới...\n');
}

// Kiểm tra xem đã có cấu hình email chưa
const hasEmailConfig = envContent.includes('EMAIL_HOST') || envContent.includes('SMTP_HOST');

if (hasEmailConfig) {
  console.log('⚠️  Đã có cấu hình email trong .env');
  console.log('   Script sẽ thêm cấu hình mới vào cuối file.\n');
}

// Lấy email từ command line argument hoặc prompt
const emailArg = process.argv[2];

if (!emailArg) {
  console.log('❌ Vui lòng cung cấp email Gmail của bạn!');
  console.log('\nCách sử dụng:');
  console.log('  node add-email-config.js your-email@gmail.com\n');
  process.exit(1);
}

const emailUser = emailArg.trim();

if (!emailUser.includes('@') || !emailUser.includes('.')) {
  console.error('❌ Email không hợp lệ!');
  process.exit(1);
}

// Tạo cấu hình email
const emailConfig = `
# ============================================
# EMAIL CONFIGURATION
# ============================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=${emailUser}
EMAIL_PASSWORD=${appPassword}
EMAIL_FROM=${emailUser}
EMAIL_FROM_NAME=E-Learning Platform
`;

// Thêm vào file .env
if (envContent && !envContent.endsWith('\n')) {
  envContent += '\n';
}

// Xóa cấu hình email cũ nếu có
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

envContent += emailConfig;

// Ghi vào file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Đã thêm cấu hình email vào backend/.env\n');
console.log('📝 Thông tin đã cấu hình:');
console.log(`   Email: ${emailUser}`);
console.log(`   App Password: ${appPassword.replace(/\s/g, '')} (đã ẩn một phần)`);
console.log('\n⚠️  Bước tiếp theo:');
console.log('   1. Khởi động lại backend server (npm run dev)');
console.log('   2. Kiểm tra console log: "Email service configured"');
console.log('   3. Test bằng cách đăng nhập vào hệ thống\n');
