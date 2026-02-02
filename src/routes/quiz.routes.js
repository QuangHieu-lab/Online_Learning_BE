const { Router } = require('express');
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
} = require('../controllers/quiz.controller');
const {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} = require('../controllers/question.controller');
const { authenticate, requireLecturer } = require('../middleware/auth.middleware');

const router = Router();

router.post('/lesson/:lessonId', authenticate, requireLecturer, createQuiz);
router.get('/lesson/:lessonId', authenticate, getQuizzes);
router.get('/:quizId', authenticate, getQuizById);
router.put('/:quizId', authenticate, requireLecturer, updateQuiz);
router.delete('/:quizId', authenticate, requireLecturer, deleteQuiz);
router.post('/:quizId/submit', authenticate, submitQuiz);

router.post('/:quizId/questions', authenticate, requireLecturer, createQuestion);
router.put('/questions/:questionId', authenticate, requireLecturer, updateQuestion);
router.delete('/questions/:questionId', authenticate, requireLecturer, deleteQuestion);

router.post('/questions/:questionId/answers', authenticate, requireLecturer, createAnswer);
router.put('/answers/:answerId', authenticate, requireLecturer, updateAnswer);
router.delete('/answers/:answerId', authenticate, requireLecturer, deleteAnswer);

module.exports = router;
