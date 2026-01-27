const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Hàm tạo Token dùng chung
const generateToken = async (userId) => {
    const roles = await User.getUserRoles(userId);
    return jwt.sign(
        { id: userId, roles: roles }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1d' }
    );
};

// --- 1. ĐĂNG KÝ (REGISTER) ---
exports.register = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        // Validate
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
        }

        // Check email
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email này đã được sử dụng.' });
        }

        // Hash pass
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const newUserId = await User.create({
            first_name, last_name, email, 
            password_hash: passwordHash,
            auth_provider: 'local',
            google_id: null,
            avatar_url: null 
        });

        await User.assignRole(newUserId, 1); // Role Student

        const token = await generateToken(newUserId);

        res.status(201).json({
            message: 'Đăng ký thành công',
            token,
            user: { id: newUserId, first_name, last_name, email, avatar: null }
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

// --- 2. ĐĂNG NHẬP (LOGIN) ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(404).json({ message: 'Email chưa được đăng ký.' });
        
        if (user.auth_provider === 'google' && !user.password_hash) {
            return res.status(400).json({ message: 'Vui lòng đăng nhập bằng Google.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Mật khẩu không đúng.' });

        const token = await generateToken(user.user_id);

        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar_url
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
};

// --- 3. GOOGLE LOGIN ---
exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, sub: googleId, given_name, family_name, picture } = ticket.getPayload();

        let user = await User.findByEmail(email);

        if (user) {
            if (!user.google_id) {
                await User.linkGoogleAccount(user.user_id, googleId, picture);
                user.google_id = googleId;
                user.avatar_url = picture;
            }
        } else {
            const newUserId = await User.create({
                first_name: given_name,
                last_name: family_name,
                email: email,
                google_id: googleId,
                auth_provider: 'google',
                avatar_url: picture,
                password_hash: null
            });
            await User.assignRole(newUserId, 1);
            user = await User.findById(newUserId);
        }

        const token = await generateToken(user.user_id);

        res.json({
            message: 'Google Login thành công',
            token,
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar_url
            }
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: 'Token Google không hợp lệ' });
    }
};

// --- 4. ĐĂNG XUẤT (LOGOUT) ---
exports.logout = (req, res) => {
    res.status(200).json({ message: 'Đăng xuất thành công.' });
};