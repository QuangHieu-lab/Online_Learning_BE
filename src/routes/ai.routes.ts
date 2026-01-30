import { Router } from 'express';
import {
  generateQuiz,
  chatWithTutor,
  getHint,
  getKnowledgeGaps,
} from '../controllers/ai.controller';
import { authenticate, requireLecturer } from '../middleware/auth.middleware';

const router = Router();

router.post('/lessons/:lessonId/generate-quiz', authenticate, requireLecturer, generateQuiz);
router.post('/lessons/:lessonId/chat', authenticate, chatWithTutor);
router.post('/chat', authenticate, chatWithTutor);
router.get('/submissions/:submissionId/questions/:questionId/hint', authenticate, getHint);
router.get('/users/:userId/knowledge-gaps', authenticate, getKnowledgeGaps);

export default router;
