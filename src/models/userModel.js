const db = require('../config/db');

const User = {
    // ========================================================================
    // 🔍 GROUP 1: TÌM KIẾM & LẤY DỮ LIỆU
    // ========================================================================

    // Tìm user bằng Email
    findByEmail: async (email) => {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(sql, [email]);
        return rows[0] || null;
    },

    // Tìm user bằng ID
    findById: async (id) => {
        const sql = 'SELECT * FROM users WHERE user_id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows[0] || null;
    },

    // Lấy Roles (Quyền) của User
    getUserRoles: async (userId) => {
        const sql = `
            SELECT r.role_name 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id = ?
        `;
        const [rows] = await db.execute(sql, [userId]);
        return rows.map(row => row.role_name); // Trả về dạng ['student']
    },

    // Tìm user bằng Token Quên mật khẩu
    findByResetToken: async (token) => {
        const sql = 'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()';
        const [rows] = await db.execute(sql, [token]);
        return rows[0] || null;
    },


    // ========================================================================
    // 📝 GROUP 2: TẠO MỚI (CREATE)
    // ========================================================================

    // Tạo User mới (Khớp với DB mới: first_name, last_name)
    create: async (userData) => {
        const { 
            first_name, last_name, email, 
            password_hash, google_id, auth_provider, avatar_url 
        } = userData;

        const sql = `
            INSERT INTO users 
            (first_name, last_name, email, password_hash, google_id, auth_provider, avatar_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(sql, [
            first_name, last_name, email, 
            password_hash, google_id, auth_provider, avatar_url
        ]);

        return result.insertId;
    },

    // Gán quyền cho User (Mặc định Role ID 1 = Student)
    assignRole: async (userId, roleId = 1) => {
        const sql = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';
        await db.execute(sql, [userId, roleId]);
    },


    // ========================================================================
    // 🛠 GROUP 3: CẬP NHẬT (UPDATE)
    // ========================================================================

    // Link Google vào tài khoản cũ
    linkGoogleAccount: async (userId, googleId, avatarUrl) => {
        const sql = `
            UPDATE users 
            SET google_id = ?, avatar_url = ?, auth_provider = 'google' 
            WHERE user_id = ?
        `;
        await db.execute(sql, [googleId, avatarUrl, userId]);
    },

    // Cập nhật mật khẩu mới
    updatePassword: async (userId, newPasswordHash) => {
        const sql = 'UPDATE users SET password_hash = ? WHERE user_id = ?';
        await db.execute(sql, [newPasswordHash, userId]);
    },

    // Lưu Token reset password
    saveResetToken: async (email, token, expiryDate) => {
        const sql = `
            UPDATE users 
            SET reset_password_token = ?, reset_password_expires = ? 
            WHERE email = ?
        `;
        await db.execute(sql, [token, expiryDate, email]);
    }
};

module.exports = User;