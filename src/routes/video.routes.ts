import { Router } from 'express';
import {
  uploadVideo,
  getVideo,
  streamVideo,
  downloadVideo,
  deleteVideo,
} from '../controllers/video.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadVideo as uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

router.post('/lesson/:lessonId/upload', authenticate, uploadMiddleware.single('video'), uploadVideo);
router.get('/:videoId', authenticate, getVideo);
router.get('/:videoId/stream', authenticate, streamVideo);
router.get('/:videoId/download', authenticate, downloadVideo);
router.delete('/:videoId', authenticate, deleteVideo);

export default router;
