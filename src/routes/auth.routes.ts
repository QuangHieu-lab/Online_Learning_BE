import { Router } from 'express';
import { register, login, googleSignIn, getMe, logout, refreshFromPayment } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleSignIn);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.get('/refresh-from-payment', refreshFromPayment);

export default router;
