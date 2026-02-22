const { Router } = require('express');
const {
  listByLesson,
  create,
  deleteResource,
} = require('../controllers/lessonResource.controller');
const { authenticate, requireLecturer } = require('../middleware/auth.middleware');
const { uploadResource } = require('../middleware/upload.middleware');

const router = Router();
const deleteRouter = Router();

router.get('/:lessonId/resources', authenticate, listByLesson);
router.post('/:lessonId/resources', authenticate, requireLecturer, uploadResource.single('file'), create);
deleteRouter.delete('/:resourceId', authenticate, requireLecturer, deleteResource);

module.exports = router;
module.exports.deleteRouter = deleteRouter;
