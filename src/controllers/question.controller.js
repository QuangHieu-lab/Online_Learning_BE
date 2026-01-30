import prisma from '../utils/prisma.js';

export const createQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quizIdInt = parseInt(quizId);
    const { contentText, type, orderIndex, questionAnswers } = req.body;
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

    const question = await prisma.question.create({
      data: {
        quizId: quizIdInt,
        contentText,
        type: type || 'single_choice',
        orderIndex: orderIndex || 0,
        questionAnswers: {
          create: questionAnswers || [],
        },
      },
      include: {
        questionAnswers: true,
      },
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionIdInt = parseInt(questionId);
    const { contentText, type, orderIndex } = req.body;
    const userId = req.userId;

    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const question = await prisma.question.findUnique({
      where: { questionId: questionIdInt },
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
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { questionId: questionIdInt },
      data: {
        contentText,
        type,
        orderIndex,
      },
      include: {
        questionAnswers: true,
      },
    });

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionIdInt = parseInt(questionId);
    const userId = req.userId;

    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const question = await prisma.question.findUnique({
      where: { questionId: questionIdInt },
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
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.question.delete({
      where: { questionId: questionIdInt },
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const questionIdInt = parseInt(questionId);
    const { contentText, isCorrect, orderIndex } = req.body;
    const userId = req.userId;

    if (isNaN(questionIdInt)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const question = await prisma.question.findUnique({
      where: { questionId: questionIdInt },
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
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const answer = await prisma.questionAnswer.create({
      data: {
        questionId: questionIdInt,
        contentText,
        isCorrect: isCorrect || false,
        orderIndex: orderIndex || 0,
      },
    });

    res.status(201).json(answer);
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const answerIdInt = parseInt(answerId);
    const { contentText, isCorrect, orderIndex } = req.body;
    const userId = req.userId;

    if (isNaN(answerIdInt)) {
      return res.status(400).json({ error: 'Invalid answer ID' });
    }

    const answer = await prisma.questionAnswer.findUnique({
      where: { answerId: answerIdInt },
      include: {
        question: {
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
          },
        },
      },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    if (answer.question.quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedAnswer = await prisma.questionAnswer.update({
      where: { answerId: answerIdInt },
      data: {
        contentText,
        isCorrect,
        orderIndex,
      },
    });

    res.json(updatedAnswer);
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const answerIdInt = parseInt(answerId);
    const userId = req.userId;

    if (isNaN(answerIdInt)) {
      return res.status(400).json({ error: 'Invalid answer ID' });
    }

    const answer = await prisma.questionAnswer.findUnique({
      where: { answerId: answerIdInt },
      include: {
        question: {
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
          },
        },
      },
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    if (answer.question.quiz.lesson.module.course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.questionAnswer.delete({
      where: { answerId: answerIdInt },
    });

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
