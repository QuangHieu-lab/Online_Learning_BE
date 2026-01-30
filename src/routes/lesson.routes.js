import { Router } from 'express';
import {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
} from '../controllers/lesson.controller.js';
import { authenticate, requireLecturer } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/module/:moduleId', authenticate, requireLecturer, createLesson);
router.get('/module/:moduleId', authenticate, getLessons);
router.get('/:lessonId', authenticate, getLessonById);
router.put('/:lessonId', authenticate, requireLecturer, updateLesson);
router.delete('/:lessonId', authenticate, requireLecturer, deleteLesson);

export default router;
