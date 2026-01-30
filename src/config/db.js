const mysql = require('mysql2');
require('dotenv').config();

// Tạo hồ bơi kết nối (Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME, // Tên DB sẽ lấy từ .env
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // QUAN TRỌNG: Cấu hình này giúp hiển thị đúng tiếng Việt & Emoji
    // Khớp với 'utf8mb4_unicode_ci' trong database của bạn
    charset: 'utf8mb4',
    
    // (Tùy chọn) Đặt múi giờ Việt Nam để lưu ngày tháng cho chuẩn
    timezone: '+07:00' 
});

// Chuyển sang dạng Promise để dùng async/await
const promisePool = pool.promise();

// Kiểm tra kết nối khi khởi động Server
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Lỗi kết nối Database:', err.code, err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error(' Kiểm tra lại User/Password trong file .env');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error(` Database "${process.env.DB_NAME}" chưa tồn tại. Hãy chạy script SQL trước!`);
        }
    } else {
        console.log(`✅ Đã kết nối thành công tới Database: ${process.env.DB_NAME}`);
        connection.release();
    }
});

module.exports = promisePool;