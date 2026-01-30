const db = require('../config/db');

const User = {
    // ========================================================================
    // 🔍 GROUP 1: TÌM KIẾM & LẤY DỮ LIỆU (READ)
    // ========================================================================

    // 1. Tìm user bằng Email (Dùng cho Login)
    findByEmail: async (email) => {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(sql, [email]);
        return rows[0] || null;
    },

    // 2. Tìm user bằng ID (Dùng cho Profile, Auth Middleware)
    findById: async (id) => {
        const sql = 'SELECT * FROM users WHERE user_id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows[0] || null;
    },

    // 3. Lấy Roles (Quyền) của User -> Để tạo Token
    getUserRoles: async (userId) => {
        const sql = `
            SELECT r.role_name 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id = ?
        `;
        const [rows] = await db.execute(sql, [userId]);
        return rows.map(row => row.role_name); // Trả về mảng: ['student', 'admin']
    },

    // 4. Tìm user bằng Token Quên mật khẩu
    findByResetToken: async (token) => {
        const sql = 'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()';
        const [rows] = await db.execute(sql, [token]);
        return rows[0] || null;
    },

    // 5. [ADMIN] Lấy danh sách tất cả users (Có thể dùng cho trang quản trị)
    getAllUsers: async () => {
        const sql = 'SELECT user_id, first_name, last_name, email, current_level, is_active FROM users ORDER BY created_at DESC';
        const [rows] = await db.execute(sql);
        return rows;
    },


    // ========================================================================
    // 📝 GROUP 2: TẠO MỚI (CREATE)
    // ========================================================================

    // 6. Tạo User mới (Hỗ trợ đầy đủ: SĐT, Google, Local)
    create: async (userData) => {
        const { 
            first_name, last_name, email, 
            password_hash, google_id, auth_provider, avatar_url,
            phone_number // <-- Đã thêm trường này
        } = userData;

        const sql = `
            INSERT INTO users 
            (first_name, last_name, email, password_hash, google_id, auth_provider, avatar_url, phone_number, current_level) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'A0') 
        `;
        // Mặc định level là A0 khi mới tạo

        const [result] = await db.execute(sql, [
            first_name, last_name, email, 
            password_hash, google_id, auth_provider, avatar_url, 
            phone_number || null
        ]);

        return result.insertId;
    },

    // 7. Gán quyền cho User (Mặc định Role ID 1 = Student)
    assignRole: async (userId, roleId = 1) => {
        const sql = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';
        await db.execute(sql, [userId, roleId]);
    },


    // ========================================================================
    // 🛠 GROUP 3: CẬP NHẬT (UPDATE)
    // ========================================================================

    // 8. Link tài khoản Google vào tài khoản cũ
    linkGoogleAccount: async (userId, googleId, avatarUrl) => {
        const sql = `
            UPDATE users 
            SET google_id = ?, avatar_url = ?, auth_provider = 'google' 
            WHERE user_id = ?
        `;
        await db.execute(sql, [googleId, avatarUrl, userId]);
    },

    // 9. Cập nhật mật khẩu (Đổi pass hoặc Reset pass)
    updatePassword: async (userId, newPasswordHash) => {
        const sql = 'UPDATE users SET password_hash = ? WHERE user_id = ?';
        await db.execute(sql, [newPasswordHash, userId]);
    },

    // 10. Lưu Token reset password
    saveResetToken: async (email, token, expiryDate) => {
        const sql = `
            UPDATE users 
            SET reset_password_token = ?, reset_password_expires = ? 
            WHERE email = ?
        `;
        await db.execute(sql, [token, expiryDate, email]);
    },

    // 11. Xóa Token reset password sau khi dùng xong
    clearResetToken: async (userId) => {
        const sql = `
            UPDATE users 
            SET reset_password_token = NULL, reset_password_expires = NULL 
            WHERE user_id = ?
        `;
        await db.execute(sql, [userId]);
    },

    // 12. [NEW] Cập nhật thông tin cá nhân (Profile Page)
    updateProfile: async (userId, profileData) => {
        const { first_name, last_name, phone_number, avatar_url } = profileData;
        const sql = `
            UPDATE users 
            SET first_name = ?, last_name = ?, phone_number = ?, avatar_url = ?
            WHERE user_id = ?
        `;
        await db.execute(sql, [first_name, last_name, phone_number, avatar_url, userId]);
    },

    // 13. [NEW] Cập nhật trình độ tiếng Anh (Sau khi làm Placement Test)
    updateLevel: async (userId, newLevel) => {
        // newLevel phải thuộc: 'A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
        const sql = 'UPDATE users SET current_level = ? WHERE user_id = ?';
        await db.execute(sql, [newLevel, userId]);
    },

    // 14. [ADMIN] Khóa/Mở khóa tài khoản
    toggleActiveStatus: async (userId, isActive) => {
        const sql = 'UPDATE users SET is_active = ? WHERE user_id = ?';
        await db.execute(sql, [isActive, userId]);
    }
};

module.exports = User;