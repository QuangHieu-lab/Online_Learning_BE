const { Router } = require('express');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getCoursesByStudentId,
} = require('../controllers/course.controller');
const { authenticate, optionalAuthenticate, requireLecturer } = require('../middleware/auth.middleware');

const router = Router();

router.post('/', authenticate, requireLecturer, createCourse);
router.get('/', optionalAuthenticate, getCourses);
router.get('/student/:studentId', authenticate, getCoursesByStudentId);
router.get('/:courseId', optionalAuthenticate, getCourseById);
router.put('/:courseId', authenticate, requireLecturer, updateCourse);
router.delete('/:courseId', authenticate, requireLecturer, deleteCourse);
router.post('/:courseId/enroll', authenticate, enrollInCourse);
module.exports = router;
