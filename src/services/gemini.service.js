import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';

// 1. Khởi tạo với API Key
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const isKeyMissing = !GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'dummy');

// Model name - thử các model theo thứ tự ưu tiên
const MODEL_NAMES = [
  'gemini-flash-latest',      // Latest stable version
  'gemini-2.5-flash',         // Stable version
  'gemini-1.5-pro',           // Fallback option
  'gemini-pro'                 // Last resort
];

// Kiểm tra API key trước khi gọi Gemini
const ensureApiKey = () => {
  if (isKeyMissing) {
    const err = new Error(
      'Thiếu GEMINI_API_KEY. Vui lòng thêm API key vào backend/.env. Lấy key miễn phí tại: https://aistudio.google.com/apikey'
    );
    err.statusCode = 503;
    err.isConfigError = true;
    throw err;
  }
};

// Helper để thử các model theo thứ tự
const tryModels = async (fn) => {
  ensureApiKey();
  let lastError;

  for (const modelName of MODEL_NAMES) {
    try {
      return await fn(modelName);
    } catch (error) {
      lastError = error;
      // Nếu là lỗi 404 (model không tìm thấy), thử model tiếp theo
      if (error instanceof GoogleGenerativeAIFetchError && error.status === 404) {
        console.log(`Model ${modelName} not found, trying next model...`);
        continue;
      }
      // Nếu là lỗi khác (rate limit, auth, etc.), throw ngay
      throw error;
    }
  }

  // Nếu tất cả model đều 404
  throw lastError;
};

// Helper function để xử lý lỗi 429 với retry logic
const handleGeminiError = (error, operation) => {
  // Kiểm tra nếu là lỗi 429 (Rate Limit)
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    const retryInfo = error.errorDetails?.find(
      (detail) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );

    // Parse retryDelay từ string hoặc object
    let retryDelaySeconds = 60; // Default 60 seconds
    if (retryInfo?.retryDelay) {
      if (typeof retryInfo.retryDelay === 'string') {
        retryDelaySeconds = Number.parseInt(retryInfo.retryDelay, 10) || 60;
      } else if (typeof retryInfo.retryDelay === 'number') {
        retryDelaySeconds = retryInfo.retryDelay;
      }
    }

    const friendlyMessage = `Hệ thống AI đang bận một chút, bạn vui lòng đợi ${retryDelaySeconds} giây rồi thử lại nhé!`;

    console.error(`[${operation}] Rate limit exceeded. Retry after ${retryDelaySeconds}s`);

    // Throw error với message thân thiện
    const rateLimitError = new Error(friendlyMessage);
    rateLimitError.statusCode = 429;
    rateLimitError.isRateLimit = true;
    rateLimitError.retryAfter = retryDelaySeconds;
    throw rateLimitError;
  }

  // Kiểm tra các lỗi khác
  if (error instanceof GoogleGenerativeAIFetchError) {
    console.error(`[${operation}] Gemini API Error:`, {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
    });

    // Lỗi 404 - Model không tìm thấy
    if (error.status === 404) {
      const notFoundError = new Error('Model không khả dụng. Vui lòng liên hệ quản trị viên.');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    // Lỗi 401/403 - API Key không hợp lệ
    if (error.status === 401 || error.status === 403) {
      const authError = new Error('API Key không hợp lệ hoặc đã hết hạn.');
      authError.statusCode = error.status;
      throw authError;
    }

    // Lỗi khác
    const apiError = new Error('Lỗi kết nối với dịch vụ AI. Vui lòng thử lại sau.');
    apiError.statusCode = error.status || 500;
    throw apiError;
  }

  // Lỗi không xác định
  console.error(`[${operation}] Unexpected error:`, error);
  throw error;
};

// Helper function để retry với exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, operation = 'Gemini API call') => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Nếu là lỗi rate limit và còn retry
      if (error instanceof Error && error.isRateLimit && attempt < maxRetries) {
        const delay = error.retryAfter ? error.retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
        console.log(`[${operation}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Nếu không phải rate limit hoặc hết retry, throw error
      throw error;
    }
  }

  throw lastError;
};

export const generateQuizFromContent = async (content, numQuestions = 5) => {
  try {
    return await retryWithBackoff(async () => {
      return await tryModels(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Generate ${numQuestions} multiple choice questions based on the following educational content. 
    Return the questions in JSON format with this structure:
    {
      "questions": [
        {
          "content": "question text",
          "answers": [
            {"content": "answer option", "isCorrect": true/false},
            ...
          ]
        },
        ...
      ]
    }
    
    Content:
    ${content}
    
    Make sure to have exactly 4 answer options per question, with only one correct answer.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Failed to parse quiz from AI response');
      });
    }, 3, 1000, 'generateQuizFromContent');
  } catch (error) {
    handleGeminiError(error, 'generateQuizFromContent');
  }
};

// 2. ÉP BUỘC sử dụng model và cấu hình đúng
export const getAITutorResponse = async (question, lessonContent) => {
  try {
    return await tryModels(async (modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      // Detect if this is a quiz question
      const isQuizQuestion = question.includes('Câu hỏi:') || question.includes('Question:') ||
                            question.match(/^[A-D]\./);

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
    console.error("Lỗi chi tiết:", error);
    handleGeminiError(error, 'getAITutorResponse');
  }
};

export const getStructuredTutorResponse = async (question, lessonContent) => {
  try {
    return await retryWithBackoff(async () => {
      return await tryModels(async (modelName) => {
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

        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);

            // Validate structure
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

        // Return null if parsing fails - controller will fallback to plain text
        return null;
      });
    }, 3, 1000, 'getStructuredTutorResponse');
  } catch (error) {
    // Với structured response, nếu lỗi thì return null để fallback sang plain text
    // Controller sẽ tự động fallback sang getAITutorResponse
    if (error instanceof Error && error.isRateLimit) {
      console.error('Error getting structured tutor response (rate limit):', error);
      return null;
    }

    // Log error nhưng không throw để fallback sang plain text
    console.error('Error getting structured tutor response:', error);
    return null;
  }
};

export const getAIHint = async (question, userAnswer, correctAnswer, lessonContent) => {
  try {
    return await retryWithBackoff(async () => {
      return await tryModels(async (modelName) => {
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
      });
    }, 3, 1000, 'getAIHint');
  } catch (error) {
    handleGeminiError(error, 'getAIHint');
  }
};

export const analyzeKnowledgeGaps = async (submissions, lessonContent) => {
  try {
    return await retryWithBackoff(async () => {
      return await tryModels(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        // Analyze which questions were answered incorrectly most often
        const incorrectQuestions = {};
        submissions.forEach((submission) => {
          submission.answers.forEach((answer) => {
            if (!answer.answer?.isCorrect && answer.question) {
              incorrectQuestions[answer.question.id] = (incorrectQuestions[answer.question.id] || 0) + 1;
            }
          });
        });

        const prompt = `Analyze the student's quiz performance and identify knowledge gaps. 
    The following questions were answered incorrectly:
    ${Object.entries(incorrectQuestions).map(([qId, count]) => `Question ID ${qId}: ${count} incorrect attempts`).join('\n')}
    
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
      });
    }, 3, 1000, 'analyzeKnowledgeGaps');
  } catch (error) {
    // Nếu lỗi rate limit, trả về kết quả mặc định thay vì throw error
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
