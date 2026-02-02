const { Router } = require('express');
const {
  uploadVideo,
  getVideo,
  streamVideo,
  downloadVideo,
  deleteVideo,
} = require('../controllers/video.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadVideo: uploadMiddleware } = require('../middleware/upload.middleware');

const router = Router();

router.post('/lesson/:lessonId/upload', authenticate, uploadMiddleware.single('video'), uploadVideo);
router.get('/:videoId', authenticate, getVideo);
router.get('/:videoId/stream', authenticate, streamVideo);
router.get('/:videoId/download', authenticate, downloadVideo);
router.delete('/:videoId', authenticate, deleteVideo);

module.exports = router;
