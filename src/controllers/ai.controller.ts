import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  generateQuizFromContent,
  getAITutorResponse,
  getStructuredTutorResponse,
  getAIHint,
  analyzeKnowledgeGaps,
} from '../services/gemini.service';

interface CustomError extends Error {
  statusCode?: number;
  isRateLimit?: boolean;
  retryAfter?: number;
}

export const generateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { numQuestions } = req.body;
    const userId = req.userId!;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    // Get lesson content
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

    // Get lesson content
    const content = `
      Lesson: ${lesson.title}
      ${lesson.contentText || ''}
      ${lesson.mediaUrl ? `Media: ${lesson.mediaUrl}` : ''}
    `;

    // Generate quiz using AI
    const generatedQuiz = await generateQuizFromContent(content, numQuestions || 5);

    res.json({
      message: 'Quiz generated successfully',
      questions: generatedQuiz.questions,
    });
  } catch (error: unknown) {
    console.error('Generate quiz error:', error);
    
    const customError = error as CustomError;
    if (customError.isRateLimit) {
      return res.status(429).json({ 
        error: customError.message || 'Hệ thống AI đang bận một chút, bạn vui lòng đợi một lúc rồi thử lại nhé!',
        retryAfter: customError.retryAfter 
      });
    }
    
    const statusCode = customError.statusCode || 500;
    const errorMessage = customError.message || 'Failed to generate quiz';
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const chatWithTutor = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { message } = req.body;
    const userId = req.userId!;
    const lessonIdInt = lessonId ? parseInt(lessonId) : null;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get lesson content for context
    let lessonContent = '';
    let structuredData = null;
    
    if (lessonIdInt && !isNaN(lessonIdInt)) {
      const lesson = await prisma.lesson.findUnique({
        where: { lessonId: lessonIdInt },
        include: {
          module: {
            include: {
              course: true,
            },
          },
          quizzes: {
            include: {
              questions: {
                include: {
                  questionAnswers: true,
                },
                take: 5,
              },
            },
            take: 2,
          },
        },
      });
      
      if (lesson) {
        const quizContent = lesson.quizzes
          .map((quiz) => {
            const questions = quiz.questions
              .map((q) => `Q: ${q.contentText}`)
              .join('\n');
            return `Quiz: ${quiz.title}\n${questions}`;
          })
          .join('\n\n');
        
        lessonContent = `
Lesson: ${lesson.title}
${lesson.contentText || ''}
${quizContent ? `\nQuizzes:\n${quizContent}` : ''}
        `.trim();

        // Try to get structured response
        structuredData = await getStructuredTutorResponse(message, lessonContent);
      }
    }

    // Get AI response (structured or plain text)
    let aiResponse: string;
    if (structuredData) {
      aiResponse = `Gợi ý:\n${structuredData.hints}\n\nBài tập:\n${structuredData.exercises.map((ex, i) => `${i + 1}. ${ex.question}`).join('\n')}\n\nLời giải chi tiết:\n${structuredData.solution}`;
    } else {
      aiResponse = await getAITutorResponse(message, lessonContent ? lessonContent : undefined) ?? '';
    }

    // Create AITutorChat record (each message is a separate record)
    const chat = await prisma.aITutorChat.create({
      data: {
        userId,
        lessonId: lessonIdInt,
        userQuery: message,
        aiResponse,
        tokensUsed: 0, // Can be calculated if needed
      },
    });

    // Return response with optional structured data
    interface ResponsePayload {
      response: string;
      chatId: number;
      structuredData?: typeof structuredData;
    }

    const responsePayload: ResponsePayload = {
      response: aiResponse,
      chatId: chat.chatId,
    };

    if (structuredData) {
      responsePayload.structuredData = structuredData;
    }

    res.json(responsePayload);
  } catch (error: unknown) {
    console.error('Chat with tutor error:', error);
    
    const customError = error as CustomError;
    if (customError.isRateLimit) {
      return res.status(429).json({ 
        error: customError.message || 'Hệ thống AI đang bận một chút, bạn vui lòng đợi một lúc rồi thử lại nhé!',
        retryAfter: customError.retryAfter 
      });
    }
    
    const statusCode = customError.statusCode || 500;
    const errorMessage = customError.message || 'Failed to get AI response';
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const getHint = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, questionId } = req.params;
    const attemptIdInt = parseInt(attemptId);
    const questionIdInt = parseInt(questionId);
    const userId = req.userId!;

    if (isNaN(attemptIdInt) || isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid attempt or question ID' });
    }

    // Get quiz attempt and question
    const attempt = await prisma.quizAttempt.findUnique({
      where: { attemptId: attemptIdInt },
      include: {
        enrollment: {
          include: {
            user: true,
          },
        },
        quiz: {
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
        },
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

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.enrollment.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const attemptAnswer = attempt.quizAttemptAnswers.find((a) => a.questionId === questionIdInt);
    if (!attemptAnswer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const question = attemptAnswer.question;
    const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
    const userAnswer = attemptAnswer.selectedAnswer;

    if (!correctAnswer) {
      return res.status(400).json({ error: 'No correct answer found' });
    }

    // Get lesson content
    const lessonContent = `
      Lesson: ${attempt.quiz.lesson.title}
      ${attempt.quiz.lesson.contentText || ''}
    `;

    // Get hint from AI
    const hint = await getAIHint(
      question.contentText,
      userAnswer?.contentText || attemptAnswer.textResponse || '',
      correctAnswer.contentText,
      lessonContent
    );

    res.json({ hint });
  } catch (error: unknown) {
    console.error('Get hint error:', error);
    
    const customError = error as CustomError;
    if (customError.isRateLimit) {
      return res.status(429).json({ 
        error: customError.message || 'Hệ thống AI đang bận một chút, bạn vui lòng đợi một lúc rồi thử lại nhé!',
        retryAfter: customError.retryAfter 
      });
    }
    
    const statusCode = customError.statusCode || 500;
    const errorMessage = customError.message || 'Failed to get hint';
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const getKnowledgeGaps = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const targetUserIdInt = parseInt(targetUserId);
    const userId = req.userId!;

    if (isNaN(targetUserIdInt)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only allow users to see their own knowledge gaps or instructors to see any
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const userRoles = user?.userRoles.map(ur => ur.role.roleName) || [];
    const isInstructor = userRoles.includes('instructor') || userRoles.includes('admin');

    if (!isInstructor && userId !== targetUserIdInt) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all quiz attempts for the user
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: targetUserIdInt },
      include: {
        quizAttempts: {
          include: {
            quiz: {
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
            },
            quizAttemptAnswers: {
              include: {
                question: true,
                selectedAnswer: true,
              },
            },
          },
        },
      },
    });

    const allAttempts = enrollments.flatMap(e => e.quizAttempts);

    if (allAttempts.length === 0) {
      return res.json({
        gaps: [],
        overall: 'No quiz attempts found to analyze.',
      });
    }

    // Get lesson content from first attempt
    const lessonContent = allAttempts[0]?.quiz.lesson
      ? `
        Lesson: ${allAttempts[0].quiz.lesson.title}
        ${allAttempts[0].quiz.lesson.contentText || ''}
      `
      : undefined;

    // Convert attempts to format expected by analyzeKnowledgeGaps
    // Note: This function might need to be updated to accept QuizAttempt format
    const submissions = allAttempts.map(attempt => ({
      id: attempt.attemptId.toString(),
      userId: attempt.enrollment.userId.toString(),
      quizId: attempt.quizId.toString(),
      score: attempt.totalScore ? Number(attempt.totalScore) : null,
      answers: attempt.quizAttemptAnswers.map(aa => ({
        questionId: aa.questionId.toString(),
        answerId: aa.selectedAnswerId?.toString(),
        content: aa.textResponse,
        question: {
          id: aa.question.questionId.toString(),
          content: aa.question.contentText,
        },
        answer: aa.selectedAnswer ? {
          id: aa.selectedAnswer.answerId.toString(),
          content: aa.selectedAnswer.contentText,
        } : null,
      })),
      quiz: {
        lesson: {
          title: attempt.quiz.lesson.title,
          videoPosts: [],
        },
      },
    }));

    // Analyze knowledge gaps
    const analysis = await analyzeKnowledgeGaps(submissions as any, lessonContent);

    res.json(analysis);
  } catch (error: unknown) {
    console.error('Get knowledge gaps error:', error);
    
    const customError = error as CustomError;
    if (customError.isRateLimit) {
      return res.status(429).json({ 
        error: customError.message || 'Hệ thống AI đang bận một chút, bạn vui lòng đợi một lúc rồi thử lại nhé!',
        retryAfter: customError.retryAfter,
        gaps: [],
        overall: 'Không thể phân tích lỗ hổng kiến thức vào lúc này. Vui lòng thử lại sau.'
      });
    }
    
    const statusCode = customError.statusCode || 500;
    const errorMessage = customError.message || 'Failed to analyze knowledge gaps';
    res.status(statusCode).json({ error: errorMessage });
  }
};
