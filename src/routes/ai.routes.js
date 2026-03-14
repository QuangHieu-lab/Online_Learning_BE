const { Router } = require('express');
const {
  generateQuiz,
  applyGeneratedQuiz,
  chatWithTutor,
  submitSpeakingPractice,
  getSpeakingHistory,
  getHint,
  getKnowledgeGaps,
} = require('../controllers/ai.controller');
const { authenticate, requireLecturer } = require('../middleware/auth.middleware');

const router = Router();

router.post('/lessons/:lessonId/generate-quiz', authenticate, requireLecturer, generateQuiz);
router.post('/lessons/:lessonId/apply-quiz', authenticate, requireLecturer, applyGeneratedQuiz);
router.post('/lessons/:lessonId/chat', authenticate, chatWithTutor);
router.post('/lessons/:lessonId/speaking', authenticate, submitSpeakingPractice);
router.get('/lessons/:lessonId/speaking/history', authenticate, getSpeakingHistory);
router.post('/chat', authenticate, chatWithTutor);
router.get('/submissions/:submissionId/questions/:questionId/hint', authenticate, getHint);
router.get('/users/:userId/knowledge-gaps', authenticate, getKnowledgeGaps);

module.exports = router;
