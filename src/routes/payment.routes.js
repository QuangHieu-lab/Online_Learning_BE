import { Router } from 'express';
import { createPayment, vnpayReturn, getPaymentStatus } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create', authenticate, createPayment);
router.get('/vnpay-return', vnpayReturn);
router.get('/:orderId', authenticate, getPaymentStatus);

export default router;
