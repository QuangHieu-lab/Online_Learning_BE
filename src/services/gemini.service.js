const { GoogleGenerativeAI, GoogleGenerativeAIFetchError } = require('@google/generative-ai');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_KEY || GEMINI_KEY === 'your-gemini-api-key-here') {
  console.warn(
    '[Gemini] GEMINI_API_KEY chưa được cấu hình hoặc đang dùng placeholder. Tính năng Generate Quiz / AI Tutor sẽ trả lỗi 400. Đặt key trong backend/.env (https://aistudio.google.com/apikey) và restart server.'
  );
}
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const MODEL_NAMES = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

const tryModels = async (fn) => {
  let lastError;
  for (const modelName of MODEL_NAMES) {
    try {
      return await fn(modelName);
    } catch (error) {
      lastError = error;
      const status = error?.status ?? error?.statusCode;
      if (error instanceof GoogleGenerativeAIFetchError && (status === 404 || status === 503 || status === 502)) {
        console.log(`[Gemini] Model ${modelName} ${status === 404 ? 'not found' : 'unavailable (503/502)'}, trying next...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const handleGeminiError = (error, operation) => {
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    const retryInfo = (error.errorDetails || []).find(
      (detail) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );
    let retryDelaySeconds = 60;
    if (retryInfo?.retryDelay) {
      if (typeof retryInfo.retryDelay === 'string') {
        retryDelaySeconds = Number.parseInt(retryInfo.retryDelay, 10) || 60;
      } else if (typeof retryInfo.retryDelay === 'number') {
        retryDelaySeconds = retryInfo.retryDelay;
      }
    }
    const friendlyMessage = `Hệ thống AI đang bận một chút, bạn vui lòng đợi ${retryDelaySeconds} giây rồi thử lại nhé!`;
    console.error(`[${operation}] Rate limit exceeded. Retry after ${retryDelaySeconds}s`);
    const rateLimitError = new Error(friendlyMessage);
    rateLimitError.statusCode = 429;
    rateLimitError.isRateLimit = true;
    rateLimitError.retryAfter = retryDelaySeconds;
    throw rateLimitError;
  }

  if (error instanceof GoogleGenerativeAIFetchError) {
    console.error(`[${operation}] Gemini API Error:`, {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
    });
    if (error.status === 404) {
      const notFoundError = new Error('Model không khả dụng. Vui lòng liên hệ quản trị viên.');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    if (error.status === 401 || error.status === 403) {
      const authError = new Error('API Key không hợp lệ hoặc đã hết hạn.');
      authError.statusCode = error.status;
      throw authError;
    }
    if (error.status === 400 && (error.message || '').includes('API key not valid')) {
      const keyError = new Error(
        'GEMINI_API_KEY chưa được cấu hình hoặc không hợp lệ. Vui lòng đặt API key trong file backend/.env (lấy key tại https://aistudio.google.com/apikey) và khởi động lại server.'
      );
      keyError.statusCode = 400;
      throw keyError;
    }
    const apiError = new Error('Lỗi kết nối với dịch vụ AI. Vui lòng thử lại sau.');
    apiError.statusCode = error.status || 500;
    throw apiError;
  }

  console.error(`[${operation}] Unexpected error:`, error);
  throw error;
};

const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, operation = 'Gemini API call') => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.status ?? error?.statusCode;
      const isRetryable = error?.isRateLimit || status === 503 || status === 502;
      if (isRetryable && attempt < maxRetries) {
        const delay = error?.retryAfter ? error.retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
        console.log(`[${operation}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms (${status === 503 || status === 502 ? 'service busy' : 'rate limit'})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/** Normalize one question from AI: support content/contentText/question and answers/options */
function normalizeAiQuestion(q) {
  const content = (q.content || q.contentText || q.question || '').trim();
  const rawAnswers = q.answers || q.options || [];
  const answers = rawAnswers.map((a, j) => ({
    content: (a.content || a.contentText || a.text || '').trim(),
    isCorrect: !!a.isCorrect,
    orderIndex: j,
  })).filter((a) => a.content.length > 0);
  const correctCount = answers.filter((a) => a.isCorrect).length;
  if (answers.length >= 2 && correctCount !== 1) {
    answers[0].isCorrect = true;
    answers.forEach((a, i) => { if (i > 0) a.isCorrect = false; });
  }
  return { content, answers };
}

/** Validate and filter: keep only questions with non-empty content and at least 2 answers, exactly one correct */
function filterValidQuestions(normalized) {
  return normalized.filter((q) => q.content.length > 0 && q.answers.length >= 2);
}

const generateQuizFromContent = async (content, numQuestions = 5, existingQuestionTexts = []) => {
  try {
    const excludeBlock =
      existingQuestionTexts.length > 0
        ? `

IMPORTANT - DO NOT DUPLICATE: The quiz already has the following questions. You MUST generate completely NEW questions with different wording and different topics/focus. Do not copy or rephrase these:
${existingQuestionTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`
        : '';

    return await retryWithBackoff(
      () =>
        tryModels(async (modelName) => {
          const model = genAI.getGenerativeModel({ model: modelName });
          const prompt = `Generate ${numQuestions} multiple choice questions based on the following educational content.
${excludeBlock}

You must return a single JSON object with exactly one key: "questions" (an array). No other keys.
Each question must have:
- "content": string (the question text, not empty)
- "answers": array of exactly 4 objects, each with "content": string (option text) and "isCorrect": boolean (exactly one must be true per question)

Format:
{"questions":[{"content":"question text","answers":[{"content":"option A","isCorrect":false},{"content":"option B","isCorrect":true},{"content":"option C","isCorrect":false},{"content":"option D","isCorrect":false}]}]}

Rules: 4 answer options per question, exactly one isCorrect: true. Question and all option texts must be non-empty and clear. Generate NEW questions only.

Content:
${content}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('Failed to parse quiz from AI response');
          const parsed = JSON.parse(jsonMatch[0]);
          const rawList = parsed.questions || parsed.data?.questions || [];
          if (!Array.isArray(rawList)) throw new Error('AI did not return valid questions');
          const normalized = rawList.map(normalizeAiQuestion);
          const valid = filterValidQuestions(normalized);
          if (valid.length === 0) throw new Error('AI did not return valid questions');
          return { questions: valid };
        }),
      3,
      1000,
      'generateQuizFromContent'
    );
  } catch (error) {
    handleGeminiError(error, 'generateQuizFromContent');
  }
};

const getAITutorResponse = async (question, lessonContent) => {
  try {
    return await tryModels(async (modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const isQuizQuestion =
        question.includes('Câu hỏi:') || question.includes('Question:') || /^[A-D]\./.test(question);

      let prompt = `You are an AI tutor helping a student. Your goal is to help them learn, not just give answers.

IMPORTANT GUIDELINES:
1. If the student asks about a quiz question, guide them through the problem-solving process
2. Explain concepts clearly with examples
3. Use step-by-step reasoning
4. For math problems, show your work
5. Encourage critical thinking
6. If they ask for the answer directly, guide them to find it themselves first`;

      if (isQuizQuestion) {
        prompt += `\n\nThis appears to be a quiz question. Help the student understand:
- The key concepts involved
- Step-by-step approach to solve it
- Common mistakes to avoid
- How to verify their answer
DO NOT give the direct answer immediately. Guide them to discover it.`;
      }

      if (lessonContent) {
        prompt += `\n\nUse the following lesson content as context:\n${lessonContent}\n\n`;
      }

      prompt += `\nStudent's question:\n${question}\n\nProvide a helpful, educational response that promotes learning.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('Lỗi chi tiết:', error);
    handleGeminiError(error, 'getAITutorResponse');
  }
};

const getStructuredTutorResponse = async (question, lessonContent) => {
  try {
    return await retryWithBackoff(
      () =>
        tryModels(async (modelName) => {
          const model = genAI.getGenerativeModel({ model: modelName });
          const systemPrompt = `Bạn là một trợ giảng toán học/lý thuyết tận tâm. Nhiệm vụ của bạn là giúp sinh viên học tập hiệu quả, KHÔNG được cho đáp án ngay lập tức.

Khi nhận được câu hỏi, bạn phải tuân theo luồng sau:

B1: Nhắc lại kiến thức cốt lõi liên quan đến câu hỏi
B2: Đưa ra gợi ý (Hint) và 3 bài tập tương tự để sinh viên tự luyện tập
B3: Cung cấp lời giải chi tiết (Solution) - nhưng chỉ khi sinh viên yêu cầu

LƯU Ý QUAN TRỌNG:
- Tất cả công thức toán học phải được bọc trong ký hiệu $ (ví dụ: $ax^2 + bx + c = 0$)
- Công thức phức tạp hoặc công thức hiển thị riêng dòng dùng $$ (ví dụ: $$\\int_0^1 x^2 dx = \\frac{1}{3}$$)
- Trả về dữ liệu CHỈ DẠNG JSON với cấu trúc chính xác:
{
  "hints": "string chứa gợi ý và kiến thức cốt lõi",
  "exercises": [
    {"question": "Câu hỏi bài tập 1", "hint": "Gợi ý cho bài tập 1 (optional)"},
    {"question": "Câu hỏi bài tập 2", "hint": "Gợi ý cho bài tập 2 (optional)"},
    {"question": "Câu hỏi bài tập 3", "hint": "Gợi ý cho bài tập 3 (optional)"}
  ],
  "solution": "Lời giải chi tiết với markdown và công thức toán"
}

KHÔNG được trả về bất kỳ text nào ngoài JSON object.`;

          let prompt = systemPrompt;
          if (lessonContent) {
            prompt += `\n\nNội dung bài học để tham khảo:\n${lessonContent}\n\n`;
          }
          prompt += `\nCâu hỏi của sinh viên: ${question}\n\nHãy trả về JSON theo đúng cấu trúc đã yêu cầu.`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (
                parsed.hints &&
                Array.isArray(parsed.exercises) &&
                parsed.exercises.length === 3 &&
                parsed.solution
              ) {
                return {
                  hints: parsed.hints,
                  exercises: parsed.exercises.map((ex) => ({
                    question: ex.question || '',
                    hint: ex.hint || undefined,
                  })),
                  solution: parsed.solution,
                };
              }
            } catch (parseError) {
              console.error('Error parsing structured response JSON:', parseError);
            }
          }
          return null;
        }),
      3,
      1000,
      'getStructuredTutorResponse'
    );
  } catch (error) {
    if (error instanceof Error && error.isRateLimit) {
      console.error('Error getting structured tutor response (rate limit):', error);
      return null;
    }
    console.error('Error getting structured tutor response:', error);
    return null;
  }
};

const getAIHint = async (question, userAnswer, correctAnswer, lessonContent) => {
  try {
    return await retryWithBackoff(
      () =>
        tryModels(async (modelName) => {
          const model = genAI.getGenerativeModel({ model: modelName });
          let prompt = `A student answered a question incorrectly. Instead of giving them the answer directly, provide a helpful hint that guides them to think about the correct answer.

Question: ${question}
Student's answer: ${userAnswer}
Correct answer: ${correctAnswer}`;

          if (lessonContent) {
            prompt += `\n\nLesson content for context:\n${lessonContent}`;
          }

          prompt += `\n\nProvide a hint that helps the student understand their mistake and guides them toward the correct answer without directly stating it.`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        }),
      3,
      1000,
      'getAIHint'
    );
  } catch (error) {
    handleGeminiError(error, 'getAIHint');
  }
};

const analyzeKnowledgeGaps = async (submissions, lessonContent) => {
  try {
    return await retryWithBackoff(
      () =>
        tryModels(async (modelName) => {
          const model = genAI.getGenerativeModel({ model: modelName });
          const incorrectQuestions = {};
          submissions.forEach((submission) => {
            submission.answers.forEach((answer) => {
              if (!answer.answer?.isCorrect && answer.question) {
                incorrectQuestions[answer.question.id] =
                  (incorrectQuestions[answer.question.id] || 0) + 1;
              }
            });
          });

          const prompt = `Analyze the student's quiz performance and identify knowledge gaps. 
    The following questions were answered incorrectly:
    ${Object.entries(incorrectQuestions)
      .map(([qId, count]) => `Question ID ${qId}: ${count} incorrect attempts`)
      .join('\n')}
    
    ${lessonContent ? `Lesson content:\n${lessonContent}\n` : ''}
    
    Provide an analysis in JSON format:
    {
      "gaps": [
        {
          "topic": "topic name",
          "severity": "high/medium/low",
          "recommendation": "what to study"
        }
      ],
      "overall": "overall assessment"
    }`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }

          return {
            gaps: [],
            overall: 'Unable to analyze knowledge gaps at this time.',
          };
        }),
      3,
      1000,
      'analyzeKnowledgeGaps'
    );
  } catch (error) {
    if (error instanceof Error && error.isRateLimit) {
      console.error('Error analyzing knowledge gaps (rate limit):', error);
      return {
        gaps: [],
        overall: 'Không thể phân tích lỗ hổng kiến thức vào lúc này. Vui lòng thử lại sau.',
      };
    }
    handleGeminiError(error, 'analyzeKnowledgeGaps');
  }
};

module.exports = {
  generateQuizFromContent,
  getAITutorResponse,
  getStructuredTutorResponse,
  getAIHint,
  analyzeKnowledgeGaps,
};
