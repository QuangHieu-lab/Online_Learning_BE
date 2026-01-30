import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
} from '../controllers/quiz.controller.js';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} from '../controllers/question.controller.js';
import { authenticate, requireLecturer } from '../middleware/auth.middleware.js';

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

export default router;
