import { Router } from 'express';
import {
  uploadVideo,
  getVideo,
  streamVideo,
  downloadVideo,
  deleteVideo,
} from '../controllers/video.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadVideo as uploadMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/lesson/:lessonId/upload', authenticate, uploadMiddleware.single('video'), uploadVideo);
router.get('/:videoId', authenticate, getVideo);
router.get('/:videoId/stream', authenticate, streamVideo);
router.get('/:videoId/download', authenticate, downloadVideo);
router.delete('/:videoId', authenticate, deleteVideo);

export default router;
