import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, category, levelTarget } = req.body;
    const instructorId = req.userId!;

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price: price ? parseFloat(price) : 0,
        instructorId,
        category: category || 'Communication',
        levelTarget: levelTarget || 'A1',
      },
      include: {
        instructor: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
        modules: true,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { enrolled } = req.query;

    let courses;

    if (enrolled === 'true') {
      // Get enrolled courses
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  userId: true,
                  fullName: true,
                  email: true,
                },
              },
              modules: {
                include: {
                  _count: {
                    select: {
                      lessons: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      courses = enrollments.map((e) => e.course);
    } else {
      // Get all courses
      courses = await prisma.course.findMany({
        include: {
          instructor: {
            select: {
              userId: true,
              fullName: true,
              email: true,
            },
          },
          modules: {
            include: {
              _count: {
                select: {
                  lessons: true,
                },
              },
            },
          },
        },
      });
    }

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId!;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
      include: {
        instructor: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
        modules: {
          orderBy: {
            orderIndex: 'asc',
          },
          include: {
            lessons: {
              orderBy: {
                orderIndex: 'asc',
              },
              include: {
                quizzes: {
                  select: {
                    quizId: true,
                    title: true,
                    timeLimitMinutes: true,
                    passingScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
    });

    const isEnrolled = !!enrollment;
    const isInstructor = course.instructorId === userId;
    const isPaidCourse = Number(course.price) > 0;

    // If course requires payment and user is not enrolled and not instructor, hide lessons
    if (isPaidCourse && !isEnrolled && !isInstructor) {
      // Return course metadata but without modules/lessons
      const courseWithoutContent = {
        ...course,
        modules: course.modules.map(module => ({
          ...module,
          lessons: [],
        })),
        isEnrolled: false,
      };
      return res.json(courseWithoutContent);
    }

    // User is enrolled, instructor, or course is free - return full course with modules and lessons
    res.json({
      ...course,
      isEnrolled: isEnrolled || isInstructor,
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const { title, description } = req.body;
    const userId = req.userId!;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // Check if user is the instructor
    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedCourse = await prisma.course.update({
      where: { courseId: courseIdInt },
      data: {
        title,
        description,
      },
      include: {
        instructor: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
        modules: true,
      },
    });

    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId!;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.course.delete({
      where: { courseId: courseIdInt },
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const courseIdInt = parseInt(courseId);
    const userId = req.userId!;

    if (isNaN(courseIdInt)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { courseId: courseIdInt },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is trying to enroll in their own course
    if (course.instructorId === userId) {
      return res.status(400).json({ error: 'Cannot enroll in your own course' });
    }

    // Check if course requires payment
    if (Number(course.price) > 0) {
      return res.status(402).json({ 
        error: 'Payment required',
        message: 'This course requires payment. Please create a payment first.',
        courseId: course.courseId,
        price: course.price,
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseIdInt,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId: courseIdInt,
      },
      include: {
        course: {
          select: {
            courseId: true,
            title: true,
            description: true,
          },
        },
      },
    });

    res.status(201).json(enrollment);
  } catch (error: any) {
    console.error('Enroll error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
