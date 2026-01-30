const { Router } = require('express');
const {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
} = require('../controllers/lesson.controller');
const { authenticate, requireLecturer } = require('../middleware/auth.middleware');

const router = Router();

router.post('/module/:moduleId', authenticate, requireLecturer, createLesson);
router.get('/module/:moduleId', authenticate, getLessons);
router.get('/:lessonId', authenticate, getLessonById);
router.put('/:lessonId', authenticate, requireLecturer, updateLesson);
router.delete('/:lessonId', authenticate, requireLecturer, deleteLesson);

module.exports = router;
