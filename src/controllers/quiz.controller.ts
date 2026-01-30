import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Types for quiz submission
interface QuizAnswer {
  questionId: number;
  answerId?: number;
  content?: string;
}

interface QuestionResult {
  questionId: number;
  questionContent: string;
  isCorrect: boolean;
  correctAnswerId: number | null;
  correctAnswerContent: string | null;
  userAnswerId: number | null;
  userAnswerContent: string | null;
}

export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { title, timeLimitMinutes, passingScore } = req.body;
    const userId = req.userId!;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    // Check if user is the instructor
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

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lessonIdInt,
        title,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : 0,
        passingScore: passingScore ? parseInt(passingScore) : 60,
      },
      include: {
        questions: {
          include: {
            questionAnswers: true,
          },
        },
      },
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuizzes = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { lessonId: lessonIdInt },
      include: {
        _count: {
          select: {
            questions: true,
            quizAttempts: true,
          },
        },
      },
    });

    res.json(quizzes);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuizById = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const userId = req.userId!;

    if (isNaN(quizIdInt)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { quizId: quizIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          include: {
            questionAnswers: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Get user's enrollment for this course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.lesson.module.course.courseId,
        },
      },
    });

    // Check if user has already submitted (need enrollmentId)
    let existingAttempt = null;
    if (enrollment) {
      existingAttempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: quizIdInt,
          enrollmentId: enrollment.enrollmentId,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    }

    // If there's an attempt, include question results for display
    let questionResults: QuestionResult[] = [];
    if (existingAttempt) {
      // Get attempt with answers
      const attemptWithAnswers = await prisma.quizAttempt.findUnique({
        where: { attemptId: existingAttempt.attemptId },
        include: {
          quizAttemptAnswers: {
            include: {
              question: {
                include: {
                  questionAnswers: true,
                },
              },
              selectedAnswer: true,
            },
          },
        },
      });

      // Reconstruct question results
      if (attemptWithAnswers) {
        for (const question of quiz.questions) {
          const attemptAnswer = attemptWithAnswers.quizAttemptAnswers.find(
            (a) => a.questionId === question.questionId
          );
          const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
          const userAnswer = attemptAnswer?.selectedAnswer;
          
          questionResults.push({
            questionId: question.questionId,
            questionContent: question.contentText,
            isCorrect: attemptAnswer?.isCorrect || false,
            correctAnswerId: correctAnswer?.answerId || null,
            correctAnswerContent: correctAnswer?.contentText || null,
            userAnswerId: attemptAnswer?.selectedAnswerId || null,
            userAnswerContent: userAnswer?.contentText || attemptAnswer?.textResponse || null,
          });
        }
      }
    }

    // Allow students to retake quiz - always return quiz with questions
    res.json({ 
      quiz, 
      attempt: existingAttempt,
      questionResults: existingAttempt ? questionResults : [],
      canRetake: true, // Always allow retaking
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const { title, timeLimitMinutes, passingScore } = req.body;
    const userId = req.userId!;

    if (isNaN(quizIdInt)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { quizId: quizIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { quizId: quizIdInt },
      data: {
        title,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
        passingScore: passingScore ? parseInt(passingScore) : undefined,
      },
    });

    res.json(updatedQuiz);
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const userId = req.userId!;

    if (isNaN(quizIdInt)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { quizId: quizIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.quiz.delete({
      where: { quizId: quizIdInt },
    });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const { answers } = req.body as { answers: QuizAnswer[] }; // Array of { questionId, answerId?, content? }
    const userId = req.userId!;

    if (isNaN(quizIdInt)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    // Get quiz with questions and correct answers
    const quiz = await prisma.quiz.findUnique({
      where: { quizId: quizIdInt },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          include: {
            questionAnswers: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Get user's enrollment for this course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.lesson.module.course.courseId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'You must be enrolled in this course to take the quiz' });
    }

    // Calculate score and track detailed results
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const questionResults: QuestionResult[] = [];
    const quizAttemptAnswers: any[] = [];

    for (const question of quiz.questions) {
      const userAnswer = answers.find((a: QuizAnswer) => a.questionId === question.questionId);
      let isCorrect = false;
      let correctAnswerId: number | null = null;
      let correctAnswerContent: string | null = null;
      let userAnswerContent: string | null = null;

      if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
        correctAnswerId = correctAnswer?.answerId || null;
        correctAnswerContent = correctAnswer?.contentText || null;
        
        if (userAnswer) {
          const selectedAnswer = question.questionAnswers.find((a) => a.answerId === userAnswer.answerId);
          userAnswerContent = selectedAnswer?.contentText || null;
          if (userAnswer.answerId === correctAnswer?.answerId) {
            isCorrect = true;
            correctCount++;
          }
        }
      } else if (question.type === 'fill_in_blank') {
        // For fill in blank, we'll mark as correct for now (instructor can grade later)
        isCorrect = true;
        correctCount++;
        if (userAnswer) {
          userAnswerContent = userAnswer.content || null;
        }
      } else if (question.type === 'true_false') {
        const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
        correctAnswerId = correctAnswer?.answerId || null;
        correctAnswerContent = correctAnswer?.contentText || null;
        
        if (userAnswer) {
          const selectedAnswer = question.questionAnswers.find((a) => a.answerId === userAnswer.answerId);
          userAnswerContent = selectedAnswer?.contentText || null;
          if (userAnswer.answerId === correctAnswer?.answerId) {
            isCorrect = true;
            correctCount++;
          }
        }
      }

      questionResults.push({
        questionId: question.questionId,
        questionContent: question.contentText,
        isCorrect,
        correctAnswerId,
        correctAnswerContent,
        userAnswerId: userAnswer?.answerId || null,
        userAnswerContent,
      });

      // Prepare data for quiz attempt answers
      quizAttemptAnswers.push({
        questionId: question.questionId,
        selectedAnswerId: userAnswer?.answerId || null,
        textResponse: userAnswer?.content || null,
        isCorrect,
      });
    }

    const score = Math.round((correctCount / totalQuestions) * 100);

    // Create quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quizIdInt,
        enrollmentId: enrollment.enrollmentId,
        totalScore: score,
        completedAt: new Date(),
        quizAttemptAnswers: {
          create: quizAttemptAnswers,
        },
      },
      include: {
        quizAttemptAnswers: {
          include: {
            question: true,
            selectedAnswer: true,
          },
        },
      },
    });

    res.status(201).json({
      attempt,
      score,
      totalQuestions,
      correctCount,
      passed: score >= quiz.passingScore,
      questionResults, // Detailed results for each question
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
