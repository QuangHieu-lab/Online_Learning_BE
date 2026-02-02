const { Router } = require('express');
const { createPayment, vnpayReturn, getPaymentStatus } = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/create', authenticate, createPayment);
router.get('/vnpay-return', vnpayReturn);
router.get('/:orderId', authenticate, getPaymentStatus);

module.exports = router;
