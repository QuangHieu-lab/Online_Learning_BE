import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin access
router.get('/', authenticate, requireAdmin, getAllUsers);
router.get('/:userId', authenticate, requireAdmin, getUserById);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:userId', authenticate, requireAdmin, updateUser);
router.delete('/:userId', authenticate, requireAdmin, deleteUser);

export default router;
