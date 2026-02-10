const { Router } = require('express');
const {
  createCourse,
  getCourses,
  getCourseById,
  getInstructorCourses,
  submitForReview,
  approveCourse,
  rejectCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getCoursesByStudentId,
} = require('../controllers/course.controller');
const { authenticate, optionalAuthenticate, requireLecturer ,requireAdmin} = require('../middleware/auth.middleware');

const router = Router();

router.post('/', authenticate, requireLecturer, createCourse);
router.get('/', optionalAuthenticate, getCourses);
router.get('/student/:studentId', authenticate, getCoursesByStudentId);
router.get('/instructor/my-courses', authenticate, requireLecturer, getInstructorCourses);
router.get('/:courseId', optionalAuthenticate, getCourseById);
router.put('/:courseId', authenticate, requireLecturer, updateCourse);
router.post('/:courseId/submit', authenticate, submitForReview);
router.delete('/:courseId', authenticate, requireLecturer, deleteCourse);
router.post('/:courseId/enroll', authenticate, enrollInCourse);
router.post( '/:courseId/approve', authenticate,requireAdmin, approveCourse);
router.post('/:courseId/reject',authenticate,requireAdmin,rejectCourse);

module.exports = router;
