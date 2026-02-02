const { Router } = require('express');
const {
  register,
  login,
  googleSignIn,
  getMe,
  updateProfile,
  deleteOwnAccount,
  logout,
  refreshFromPayment,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleSignIn);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.delete('/me', authenticate, deleteOwnAccount);
router.get('/refresh-from-payment', refreshFromPayment);

module.exports = router;
