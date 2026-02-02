const express = require('express');
const router = express.Router();

// Import Controller theo kiểu Destructuring (giống ảnh bạn gửi)
const { 
  getMyCertificates 
} = require('../controllers/certificate.controller');

// Import Middleware
const { authenticate } = require('../middleware/auth.middleware');

// ==================================================================
// ĐỊNH NGHĨA ROUTES
// ==================================================================

// GET /api/certificates
// Chức năng: Lấy danh sách chứng chỉ của User (đã đăng nhập)
router.get('/', authenticate, getMyCertificates);

module.exports = router;