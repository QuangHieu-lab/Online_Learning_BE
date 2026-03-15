const prisma = require('../utils/prisma');
const { getModuleForInstructor, ensureModuleAccess, ensureLessonAccess, getLessonForInstructor, sendAccessError } = require('../utils/access.helpers');

const createLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, type, mediaUrl, orderIndex, contentText } = req.body;
    const userId = req.userId;

    const access = await getModuleForInstructor(moduleId, userId);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const { module } = access;
    const moduleIdInt = module.moduleId;

    const lesson = await prisma.$transaction(async (tx) => {
      const createdLesson = await tx.lesson.create({
        data: {
          moduleId: moduleIdInt,
          title,
          type: type || 'video',
          mediaUrl,
          orderIndex: orderIndex || 0,
          ...(contentText !== undefined && { contentText }),
        },
      });

      if ((type || 'video') === 'assignment') {
        await tx.assignment.create({
          data: {
            lessonId: createdLesson.lessonId,
            title: title?.trim() || 'Assignment',
            instructions: contentText?.trim() || `Submit your work for ${title?.trim() || 'this assignment'}.`,
          },
        });
      }

      return tx.lesson.findUnique({
        where: { lessonId: createdLesson.lessonId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
          assignments: true,
        },
      });
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.userId;

    const access = await ensureModuleAccess(moduleId, userId, { roles: req.userRoles || [] });
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const moduleIdInt = access.module.moduleId;

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: moduleIdInt },
      orderBy: {
        orderIndex: 'asc',
      },
      include: {
        _count: {
          select: {
            quizzes: true,
          },
        },
      },
    });

    res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.userId;

    const access = await ensureLessonAccess(lessonId, userId, { roles: req.userRoles || [] });
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const lessonIdInt = access.lesson.lessonId;

    const lesson = await prisma.lesson.findUnique({
      where: { lessonId: lessonIdInt },
      include: {
        module: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    userId: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        quizzes: {
          select: {
            quizId: true,
            title: true,
            timeLimitMinutes: true,
            passingScore: true,
          },
        },
        assignments: {
          select: {
            assignmentId: true,
            title: true,
            instructions: true,
          },
        },
        lessonResources: true,
      },
    });

    res.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, type, mediaUrl, orderIndex, contentText } = req.body;
    const userId = req.userId;

    const access = await getLessonForInstructor(lessonId, userId);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const { lesson } = access;
    const lessonIdInt = lesson.lessonId;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (contentText !== undefined) updateData.contentText = contentText;

    const updatedLesson = await prisma.$transaction(async (tx) => {
      const savedLesson = await tx.lesson.update({
        where: { lessonId: lessonIdInt },
        data: updateData,
      });

      const nextType = type !== undefined ? type : lesson.type;
      const nextTitle = title !== undefined ? title : lesson.title;
      const nextInstructions = contentText !== undefined ? contentText : lesson.contentText;

      if (nextType === 'assignment') {
        await tx.assignment.upsert({
          where: { lessonId: lessonIdInt },
          update: {
            title: nextTitle?.trim() || 'Assignment',
            instructions: nextInstructions?.trim() || `Submit your work for ${nextTitle?.trim() || 'this assignment'}.`,
          },
          create: {
            lessonId: lessonIdInt,
            title: nextTitle?.trim() || 'Assignment',
            instructions: nextInstructions?.trim() || `Submit your work for ${nextTitle?.trim() || 'this assignment'}.`,
          },
        });
      } else {
        await tx.assignment.deleteMany({
          where: { lessonId: lessonIdInt },
        });
      }

      return tx.lesson.findUnique({
        where: { lessonId: savedLesson.lessonId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
          assignments: true,
        },
      });
    });

    res.json(updatedLesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.userId;

    const access = await getLessonForInstructor(lessonId, userId);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const { lesson } = access;

    await prisma.lesson.delete({
      where: { lessonId: lesson.lessonId },
    });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
};
