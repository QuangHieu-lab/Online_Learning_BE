const { Router } = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', authenticate, requireAdmin, getAllUsers);
router.get('/:userId', authenticate, requireAdmin, getUserById);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:userId', authenticate, requireAdmin, updateUser);
router.delete('/:userId', authenticate, requireAdmin, deleteUser);

module.exports = router;
