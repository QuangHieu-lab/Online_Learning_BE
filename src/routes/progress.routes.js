const { Router } = require('express');
const {
  updateProgress,
  getProgress,
  getUserProgress,
} = require('../controllers/progress.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/lessons/:lessonId', authenticate, updateProgress);
router.get('/courses/:courseId', authenticate, getProgress);
router.get('/user', authenticate, getUserProgress);

module.exports = router;
