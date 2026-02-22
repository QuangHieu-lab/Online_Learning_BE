const prisma = require('../utils/prisma');
const path = require('path');
const { ENROLLMENT_STATUS_ACTIVE } = require('../config/constants');

/** Check if user can access lesson: instructor of course or enrolled student with active enrollment. */
async function canAccessLesson(prismaClient, lessonId, userId) {
  const lessonIdNum = typeof lessonId === 'number' ? lessonId : parseInt(lessonId, 10);
  if (Number.isNaN(lessonIdNum)) return { allowed: false, lesson: null };
  const lesson = await prismaClient.lesson.findUnique({
    where: { lessonId: lessonIdNum },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) return { allowed: false, lesson: null };
  const courseId = lesson.module.courseId;
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const isInstructor = lesson.module.course.instructorId === userIdNum;
  if (isInstructor) return { allowed: true, lesson };
  const enrollment = await prismaClient.enrollment.findUnique({
    where: { userId_courseId: { userId: userIdNum, courseId } },
  });
  const allowed = !!enrollment && enrollment.status === ENROLLMENT_STATUS_ACTIVE;
  return { allowed, lesson };
}

/** GET /api/lessons/:lessonId/resources - list resources (auth: instructor or enrolled student) */
const listByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.userId;
    const lessonIdInt = parseInt(lessonId);
    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }
    const { allowed, lesson } = await canAccessLesson(prisma, lessonId, userId);
    if (!allowed || !lesson) {
      return res.status(404).json({ error: 'Lesson not found or access denied' });
    }
    const resources = await prisma.lessonResource.findMany({
      where: { lessonId: lesson.lessonId },
      orderBy: { resourceId: 'asc' },
    });
    res.json(resources);
  } catch (error) {
    console.error('List lesson resources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** POST /api/lessons/:lessonId/resources - create (file upload + optional title), lecturer only */
const create = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.userId;
    const lessonIdInt = parseInt(lessonId);
    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }
    const lesson = await prisma.lesson.findUnique({
      where: { lessonId: lessonIdInt },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const file = req.file;
    if (!file || !file.path) {
      return res.status(400).json({ error: 'File is required' });
    }
    const title = req.body.title || file.originalname || 'Document';
    const ext = path.extname(file.originalname || file.filename).toLowerCase().slice(1);
    const fileType = ext || 'document';
    const fileUrl = '/uploads/resources/' + path.basename(file.path);
    const resource = await prisma.lessonResource.create({
      data: {
        lessonId: lessonIdInt,
        title,
        fileUrl,
        fileType,
      },
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error('Create lesson resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** DELETE /api/resources/:resourceId - delete resource, lecturer only */
const deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const userId = req.userId;
    const resourceIdInt = parseInt(resourceId);
    if (isNaN(resourceIdInt)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }
    const resource = await prisma.lessonResource.findUnique({
      where: { resourceId: resourceIdInt },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resource.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await prisma.lessonResource.delete({
      where: { resourceId: resourceIdInt },
    });
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete lesson resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  listByLesson,
  create,
  deleteResource,
};
