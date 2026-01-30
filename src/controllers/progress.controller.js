import prisma from '../utils/prisma.js';

export const updateProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status, lastWatchedSecond } = req.body;
    const userId = req.userId;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { lessonId: lessonIdInt },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.module.course.courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'You must be enrolled in this course to track progress' });
    }

    let progressStatus = 'not_started';
    if (status === 'completed' || status === true) {
      progressStatus = 'completed';
    } else if (status === 'in_progress' || lastWatchedSecond > 0) {
      progressStatus = 'in_progress';
    }

    const learningProgress = await prisma.learningProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.enrollmentId,
          lessonId: lessonIdInt,
        },
      },
      update: {
        status: progressStatus,
        lastWatchedSecond: lastWatchedSecond || undefined,
        completedAt: progressStatus === 'completed' ? new Date() : undefined,
      },
      create: {
        enrollmentId: enrollment.enrollmentId,
        lessonId: lessonIdInt,
        status: progressStatus,
        lastWatchedSecond: lastWatchedSecond || 0,
        completedAt: progressStatus === 'completed' ? new Date() : null,
      },
    });

    res.json(learningProgress);
  } catch (error) {
    console.error('Update progress error:', error);
    if (error.code === 'P2002') {
      const lessonIdInt = parseInt(req.params.lessonId);
      const lesson = await prisma.lesson.findUnique({
        where: { lessonId: lessonIdInt },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });
      if (lesson) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: req.userId,
              courseId: lesson.module.course.courseId,
            },
          },
        });
        if (enrollment) {
          const learningProgress = await prisma.learningProgress.update({
            where: {
              enrollmentId_lessonId: {
                enrollmentId: enrollment.enrollmentId,
                lessonId: lessonIdInt,
              },
            },
            data: {
              status: req.body.status || 'in_progress',
              lastWatchedSecond: req.body.lastWatchedSecond || undefined,
              completedAt: req.body.status === 'completed' ? new Date() : undefined,
            },
          });
          return res.json(learningProgress);
        }
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'You must be enrolled in this course' });
    }

    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const allLessonIds = course.modules.flatMap(module => module.lessons.map(lesson => lesson.lessonId));

    const progressRecords = await prisma.learningProgress.findMany({
      where: {
        enrollmentId: enrollment.enrollmentId,
        lessonId: {
          in: allLessonIds,
        },
      },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    const completedLessons = progressRecords.filter((p) => p.status === 'completed').length;
    const totalLessons = allLessonIds.length;

    const progress = {
      courseId: course.courseId,
      courseTitle: course.title,
      enrollmentId: enrollment.enrollmentId,
      totalLessons,
      completedLessons,
      percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      modules: course.modules.map(module => ({
        moduleId: module.moduleId,
        moduleTitle: module.title,
        lessons: module.lessons.map((lesson) => {
          const progressRecord = progressMap.get(lesson.lessonId);
          return {
            lessonId: lesson.lessonId,
            lessonTitle: lesson.title,
            status: progressRecord?.status || 'not_started',
            lastWatchedSecond: progressRecord?.lastWatchedSecond || 0,
            completedAt: progressRecord?.completedAt || null,
          };
        }),
      })),
    };

    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.userId;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
        learningProgress: true,
      },
    });

    const progress = enrollments.map((enrollment) => {
      const course = enrollment.course;
      const allLessonIds = course.modules.flatMap(module => module.lessons.map(lesson => lesson.lessonId));
      const completedLessons = enrollment.learningProgress.filter(
        (p) => p.status === 'completed'
      ).length;
      const totalLessons = allLessonIds.length;

      return {
        courseId: course.courseId,
        courseTitle: course.title,
        enrollmentId: enrollment.enrollmentId,
        totalLessons,
        completedLessons,
        percentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      };
    });

    res.json(progress);
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
