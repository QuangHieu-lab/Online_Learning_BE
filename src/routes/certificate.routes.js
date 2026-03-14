const express = require('express');
const router = express.Router();

// Import Controller theo kiểu Destructuring (giống ảnh bạn gửi)
const { 
  getMyCertificates,
  getCertificateById,
  viewCertificatePdf,
  downloadCertificatePdf,
} = require('../controllers/certificate.controller');

// Import Middleware
const { authenticate } = require('../middleware/auth.middleware');

// ==================================================================
// ĐỊNH NGHĨA ROUTES
// ==================================================================

// GET /api/certificates
// Chức năng: Lấy danh sách chứng chỉ của User (đã đăng nhập)
router.get('/', authenticate, getMyCertificates);
router.get('/:certificateId', authenticate, getCertificateById);
router.get('/:certificateId/file', authenticate, viewCertificatePdf);
router.get('/:certificateId/download', authenticate, downloadCertificatePdf);

module.exports = router;