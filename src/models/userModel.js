const db = require('../config/db');

const User = {
    // 1. Tìm user bằng email
    findByEmail: async (email) => {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    // 2. Tìm user bằng ID
    findById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM users WHERE user_id = ?', [id]);
        return rows[0];
    },

    // 3. Lấy quyền (Role) của user -> CẦN CÁI NÀY ĐỂ TẠO TOKEN
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

    // 4. Tạo user mới
    create: async (userData) => {
        const { first_name, last_name, email, google_id, auth_provider, avatar_url, password_hash } = userData;
        const [result] = await db.execute(
            `INSERT INTO users (first_name, last_name, email, google_id, auth_provider, avatar_url, password_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, google_id, auth_provider, avatar_url, password_hash]
        );
        return result.insertId;
    },

    // 5. Gán role cho user
    assignRole: async (userId, roleId) => {
        await db.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
    },

    // 6. Link tài khoản Google (Dùng khi user cũ muốn đăng nhập bằng Google)
    linkGoogleAccount: async (userId, googleId, avatarUrl) => {
        const sql = `UPDATE users SET google_id = ?, avatar_url = ?, auth_provider = 'google' WHERE user_id = ?`;
        await db.execute(sql, [googleId, avatarUrl, userId]);
    }
};

module.exports = User;