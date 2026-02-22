/**
 * Score a quiz submission: compute correctCount, questionResults, quizAttemptAnswers, score.
 * answers: array of { questionId, answerId?, content? }
 */
function scoreQuizSubmission(quiz, answers) {
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
        const selectedAnswer = question.questionAnswers.find((a) => a.answerId === userAnswer.answerId);
        userAnswerContent = selectedAnswer?.contentText || null;
        if (userAnswer.answerId === correctAnswer?.answerId) {
          isCorrect = true;
          correctCount++;
        }
      }
    } else if (question.type === 'fill_in_blank') {
      isCorrect = true;
      correctCount++;
      if (userAnswer) userAnswerContent = userAnswer.content || null;
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
    quizAttemptAnswers.push({
      questionId: question.questionId,
      selectedAnswerId: userAnswer?.answerId || null,
      textResponse: userAnswer?.content || null,
      isCorrect,
    });
  }

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  return { correctCount, totalQuestions, questionResults, quizAttemptAnswers, score };
}

/**
 * Build question results for getQuizById from an attempt with quizAttemptAnswers (include selectedAnswer).
 */
function buildQuestionResultsFromAttempt(quiz, attemptWithAnswers) {
  if (!attemptWithAnswers || !attemptWithAnswers.quizAttemptAnswers) return [];
  const results = [];
  for (const question of quiz.questions) {
    const attemptAnswer = attemptWithAnswers.quizAttemptAnswers.find(
      (a) => a.questionId === question.questionId
    );
    const correctAnswer = question.questionAnswers.find((a) => a.isCorrect);
    const userAnswer = attemptAnswer?.selectedAnswer;
    results.push({
      questionId: question.questionId,
      questionContent: question.contentText,
      isCorrect: attemptAnswer?.isCorrect ?? (attemptAnswer?.selectedAnswerId === correctAnswer?.answerId),
      correctAnswerId: correctAnswer?.answerId || null,
      correctAnswerContent: correctAnswer?.contentText || null,
      userAnswerId: attemptAnswer?.selectedAnswerId || null,
      userAnswerContent: userAnswer?.contentText || attemptAnswer?.textResponse || null,
    });
  }
  return results;
}

module.exports = {
  scoreQuizSubmission,
  buildQuestionResultsFromAttempt,
};
