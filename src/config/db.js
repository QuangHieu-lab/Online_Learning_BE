const mysql = require('mysql2');
require('dotenv').config(); // Nạp biến môi trường từ file .env

// Tạo Connection Pool (Hồ bơi kết nối)
// Giúp tái sử dụng kết nối, server không bị sập khi có quá nhiều người dùng
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Chuyển pool sang dạng Promise để dùng được async/await trong Model
const promisePool = pool.promise();

// Kiểm tra kết nối thử xem có thành công không
pool.getConnection((err, connection) => {
    if (err) {
        console.error(' Lỗi kết nối Database:', err.message);
    } else {
        console.log(' Đã kết nối thành công tới MySQL Database!');
        connection.release(); // Trả kết nối về hồ
    }
});

module.exports = promisePool;