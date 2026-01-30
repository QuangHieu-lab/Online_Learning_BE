import { Router } from 'express';
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
} from '../controllers/course.controller.js';
import { authenticate, requireLecturer } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, requireLecturer, createCourse);
router.get('/', authenticate, getCourses);
router.get('/:courseId', authenticate, getCourseById);
router.put('/:courseId', authenticate, requireLecturer, updateCourse);
router.delete('/:courseId', authenticate, requireLecturer, deleteCourse);
router.post('/:courseId/enroll', authenticate, enrollInCourse);

export default router;
