const prisma = require('../utils/prisma');
const {
  generateQuizFromContent,
  getAITutorResponse,
  getStructuredTutorResponse,
  getAIHint,
  analyzeKnowledgeGaps,
} = require('../services/gemini.service');
const { handleAIOrServiceError } = require('../utils/error.utils');
const { DEFAULT_PASSING_SCORE, DEFAULT_TIME_LIMIT_MINUTES } = require('../config/constants');

const generateQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { numQuestions, existingQuestionTexts } = req.body;
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

    if (lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const content = `
      Lesson: ${lesson.title}
      ${lesson.contentText || ''}
      ${lesson.mediaUrl ? `Media: ${lesson.mediaUrl}` : ''}
    `;

    const excludeTexts = Array.isArray(existingQuestionTexts)
      ? existingQuestionTexts.filter((t) => t != null && String(t).trim()).map((t) => String(t).trim())
      : [];
    const generatedQuiz = await generateQuizFromContent(content, numQuestions || 5, excludeTexts);

    res.json({
      message: 'Quiz generated successfully',
      questions: generatedQuiz.questions,
    });
  } catch (error) {
    return handleAIOrServiceError(error, res, {
      defaultMessage: 'Hệ thống AI đang bận một chút, bạn vui lòng đợi một lúc rồi thử lại nhé!',
    });
  }
};

const chatWithTutor = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { message } = req.body;
    const userId = req.userId;
    const lessonIdInt = lessonId ? parseInt(lessonId) : null;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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

        structuredData = await getStructuredTutorResponse(message, lessonContent);
      }
    }

    let aiResponse;
    if (structuredData) {
      aiResponse = `Gợi ý:\n${structuredData.hints}\n\nBài tập:\n${structuredData.exercises.map((ex, i) => `${i + 1}. ${ex.question}`).join('\n')}\n\nLời giải chi tiết:\n${structuredData.solution}`;
    } else {
      aiResponse = (await getAITutorResponse(message, lessonContent ? lessonContent : undefined)) ?? '';
    }

    const chat = await prisma.aITutorChat.create({
      data: {
        userId,
        lessonId: lessonIdInt,
        userQuery: message,
        aiResponse,
        tokensUsed: 0,
      },
    });

    const responsePayload = {
      response: aiResponse,
      chatId: chat.chatId,
    };

    if (structuredData) {
      responsePayload.structuredData = structuredData;
    }

    res.json(responsePayload);
  } catch (error) {
    return handleAIOrServiceError(error, res, {
      defaultMessage: 'Failed to get AI response',
    });
  }
};

const getHint = async (req, res) => {
  try {
    const { submissionId: attemptId, questionId } = req.params;
    const attemptIdInt = parseInt(attemptId);
    const questionIdInt = parseInt(questionId);
    const userId = req.userId;

    if (isNaN(attemptIdInt) || isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid attempt or question ID' });
    }

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

    const lessonContent = `
      Lesson: ${attempt.quiz.lesson.title}
      ${attempt.quiz.lesson.contentText || ''}
    `;

    const hint = await getAIHint(
      question.contentText,
      userAnswer?.contentText || attemptAnswer.textResponse || '',
      correctAnswer.contentText || '',
      lessonContent
    );

    res.json({ hint });
  } catch (error) {
    return handleAIOrServiceError(error, res, { defaultMessage: 'Failed to get hint' });
  }
};

const getKnowledgeGaps = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const targetUserIdInt = parseInt(targetUserId);
    const userId = req.userId;

    if (isNaN(targetUserIdInt)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

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

    const userRoles = user?.userRoles.map((ur) => ur.role.roleName) || [];
    const isInstructor = userRoles.includes('instructor') || userRoles.includes('admin');

    if (!isInstructor && userId !== targetUserIdInt) {
      return res.status(403).json({ error: 'Not authorized' });
    }

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

    const allAttempts = enrollments.flatMap((e) => e.quizAttempts);

    if (allAttempts.length === 0) {
      return res.json({
        gaps: [],
        overall: 'No quiz attempts found to analyze.',
      });
    }

    const lessonContent = allAttempts[0]?.quiz.lesson
      ? `
        Lesson: ${allAttempts[0].quiz.lesson.title}
        ${allAttempts[0].quiz.lesson.contentText || ''}
      `
      : undefined;

    const submissions = allAttempts.map((attempt) => ({
      id: attempt.attemptId.toString(),
      userId: attempt.enrollment.userId.toString(),
      quizId: attempt.quizId.toString(),
      score: attempt.totalScore ? Number(attempt.totalScore) : null,
      answers: attempt.quizAttemptAnswers.map((aa) => ({
        questionId: aa.questionId.toString(),
        answerId: aa.selectedAnswerId?.toString(),
        content: aa.textResponse,
        question: {
          id: aa.question.questionId.toString(),
          content: aa.question.contentText,
        },
        answer: aa.selectedAnswer
          ? {
              id: aa.selectedAnswer.answerId.toString(),
              content: aa.selectedAnswer.contentText,
            }
          : null,
      })),
      quiz: {
        lesson: {
          title: attempt.quiz.lesson.title,
          videoPosts: [],
        },
      },
    }));

    const analysis = await analyzeKnowledgeGaps(submissions, lessonContent);

    res.json(analysis);
  } catch (error) {
    return handleAIOrServiceError(error, res, {
      defaultMessage: 'Failed to analyze knowledge gaps',
    });
  }
};

/** Normalize one question from payload (content/contentText/question, answers/options) and ensure exactly one correct */
function normalizeApplyQuestion(q) {
  const content = (q.content || q.contentText || q.question || '').trim();
  const rawAnswers = q.answers || q.options || [];
  const answers = rawAnswers.map((a, j) => ({
    contentText: (a.content || a.contentText || a.text || '').trim(),
    isCorrect: !!a.isCorrect,
    orderIndex: j,
  })).filter((a) => a.contentText.length > 0);
  const correctCount = answers.filter((a) => a.isCorrect).length;
  if (answers.length >= 2 && correctCount !== 1) {
    answers[0].isCorrect = true;
    answers.forEach((a, i) => { if (i > 0) a.isCorrect = false; });
  }
  return { content, answers };
}

/** POST /api/ai/lessons/:lessonId/apply-quiz - create quiz + questions from Gemini payload (lecturer only) */
const applyGeneratedQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, timeLimitMinutes, passingScore, questions } = req.body;
    const userId = req.userId;
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions array is required' });
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

    const normalized = questions.map(normalizeApplyQuestion);
    const validQuestions = normalized.filter((q) => q.content.length > 0 && q.answers.length >= 2);
    if (validQuestions.length === 0) {
      return res.status(400).json({ error: 'No valid questions to save' });
    }

    const existingQuiz = await prisma.quiz.findUnique({
      where: { lessonId: lessonIdInt },
      include: { questions: true },
    });
    if (existingQuiz) {
      await prisma.quiz.delete({ where: { quizId: existingQuiz.quizId } });
    }

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lessonIdInt,
        title: title || 'Quiz',
        timeLimitMinutes: timeLimitMinutes != null ? parseInt(timeLimitMinutes, 10) : DEFAULT_TIME_LIMIT_MINUTES,
        passingScore: passingScore != null ? parseInt(passingScore, 10) : DEFAULT_PASSING_SCORE,
      },
    });

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      const questionAnswers = q.answers.map((a, j) => ({
        contentText: a.contentText,
        isCorrect: a.isCorrect,
        orderIndex: j,
      }));
      await prisma.question.create({
        data: {
          quizId: quiz.quizId,
          contentText: q.content,
          type: 'single_choice',
          orderIndex: i,
          questionAnswers: { create: questionAnswers },
        },
      });
    }

    const created = await prisma.quiz.findUnique({
      where: { quizId: quiz.quizId },
      include: {
        questions: {
          include: { questionAnswers: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (validQuestions.length > 0 && (!created.questions || created.questions.length === 0)) {
      console.error('Apply generated quiz: created quiz has no questions despite validQuestions.length > 0', { quizId: created.quizId });
      return res.status(500).json({ error: 'Failed to save questions; please try again.' });
    }
    if (created.questions.length !== validQuestions.length) {
      console.error('Apply generated quiz: question count mismatch', {
        quizId: created.quizId,
        expected: validQuestions.length,
        actual: created.questions.length,
      });
      return res.status(500).json({ error: 'Not all questions were saved; please try again.' });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('Apply generated quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  generateQuiz,
  applyGeneratedQuiz,
  chatWithTutor,
  getHint,
  getKnowledgeGaps,
};
