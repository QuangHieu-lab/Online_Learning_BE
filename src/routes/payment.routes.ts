import { Router } from 'express';
import { createPayment, vnpayReturn, getPaymentStatus } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Create payment for course enrollment
router.post('/create', authenticate, createPayment);

// VNPay callback (no auth needed - VNPay calls this)
router.get('/vnpay-return', vnpayReturn);

// Get payment status (by orderId)
router.get('/:orderId', authenticate, getPaymentStatus);

export default router;
