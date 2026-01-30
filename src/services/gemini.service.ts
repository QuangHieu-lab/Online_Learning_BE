import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai';

// 1. Khởi tạo với API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Model name - thử các model theo thứ tự ưu tiên
const MODEL_NAMES = [
  'gemini-flash-latest',      // Latest stable version
  'gemini-2.5-flash',         // Stable version
  'gemini-1.5-pro',           // Fallback option
  'gemini-pro'                 // Last resort
];

// Helper để thử các model theo thứ tự
const tryModels = async <T>(fn: (modelName: string) => Promise<T>): Promise<T> => {
  let lastError: unknown;
  
  for (const modelName of MODEL_NAMES) {
    try {
      return await fn(modelName);
    } catch (error: unknown) {
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

// Type guard for error with retry info
interface RetryInfoDetail {
  '@type'?: string;
  retryDelay?: string | number;
}

interface CustomError extends Error {
  statusCode?: number;
  isRateLimit?: boolean;
  retryAfter?: number;
}

// Helper function để xử lý lỗi 429 với retry logic
const handleGeminiError = (error: unknown, operation: string): never => {
  // Kiểm tra nếu là lỗi 429 (Rate Limit)
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 429) {
    const retryInfo = (error.errorDetails as RetryInfoDetail[] | undefined)?.find(
      (detail: RetryInfoDetail) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
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
    const rateLimitError: CustomError = new Error(friendlyMessage);
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
      const notFoundError: CustomError = new Error('Model không khả dụng. Vui lòng liên hệ quản trị viên.');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    // Lỗi 401/403 - API Key không hợp lệ
    if (error.status === 401 || error.status === 403) {
      const authError: CustomError = new Error('API Key không hợp lệ hoặc đã hết hạn.');
      authError.statusCode = error.status;
      throw authError;
    }

    // Lỗi khác
    const apiError: CustomError = new Error('Lỗi kết nối với dịch vụ AI. Vui lòng thử lại sau.');
    apiError.statusCode = error.status || 500;
    throw apiError;
  }

  // Lỗi không xác định
  console.error(`[${operation}] Unexpected error:`, error);
  throw error;
};

// Helper function để retry với exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operation: string = 'Gemini API call'
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Nếu là lỗi rate limit và còn retry
      if (error instanceof Error && (error as CustomError).isRateLimit && attempt < maxRetries) {
        const customError = error as CustomError;
        const delay = customError.retryAfter ? customError.retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
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

export const generateQuizFromContent = async (content: string, numQuestions: number = 5) => {
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
export const getAITutorResponse = async (question: string, lessonContent?: string) => {
  try {
    return await tryModels(async (modelName) => {
      // Lưu ý: Thử đổi model name thành "gemini-flash-latest" 
      // để Google tự tìm bản ổn định nhất
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
  } catch (error: unknown) {
    // Nếu vẫn 404, có thể do vùng (Region) hoặc Key cũ. 
    // Hãy thử đổi model sang "gemini-1.5-pro" xem có bị 404 nữa không.
    console.error("Lỗi chi tiết:", error);
    handleGeminiError(error, 'getAITutorResponse');
  }
};

export interface StructuredTutorResponse {
  hints: string;
  exercises: Array<{
    question: string;
    hint?: string;
  }>;
  solution: string;
}

export const getStructuredTutorResponse = async (
  question: string,
  lessonContent?: string
): Promise<StructuredTutorResponse | null> => {
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
            interface Exercise {
              question?: string;
              hint?: string;
            }
            
            return {
              hints: parsed.hints,
              exercises: (parsed.exercises as Exercise[]).map((ex: Exercise) => ({
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
  } catch (error: unknown) {
    // Với structured response, nếu lỗi thì return null để fallback sang plain text
    // Controller sẽ tự động fallback sang getAITutorResponse
    if (error instanceof Error && (error as CustomError).isRateLimit) {
      console.error('Error getting structured tutor response (rate limit):', error);
      return null;
    }
    
    // Log error nhưng không throw để fallback sang plain text
    console.error('Error getting structured tutor response:', error);
    return null;
  }
};

export const getAIHint = async (question: string, userAnswer: string, correctAnswer: string, lessonContent?: string) => {
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

// Type for submission with answers and questions
type SubmissionWithAnswers = {
  answers: Array<{
    answer?: { isCorrect?: boolean } | null;
    question?: { id: string } | null;
  }>;
};

export const analyzeKnowledgeGaps = async (submissions: SubmissionWithAnswers[], lessonContent?: string) => {
  try {
    return await retryWithBackoff(async () => {
      return await tryModels(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        // Analyze which questions were answered incorrectly most often
        const incorrectQuestions: Record<string, number> = {};
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
  } catch (error: unknown) {
    // Nếu lỗi rate limit, trả về kết quả mặc định thay vì throw error
    if (error instanceof Error && (error as CustomError).isRateLimit) {
      console.error('Error analyzing knowledge gaps (rate limit):', error);
      return {
        gaps: [],
        overall: 'Không thể phân tích lỗ hổng kiến thức vào lúc này. Vui lòng thử lại sau.',
      };
    }
    handleGeminiError(error, 'analyzeKnowledgeGaps');
  }
};
