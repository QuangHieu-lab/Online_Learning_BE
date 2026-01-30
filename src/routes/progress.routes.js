import { Router } from 'express';
import {
  updateProgress,
  getProgress,
  getUserProgress,
} from '../controllers/progress.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/lessons/:lessonId', authenticate, updateProgress);
router.get('/courses/:courseId', authenticate, getProgress);
router.get('/user', authenticate, getUserProgress);

export default router;
