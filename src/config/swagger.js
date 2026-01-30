import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 5000;
const baseUrl = `http://localhost:${PORT}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Online Learning Platform API',
      version: '1.0.0',
      description: 'API documentation for E-Learning Platform - Auth, Courses, Lessons, Quizzes, AI Tutor, Payments',
    },
    servers: [
      { url: baseUrl, description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'authToken',
          description: 'Auth token from cookie (set via login/register)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
        },
        User: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Courses', description: 'Course management' },
      { name: 'Lessons', description: 'Lesson management' },
      { name: 'AI', description: 'AI Tutor & Quiz generation' },
      { name: 'Payments', description: 'VNPay payment' },
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'Server is running' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'fullName'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                    fullName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Registered' }, 400: { description: 'Bad request' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Logged in' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ cookieAuth: [] }],
          responses: { 200: { description: 'User info' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/api/courses': {
        get: {
          tags: ['Courses'],
          summary: 'List courses',
          security: [{ cookieAuth: [] }],
          responses: { 200: { description: 'List of courses' } },
        },
        post: {
          tags: ['Courses'],
          summary: 'Create course (instructor)',
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/courses/{courseId}': {
        get: {
          tags: ['Courses'],
          summary: 'Get course by ID',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'courseId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Course details' }, 404: { description: 'Not found' } },
        },
      },
      '/api/ai/lessons/{lessonId}/chat': {
        post: {
          tags: ['AI'],
          summary: 'Chat with AI Tutor (lesson context)',
          security: [{ cookieAuth: [] }],
          parameters: [{ name: 'lessonId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string', description: 'User question' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'AI response' },
            400: { description: 'Message required' },
            503: { description: 'GEMINI_API_KEY not configured' },
          },
        },
      },
      '/api/ai/chat': {
        post: {
          tags: ['AI'],
          summary: 'Chat with AI Tutor (general)',
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'AI response' } },
        },
      },
      '/api/payments/create': {
        post: {
          tags: ['Payments'],
          summary: 'Create VNPay payment',
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['courseId'],
                  properties: {
                    courseId: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Payment URL' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
