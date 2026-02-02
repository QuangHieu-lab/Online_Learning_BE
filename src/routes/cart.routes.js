const { Router } = require('express');
const { 
    getCart, 
    addToCart, 
    removeFromCart, 
    clearCart 
} = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập
router.use(authenticate); 

// GET /api/cart - Xem giỏ hàng
router.get('/', getCart);

// POST /api/cart - Thêm vào giỏ (Body: { courseId: 1 })
router.post('/', addToCart);

// DELETE /api/cart/:courseId - Xóa 1 item (Ví dụ: /api/cart/5)
router.delete('/:courseId', removeFromCart);

// DELETE /api/cart - Xóa hết giỏ hàng
router.delete('/', clearCart);

module.exports = router;