// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel'); // Gọi Model vừa tạo ở trên

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- 1. ĐĂNG NHẬP THƯỜNG ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Gọi Model để tìm user
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(404).json({ message: 'Email chưa được đăng ký.' });
        }

        // Nếu là tài khoản Google thì chặn đăng nhập bằng pass
        if (user.auth_provider === 'google') {
            return res.status(400).json({ message: 'Vui lòng đăng nhập bằng Google.' });
        }

        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai mật khẩu.' });
        }

        // Tạo Token
        const token = jwt.sign(
            { id: user.user_id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.user_id,
                name: `${user.first_name} ${user.last_name}`,
                avatar: user.avatar_url
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

// --- 2. ĐĂNG NHẬP GOOGLE ---
exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;

    try {
        // Verify token với Google
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, sub: googleId, given_name, family_name, picture } = payload;

        // Kiểm tra xem user có trong DB chưa
        let user = await User.findByEmail(email);

        if (user) {
            if (user.auth_provider === 'local') {
                return res.status(400).json({ message: 'Email này đã đăng ký mật khẩu, vui lòng login thường.' });
            }
        } else {
            // Chưa có -> Tạo mới (Auto Register) qua Model
            const newUserId = await User.create({
                first_name: given_name,
                last_name: family_name,
                email: email,
                google_id: googleId,
                auth_provider: 'google',
                avatar_url: picture,
                password_hash: null
            });
            
            // Set role student (ID: 1)
            await User.assignRole(newUserId, 1);
            
            // Lấy lại info user vừa tạo
            user = await User.findById(newUserId);
        }

        // Tạo Token
        const token = jwt.sign(
            { id: user.user_id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Google Login thành công',
            token,
            user: {
                id: user.user_id,
                name: `${user.first_name} ${user.last_name}`,
                avatar: user.avatar_url
            }
        });

    } catch (error) {
        console.error("Google Login Error:", error);
        res.status(401).json({ message: 'Token Google không hợp lệ' });
    }
};

// --- 3. ĐĂNG XUẤT ---
exports.logout = (req, res) => {
    // Client tự xóa token ở LocalStorage
    res.status(200).json({ message: 'Đăng xuất thành công.' });
};