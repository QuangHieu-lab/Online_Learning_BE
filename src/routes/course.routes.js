const { Router } = require('express');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
} = require('../controllers/course.controller');
const { authenticate, requireLecturer } = require('../middleware/auth.middleware');

const router = Router();

router.post('/', authenticate, requireLecturer, createCourse);
router.get('/', authenticate, getCourses);
router.get('/:courseId', authenticate, getCourseById);
router.put('/:courseId', authenticate, requireLecturer, updateCourse);
router.delete('/:courseId', authenticate, requireLecturer, deleteCourse);
router.post('/:courseId/enroll', authenticate, enrollInCourse);

module.exports = router;
