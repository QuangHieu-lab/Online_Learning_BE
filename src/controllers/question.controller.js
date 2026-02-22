const prisma = require('../utils/prisma');
const { ensureQuestionOwnership, ensureAnswerOwnership, sendAccessError } = require('../utils/access.helpers');

const createQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { contentText, type, orderIndex, questionAnswers } = req.body;
    const userId = req.userId;

    const access = await ensureQuestionOwnership(quizId, userId, false);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const quizIdInt = access.quiz.quizId;

    const contentTextTrimmed = (contentText != null ? String(contentText) : '').trim();
    if (!contentTextTrimmed) {
      return res.status(400).json({ error: 'Question content is required' });
    }
    const questionType = type || 'single_choice';
    const answers = Array.isArray(questionAnswers) ? questionAnswers : [];
    const validAnswers = answers
      .map((a, i) => ({
        contentText: (a.contentText != null ? String(a.contentText) : '').trim(),
        isCorrect: !!a.isCorrect,
        orderIndex: a.orderIndex != null ? a.orderIndex : i,
      }))
      .filter((a) => a.contentText.length > 0);

    if (validAnswers.length < 2) {
      return res.status(400).json({ error: 'At least 2 answers required' });
    }
    if (questionType === 'single_choice') {
      const correctCount = validAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({ error: 'Exactly one correct answer required for single_choice' });
      }
    }

    const question = await prisma.question.create({
      data: {
        quizId: quizIdInt,
        contentText: contentTextTrimmed,
        type: questionType,
        orderIndex: orderIndex != null ? orderIndex : 0,
        questionAnswers: {
          create: validAnswers.map((a, i) => ({
            contentText: a.contentText,
            isCorrect: a.isCorrect,
            orderIndex: a.orderIndex != null ? a.orderIndex : i,
          })),
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

const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { contentText, type, orderIndex } = req.body;
    const userId = req.userId;

    const access = await ensureQuestionOwnership(questionId, userId, true);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const questionIdInt = access.question.questionId;

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

const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.userId;

    const access = await ensureQuestionOwnership(questionId, userId, true);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    await prisma.question.delete({
      where: { questionId: access.question.questionId },
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { contentText, isCorrect, orderIndex } = req.body;
    const userId = req.userId;

    const access = await ensureQuestionOwnership(questionId, userId, true);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const questionIdInt = access.question.questionId;

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

const updateAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { contentText, isCorrect, orderIndex } = req.body;
    const userId = req.userId;

    const access = await ensureAnswerOwnership(answerId, userId);
    if (access.error) {
      return sendAccessError(res, access.error);
    }
    const answerIdInt = access.answer.answerId;

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

const deleteAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.userId;

    const access = await ensureAnswerOwnership(answerId, userId);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    await prisma.questionAnswer.delete({
      where: { answerId: access.answer.answerId },
    });

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
};
