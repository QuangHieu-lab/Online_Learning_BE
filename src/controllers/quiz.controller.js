const prisma = require('../utils/prisma');

const createQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, timeLimitMinutes, passingScore } = req.body;
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

const getQuizzes = async (req, res) => {
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

const getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const userId = req.userId;

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

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.lesson.module.course.courseId,
        },
      },
    });

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

    let questionResults = [];
    if (existingAttempt) {
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

    res.json({
      quiz,
      attempt: existingAttempt,
      questionResults: existingAttempt ? questionResults : [],
      canRetake: true,
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const { title, timeLimitMinutes, passingScore } = req.body;
    const userId = req.userId;

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

const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const userId = req.userId;

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

const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const { answers } = req.body;
    const userId = req.userId;

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
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

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

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const questionResults = [];
    const quizAttemptAnswers = [];

    for (const question of quiz.questions) {
      const userAnswer = answers.find((a) => a.questionId === question.questionId);
      let isCorrect = false;
      let correctAnswerId = null;
      let correctAnswerContent = null;
      let userAnswerContent = null;

      if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
        correctAnswerId = correctAnswer?.answerId || null;
        correctAnswerContent = correctAnswer?.contentText || null;

        if (userAnswer) {
          const selectedAnswer = question.questionAnswers.find(
            (a) => a.answerId === userAnswer.answerId
          );
          userAnswerContent = selectedAnswer?.contentText || null;
          if (userAnswer.answerId === correctAnswer?.answerId) {
            isCorrect = true;
            correctCount++;
          }
        }
      } else if (question.type === 'fill_in_blank') {
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
          const selectedAnswer = question.questionAnswers.find(
            (a) => a.answerId === userAnswer.answerId
          );
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

      quizAttemptAnswers.push({
        questionId: question.questionId,
        selectedAnswerId: userAnswer?.answerId || null,
        textResponse: userAnswer?.content || null,
        isCorrect,
      });
    }

    const score = Math.round((correctCount / totalQuestions) * 100);

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
      questionResults,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
};
