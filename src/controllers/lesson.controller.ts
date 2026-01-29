import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { title, type, mediaUrl, orderIndex } = req.body;
    const userId = req.userId!;
    const moduleIdInt = parseInt(moduleId);

    if (isNaN(moduleIdInt)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }

    // Check if module exists and user is the instructor
    const module = await prisma.module.findUnique({
      where: { moduleId: moduleIdInt },
      include: {
        course: true,
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: moduleIdInt,
        title,
        type: type || 'video',
        mediaUrl,
        orderIndex: orderIndex || 0,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const moduleIdInt = parseInt(moduleId);

    if (isNaN(moduleIdInt)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }

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

export const getLessonById = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

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
        lessonResources: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lessonIdInt = parseInt(lessonId);
    const { title, type, mediaUrl, orderIndex } = req.body;
    const userId = req.userId!;

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

    if (lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { lessonId: lessonIdInt },
      data: {
        title,
        type,
        mediaUrl,
        orderIndex,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    res.json(updatedLesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lessonIdInt = parseInt(lessonId);
    const userId = req.userId!;

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

    if (lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.lesson.delete({
      where: { lessonId: lessonIdInt },
    });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
