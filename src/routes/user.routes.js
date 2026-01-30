import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, requireAdmin, getAllUsers);
router.get('/:userId', authenticate, requireAdmin, getUserById);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:userId', authenticate, requireAdmin, updateUser);
router.delete('/:userId', authenticate, requireAdmin, deleteUser);

export default router;
