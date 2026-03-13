const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { buildEnrollmentProgressSnapshot } = require('../src/utils/progress.utils');

const prisma = new PrismaClient();

const SAMPLE_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const SAMPLE_DOC_URL = 'https://file-examples.com/storage/fe0f3c1a6cd5b286276f4e5/2017/02/file-sample_100kB.doc';
const SAMPLE_VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
];

const WEB_FOUNDATIONS_QUESTIONS = [
  {
    contentText: 'Which HTML tag is used for the largest heading?',
    questionAnswers: [
      { contentText: '<h1>', isCorrect: true, orderIndex: 0 },
      { contentText: '<header>', isCorrect: false, orderIndex: 1 },
      { contentText: '<head>', isCorrect: false, orderIndex: 2 },
      { contentText: '<h6>', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What does semantic HTML improve the most?',
    questionAnswers: [
      { contentText: 'Accessibility and document structure', isCorrect: true, orderIndex: 0 },
      { contentText: 'Database speed', isCorrect: false, orderIndex: 1 },
      { contentText: 'Image resolution', isCorrect: false, orderIndex: 2 },
      { contentText: 'Server uptime', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which input type is best for an email field?',
    questionAnswers: [
      { contentText: 'text', isCorrect: false, orderIndex: 0 },
      { contentText: 'email', isCorrect: true, orderIndex: 1 },
      { contentText: 'string', isCorrect: false, orderIndex: 2 },
      { contentText: 'mailbox', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which element is used for navigation links?',
    questionAnswers: [
      { contentText: '<menu>', isCorrect: false, orderIndex: 0 },
      { contentText: '<nav>', isCorrect: true, orderIndex: 1 },
      { contentText: '<aside>', isCorrect: false, orderIndex: 2 },
      { contentText: '<footer>', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Why are labels important in forms?',
    questionAnswers: [
      { contentText: 'They improve usability and accessibility', isCorrect: true, orderIndex: 0 },
      { contentText: 'They make CSS faster', isCorrect: false, orderIndex: 1 },
      { contentText: 'They replace validation rules', isCorrect: false, orderIndex: 2 },
      { contentText: 'They remove the need for placeholders', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const CSS_LAYOUT_QUESTIONS = [
  {
    contentText: 'Which CSS layout system is one-dimensional?',
    questionAnswers: [
      { contentText: 'Flexbox', isCorrect: true, orderIndex: 0 },
      { contentText: 'Grid', isCorrect: false, orderIndex: 1 },
      { contentText: 'Float', isCorrect: false, orderIndex: 2 },
      { contentText: 'Position absolute', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which property centers items on the main axis in Flexbox?',
    questionAnswers: [
      { contentText: 'align-items', isCorrect: false, orderIndex: 0 },
      { contentText: 'justify-content', isCorrect: true, orderIndex: 1 },
      { contentText: 'place-content', isCorrect: false, orderIndex: 2 },
      { contentText: 'align-content', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which CSS function creates repeating columns in Grid?',
    questionAnswers: [
      { contentText: 'minmax()', isCorrect: false, orderIndex: 0 },
      { contentText: 'repeat()', isCorrect: true, orderIndex: 1 },
      { contentText: 'calc()', isCorrect: false, orderIndex: 2 },
      { contentText: 'span()', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What does gap control in modern layout systems?',
    questionAnswers: [
      { contentText: 'The spacing between rows and columns', isCorrect: true, orderIndex: 0 },
      { contentText: 'The page margin', isCorrect: false, orderIndex: 1 },
      { contentText: 'The text line-height', isCorrect: false, orderIndex: 2 },
      { contentText: 'The scrollbar width', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const CAPSTONE_QUESTIONS = [
  {
    contentText: 'Which practice improves maintainability in a small frontend project?',
    questionAnswers: [
      { contentText: 'Breaking UI into reusable components', isCorrect: true, orderIndex: 0 },
      { contentText: 'Keeping all code in one file', isCorrect: false, orderIndex: 1 },
      { contentText: 'Avoiding CSS completely', isCorrect: false, orderIndex: 2 },
      { contentText: 'Removing all comments', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the main purpose of an API client service layer?',
    questionAnswers: [
      { contentText: 'Centralizing request logic and error handling', isCorrect: true, orderIndex: 0 },
      { contentText: 'Storing image assets', isCorrect: false, orderIndex: 1 },
      { contentText: 'Replacing the database', isCorrect: false, orderIndex: 2 },
      { contentText: 'Compiling JSX into HTML', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What does progress tracking need to be trustworthy?',
    questionAnswers: [
      { contentText: 'Server-side rules and consistent data', isCorrect: true, orderIndex: 0 },
      { contentText: 'Only local storage', isCorrect: false, orderIndex: 1 },
      { contentText: 'Hard-coded 100% completion', isCorrect: false, orderIndex: 2 },
      { contentText: 'No lesson ordering', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What should an instructor dashboard highlight first?',
    questionAnswers: [
      { contentText: 'Current student progress and bottlenecks', isCorrect: true, orderIndex: 0 },
      { contentText: 'Hidden debug IDs', isCorrect: false, orderIndex: 1 },
      { contentText: 'Unused schema fields only', isCorrect: false, orderIndex: 2 },
      { contentText: 'CSS class names', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const IELTS_LISTENING_QUESTIONS = [
  {
    contentText: 'How many sections are in the IELTS Listening test?',
    questionAnswers: [
      { contentText: '3', isCorrect: false, orderIndex: 0 },
      { contentText: '4', isCorrect: true, orderIndex: 1 },
      { contentText: '5', isCorrect: false, orderIndex: 2 },
      { contentText: '6', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What should candidates do before the recording starts?',
    questionAnswers: [
      { contentText: 'Read the questions quickly', isCorrect: true, orderIndex: 0 },
      { contentText: 'Skip to the answer sheet', isCorrect: false, orderIndex: 1 },
      { contentText: 'Close the booklet', isCorrect: false, orderIndex: 2 },
      { contentText: 'Only listen for numbers', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'How long is the IELTS Listening test itself?',
    questionAnswers: [
      { contentText: '30 minutes', isCorrect: true, orderIndex: 0 },
      { contentText: '45 minutes', isCorrect: false, orderIndex: 1 },
      { contentText: '60 minutes', isCorrect: false, orderIndex: 2 },
      { contentText: '75 minutes', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const IELTS_READING_QUESTIONS = [
  {
    contentText: 'How many passages are in IELTS Academic Reading?',
    questionAnswers: [
      { contentText: '2', isCorrect: false, orderIndex: 0 },
      { contentText: '3', isCorrect: true, orderIndex: 1 },
      { contentText: '4', isCorrect: false, orderIndex: 2 },
      { contentText: '5', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the time limit for IELTS Reading?',
    questionAnswers: [
      { contentText: '50 minutes', isCorrect: false, orderIndex: 0 },
      { contentText: '60 minutes', isCorrect: true, orderIndex: 1 },
      { contentText: '70 minutes', isCorrect: false, orderIndex: 2 },
      { contentText: '80 minutes', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which strategy is most useful for long academic passages?',
    questionAnswers: [
      { contentText: 'Skimming for structure before deep reading', isCorrect: true, orderIndex: 0 },
      { contentText: 'Memorizing the title only', isCorrect: false, orderIndex: 1 },
      { contentText: 'Ignoring keywords', isCorrect: false, orderIndex: 2 },
      { contentText: 'Reading the questions last', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const WORKPLACE_EMAIL_QUESTIONS = [
  {
    contentText: 'What should appear clearly in a professional email subject line?',
    questionAnswers: [
      { contentText: 'The main purpose of the email', isCorrect: true, orderIndex: 0 },
      { contentText: 'A random emoji', isCorrect: false, orderIndex: 1 },
      { contentText: 'Only the sender name', isCorrect: false, orderIndex: 2 },
      { contentText: 'A full email signature', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the best tone for a client follow-up email?',
    questionAnswers: [
      { contentText: 'Clear, polite, and concise', isCorrect: true, orderIndex: 0 },
      { contentText: 'Very casual and slang-heavy', isCorrect: false, orderIndex: 1 },
      { contentText: 'Aggressive and demanding', isCorrect: false, orderIndex: 2 },
      { contentText: 'Completely empty', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What should be included when requesting approval on a proposal?',
    questionAnswers: [
      { contentText: 'A clear action requested and deadline', isCorrect: true, orderIndex: 0 },
      { contentText: 'No context at all', isCorrect: false, orderIndex: 1 },
      { contentText: 'Only an attachment name', isCorrect: false, orderIndex: 2 },
      { contentText: 'A handwritten note', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const GRAMMAR_CHECK_QUESTIONS = [
  {
    contentText: 'Which sentence uses the past tense correctly?',
    questionAnswers: [
      { contentText: 'She went to school yesterday.', isCorrect: true, orderIndex: 0 },
      { contentText: 'She go to school yesterday.', isCorrect: false, orderIndex: 1 },
      { contentText: 'She gone to school yesterday.', isCorrect: false, orderIndex: 2 },
      { contentText: 'She going to school yesterday.', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which option is a pronoun?',
    questionAnswers: [
      { contentText: 'beautiful', isCorrect: false, orderIndex: 0 },
      { contentText: 'quickly', isCorrect: false, orderIndex: 1 },
      { contentText: 'they', isCorrect: true, orderIndex: 2 },
      { contentText: 'teacher', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const TOEIC_PRACTICE_QUESTIONS = [
  {
    contentText: 'What should you do first when answering a TOEIC photo question?',
    questionAnswers: [
      { contentText: 'Identify the main action or object', isCorrect: true, orderIndex: 0 },
      { contentText: 'Translate the photo into another language', isCorrect: false, orderIndex: 1 },
      { contentText: 'Guess before listening', isCorrect: false, orderIndex: 2 },
      { contentText: 'Ignore location details completely', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which skill matters most in TOEIC Part 6?',
    questionAnswers: [
      { contentText: 'Understanding sentence context', isCorrect: true, orderIndex: 0 },
      { contentText: 'Writing essays', isCorrect: false, orderIndex: 1 },
      { contentText: 'Speaking for two minutes', isCorrect: false, orderIndex: 2 },
      { contentText: 'Memorizing every dictionary word', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const COURSE_TEMPLATES = [
  {
    key: 'webFoundations',
    title: 'Introduction to Web Development',
    slug: 'introduction-to-web-development',
    description: 'A flagship beginner web-development course built for realistic progress tracking demos.',
    category: 'Communication',
    levelTarget: 'A1',
    levelRequired: 'A0',
    price: 0,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80',
    previewVideoUrl: SAMPLE_VIDEO_URLS[0],
    modules: [
      {
        title: 'Module 1: HTML Foundations',
        description: 'Start with semantic HTML, forms, and structure.',
        orderIndex: 0,
        lessons: [
          {
            title: 'HTML Foundations Overview',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Learn what semantic HTML is, why structure matters, and how to plan pages before styling.',
            resources: [],
            quiz: {
              title: 'HTML Foundations Checkpoint',
              timeLimitMinutes: 12,
              passingScore: 70,
              questions: WEB_FOUNDATIONS_QUESTIONS,
            },
          },
          {
            title: 'Form Building Workshop',
            type: 'video',
            orderIndex: 1,
            mediaUrl: SAMPLE_VIDEO_URLS[0],
            durationSeconds: 540,
            resources: [
              { title: 'Form Checklist', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' },
            ],
          },
          {
            title: 'Semantic Markup Practice',
            type: 'reading',
            orderIndex: 2,
            contentText: 'Practice choosing the right semantic tags for headers, navigation, articles, and footers.',
            resources: [
              { title: 'Semantic Tags Guide', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' },
              { title: 'Accessibility Notes', fileUrl: SAMPLE_DOC_URL, fileType: 'docx' },
            ],
          },
        ],
      },
      {
        title: 'Module 2: CSS and DOM',
        description: 'Move from structure to layout, interaction, and data display.',
        orderIndex: 1,
        lessons: [
          {
            title: 'CSS Layout Studio',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[1],
            durationSeconds: 720,
            resources: [
              { title: 'Flexbox Worksheet', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' },
            ],
            quiz: {
              title: 'CSS Layout Quiz',
              timeLimitMinutes: 15,
              passingScore: 75,
              questions: CSS_LAYOUT_QUESTIONS,
            },
          },
          {
            title: 'DOM Interaction Lab',
            type: 'reading',
            orderIndex: 1,
            contentText: 'Understand how event listeners, selectors, and stateful DOM updates work in small apps.',
            resources: [],
          },
          {
            title: 'API Integration Demo',
            type: 'video',
            orderIndex: 2,
            mediaUrl: SAMPLE_VIDEO_URLS[2],
            durationSeconds: 680,
            resources: [
              { title: 'API Response Cheatsheet', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' },
            ],
          },
        ],
      },
      {
        title: 'Module 3: Project Delivery',
        description: 'Put the pieces together into a small project.',
        orderIndex: 2,
        lessons: [
          {
            title: 'Component Architecture Deep Dive',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Break a medium-size UI into reusable components and map responsibilities cleanly.',
            resources: [
              { title: 'Component Tree Template', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' },
              { title: 'Bonus Walkthrough Video', fileUrl: SAMPLE_VIDEO_URLS[3], fileType: 'video' },
            ],
          },
          {
            title: 'Final Project Review',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Review the full project flow and confirm you can connect UI, services, and progress logic.',
            resources: [],
            quiz: {
              title: 'Capstone Review Quiz',
              timeLimitMinutes: 18,
              passingScore: 80,
              questions: CAPSTONE_QUESTIONS,
            },
          },
        ],
      },
    ],
  },
  {
    key: 'ieltsMastery',
    title: 'Advanced English Course - IELTS Preparation',
    slug: 'advanced-english-ielts-preparation',
    description: 'A premium IELTS pathway covering listening, reading, writing, and speaking.',
    category: 'IELTS',
    levelTarget: 'B2',
    levelRequired: 'A2',
    price: 500000,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80',
    previewVideoUrl: SAMPLE_VIDEO_URLS[1],
    modules: [
      {
        title: 'Module 1: Listening Mastery',
        description: 'Strategies and structured practice for IELTS Listening.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Listening Foundations',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[1],
            durationSeconds: 840,
            resources: [{ title: 'Listening Notes', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Listening Practice Test',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Take a timed listening checkpoint and review the result.',
            resources: [],
            quiz: {
              title: 'IELTS Listening Practice Quiz',
              timeLimitMinutes: 30,
              passingScore: 70,
              questions: IELTS_LISTENING_QUESTIONS,
            },
          },
        ],
      },
      {
        title: 'Module 2: Reading Strategies',
        description: 'Skimming, scanning, and managing time under pressure.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Reading Strategy Workshop',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Learn how to identify structure, distractors, and evidence quickly in academic passages.',
            resources: [{ title: 'Reading Strategy Map', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Reading Practice Test',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Complete a full IELTS Reading checkpoint with a clear passing target.',
            resources: [],
            quiz: {
              title: 'IELTS Reading Comprehension Quiz',
              timeLimitMinutes: 60,
              passingScore: 70,
              questions: IELTS_READING_QUESTIONS,
            },
          },
        ],
      },
      {
        title: 'Module 3: Writing and Feedback',
        description: 'Task 1 and Task 2 planning, structure, and review.',
        orderIndex: 2,
        lessons: [
          {
            title: 'Writing Task Frameworks',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Plan reports, arguments, and examples for both IELTS Writing tasks.',
            resources: [{ title: 'Writing Planner', fileUrl: SAMPLE_DOC_URL, fileType: 'docx' }],
          },
          {
            title: 'Writing Submission',
            type: 'assignment',
            orderIndex: 1,
            contentText: 'Upload a polished writing response for instructor review.',
            resources: [],
            assignment: {
              title: 'IELTS Writing Task Submission',
              instructions: 'Submit one Task 1 and one Task 2 response for review.',
            },
          },
        ],
      },
      {
        title: 'Module 4: Speaking Practice',
        description: 'Confidence and fluency in mock interviews.',
        orderIndex: 3,
        lessons: [
          {
            title: 'Speaking Strategy Session',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[4],
            durationSeconds: 600,
            resources: [{ title: 'Speaking Cue Cards', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
        ],
      },
    ],
  },
  {
    key: 'businessFlagged',
    title: 'Business English Communication',
    slug: 'business-english-communication',
    description: 'Professional English communication skills for the workplace.',
    category: 'Business',
    levelTarget: 'B2',
    levelRequired: 'A2',
    price: 400000,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    previewVideoUrl: SAMPLE_VIDEO_URLS[2],
    modules: [
      {
        title: 'Module 1: Meeting Communication',
        description: 'Lead, summarize, and follow up effectively in business meetings.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Running Better Meetings',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[2],
            durationSeconds: 420,
            resources: [{ title: 'Meeting Agenda Template', fileUrl: SAMPLE_DOC_URL, fileType: 'docx' }],
          },
          {
            title: 'Follow-up Communication',
            type: 'reading',
            orderIndex: 1,
            contentText: 'Write concise summaries and action lists after business meetings.',
            resources: [],
          },
        ],
      },
      {
        title: 'Module 2: Client Communication',
        description: 'Handle status updates and stakeholder messaging professionally.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Client Status Updates',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Communicate blockers, next steps, and delivery confidence to clients.',
            resources: [{ title: 'Status Update Sample', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
        ],
      },
    ],
  },
  {
    key: 'grammarBasics',
    title: 'English Grammar Basics',
    slug: 'english-grammar-basics',
    description: 'Master the fundamentals of English grammar with structured practice.',
    category: 'Grammar',
    levelTarget: 'A0',
    levelRequired: 'A0',
    price: 0,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Core Grammar',
        description: 'Parts of speech and sentence building.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Nouns and Pronouns',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Understand how pronouns replace nouns and keep writing natural.',
            resources: [{ title: 'Grammar Table', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Grammar Checkpoint',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Check your understanding before moving on.',
            resources: [],
            quiz: {
              title: 'Grammar Basics Quiz',
              timeLimitMinutes: 12,
              passingScore: 70,
              questions: GRAMMAR_CHECK_QUESTIONS,
            },
          },
        ],
      },
      {
        title: 'Module 2: Tenses in Use',
        description: 'Use common tenses with confidence.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Simple Present and Past',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Learn when and why to switch between present and past tense.',
            resources: [],
          },
          {
            title: 'Verbs and Tenses',
            type: 'video',
            orderIndex: 1,
            mediaUrl: SAMPLE_VIDEO_URLS[3],
            durationSeconds: 480,
            resources: [{ title: 'Verb Tense Worksheet', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
        ],
      },
    ],
  },
  {
    key: 'toeicArchived',
    title: 'TOEIC Preparation Course',
    slug: 'toeic-preparation-course',
    description: 'A historical TOEIC course retained for archived and expired-enrollment testing.',
    category: 'TOEIC',
    levelTarget: 'B1',
    levelRequired: 'A1',
    price: 300000,
    status: 'archived',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Listening Comprehension',
        description: 'Practice photo and question-response items.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Part 1: Photos',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[4],
            durationSeconds: 510,
            resources: [],
          },
          {
            title: 'Part 2: Question Response',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Assess your listening accuracy under TOEIC-style timing.',
            resources: [],
            quiz: {
              title: 'TOEIC Listening Checkpoint',
              timeLimitMinutes: 20,
              passingScore: 65,
              questions: TOEIC_PRACTICE_QUESTIONS,
            },
          },
        ],
      },
      {
        title: 'Module 2: Reading Focus',
        description: 'Train for sentence completion and short texts.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Part 5: Incomplete Sentences',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Identify grammar and vocabulary patterns quickly in context.',
            resources: [{ title: 'TOEIC Reading Notes', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Part 6: Text Completion',
            type: 'video',
            orderIndex: 1,
            mediaUrl: SAMPLE_VIDEO_URLS[1],
            durationSeconds: 530,
            resources: [],
          },
        ],
      },
    ],
  },
  {
    key: 'conversationConfidence',
    title: 'Conversation Confidence Lab',
    slug: 'conversation-confidence-lab',
    description: 'Improve fluency, confidence, and practical spoken English for daily situations.',
    category: 'Communication',
    levelTarget: 'B1',
    levelRequired: 'A1',
    price: 0,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Everyday Fluency',
        description: 'Build confidence in real-life situations.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Warm-up Phrases',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Learn simple phrases to start conversations naturally.',
            resources: [{ title: 'Phrase List', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Roleplay Practice',
            type: 'video',
            orderIndex: 1,
            mediaUrl: SAMPLE_VIDEO_URLS[0],
            durationSeconds: 360,
            resources: [],
          },
        ],
      },
      {
        title: 'Module 2: Confidence Building',
        description: 'Manage hesitation and keep conversations moving.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Handling Follow-up Questions',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Use follow-up questions to keep discussions active.',
            resources: [],
          },
        ],
      },
    ],
  },
  {
    key: 'kidsStarter',
    title: 'Kids English Starter',
    slug: 'kids-english-starter',
    description: 'An in-progress kids course kept private for instructor editing and review.',
    category: 'Kids',
    levelTarget: 'A0',
    levelRequired: 'A0',
    price: 0,
    status: 'in_progress',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Colors and Animals',
        description: 'Foundational vocabulary for young learners.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Colors Around Us',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Introduce basic colors with simple examples and repetition.',
            resources: [{ title: 'Color Flashcards', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Animal Sounds',
            type: 'audio',
            orderIndex: 1,
            mediaUrl: SAMPLE_VIDEO_URLS[2],
            durationSeconds: 240,
            resources: [],
          },
        ],
      },
    ],
  },
  {
    key: 'workplaceEmail',
    title: 'Workplace Email Essentials',
    slug: 'workplace-email-essentials',
    description: 'A practical paid course for writing clear and effective workplace emails.',
    category: 'Business',
    levelTarget: 'B1',
    levelRequired: 'A1',
    price: 250000,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Clear Professional Emails',
        description: 'Structure effective updates, requests, and approvals.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Email Structure Fundamentals',
            type: 'reading',
            orderIndex: 0,
            contentText: 'Learn how subject lines, openings, body structure, and closing requests work together.',
            resources: [{ title: 'Email Template Pack', fileUrl: SAMPLE_DOC_URL, fileType: 'docx' }],
          },
          {
            title: 'Approval Request Practice',
            type: 'quiz',
            orderIndex: 1,
            contentText: 'Check whether you can choose the clearest subject lines and action requests.',
            resources: [],
            quiz: {
              title: 'Workplace Email Quiz',
              timeLimitMinutes: 15,
              passingScore: 70,
              questions: WORKPLACE_EMAIL_QUESTIONS,
            },
          },
        ],
      },
      {
        title: 'Module 2: Client Follow-up',
        description: 'Write concise, confident, and polite client communication.',
        orderIndex: 1,
        lessons: [
          {
            title: 'Following Up with Clients',
            type: 'video',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[4],
            durationSeconds: 450,
            resources: [{ title: 'Follow-up Examples', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
        ],
      },
    ],
  },
  {
    key: 'pronunciationClinic',
    title: 'Pronunciation Clinic',
    slug: 'pronunciation-clinic',
    description: 'Short speaking-focused drills for learners who want cleaner pronunciation.',
    category: 'Communication',
    levelTarget: 'B1',
    levelRequired: 'A2',
    price: 0,
    status: 'published',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
    modules: [
      {
        title: 'Module 1: Sound Awareness',
        description: 'Hear the difference between similar sounds.',
        orderIndex: 0,
        lessons: [
          {
            title: 'Minimal Pairs Practice',
            type: 'audio',
            orderIndex: 0,
            mediaUrl: SAMPLE_VIDEO_URLS[0],
            durationSeconds: 300,
            resources: [{ title: 'Minimal Pairs Sheet', fileUrl: SAMPLE_PDF_URL, fileType: 'pdf' }],
          },
          {
            title: 'Sentence Stress',
            type: 'reading',
            orderIndex: 1,
            contentText: 'Mark stressed words and compare the rhythm of natural speech.',
            resources: [],
          },
        ],
      },
    ],
  },
];

const ROLE_DESCRIPTIONS = {
  admin: 'Platform administrator',
  instructor: 'Course instructor',
  student: 'Platform student',
};

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function lessonKey(moduleTitle, lessonTitle) {
  return `${moduleTitle}::${lessonTitle}`;
}

function resourceKey(moduleTitle, lessonTitle, resourceTitle) {
  return `${lessonKey(moduleTitle, lessonTitle)}::${resourceTitle}`;
}

async function createRole(roleName) {
  return prisma.role.upsert({
    where: { roleName },
    update: { description: ROLE_DESCRIPTIONS[roleName] },
    create: {
      roleName,
      description: ROLE_DESCRIPTIONS[roleName],
    },
  });
}

async function createUserWithRole({ email, fullName, currentLevel, roleId, phoneNumber, avatarUrl }) {
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await bcrypt.hash('password123', 10),
      currentLevel,
      phoneNumber: phoneNumber || null,
      avatarUrl: avatarUrl || null,
      isEmailVerified: true,
      userRoles: {
        create: {
          roleId,
        },
      },
    },
  });

  return user;
}

async function createInstructorProfile(user, profile) {
  await prisma.instructorProfile.create({
    data: {
      userId: user.userId,
      bio: profile.bio,
      expertise: profile.expertise,
      experienceYears: profile.experienceYears,
      workEmail: profile.workEmail,
      workPhone: profile.workPhone,
      bankAccountInfo: profile.bankAccountInfo,
    },
  });

  await prisma.instructorWallet.create({
    data: {
      instructorId: user.userId,
      balance: 0,
      totalEarnings: 0,
    },
  });
}

async function createQuizWithQuestions(lessonId, title, timeLimitMinutes, passingScore, questions) {
  return prisma.quiz.create({
    data: {
      lessonId,
      title,
      timeLimitMinutes,
      passingScore,
      questions: {
        create: questions.map((question, questionIndex) => ({
          contentText: question.contentText,
          type: question.type || 'single_choice',
          orderIndex: questionIndex,
          questionAnswers: {
            create: question.questionAnswers,
          },
        })),
      },
    },
    include: {
      questions: {
        include: {
          questionAnswers: true,
        },
      },
    },
  });
}

async function createCourseFromTemplate(template, instructorId) {
  const course = await prisma.course.create({
    data: {
      title: template.title,
      slug: template.slug || slugify(template.title),
      description: template.description,
      category: template.category,
      levelTarget: template.levelTarget,
      levelRequired: template.levelRequired || 'A0',
      price: template.price,
      status: template.status,
      instructorId,
      thumbnailUrl: template.thumbnailUrl || null,
      previewVideoUrl: template.previewVideoUrl || null,
      contentFlagged: template.contentFlagged || false,
      contentFlaggedAt: template.contentFlaggedAt || null,
      contentFlaggedBy: template.contentFlaggedBy || null,
      contentFlaggedReason: template.contentFlaggedReason || null,
      modules: {
        create: template.modules.map((module) => ({
          title: module.title,
          description: module.description,
          orderIndex: module.orderIndex,
          lessons: {
            create: module.lessons.map((lesson) => ({
              title: lesson.title,
              type: lesson.type,
              orderIndex: lesson.orderIndex,
              mediaUrl: lesson.mediaUrl || null,
              subtitleUrl: lesson.subtitleUrl || null,
              contentText: lesson.contentText || null,
              durationSeconds: lesson.durationSeconds || 0,
              isPreview: lesson.isPreview || false,
              lessonResources: lesson.resources?.length
                ? {
                    create: lesson.resources.map((resource) => ({
                      title: resource.title,
                      fileUrl: resource.fileUrl,
                      fileType: resource.fileType,
                    })),
                  }
                : undefined,
            })),
          },
        })),
      },
    },
  });

  const courseWithLessons = await prisma.course.findUnique({
    where: { courseId: course.courseId },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessonResources: true,
            },
          },
        },
      },
    },
  });

  const lessonMap = new Map();
  const resourceMap = new Map();
  courseWithLessons.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      lessonMap.set(lessonKey(module.title, lesson.title), lesson);
      lesson.lessonResources.forEach((resource) => {
        resourceMap.set(resourceKey(module.title, lesson.title, resource.title || `resource-${resource.resourceId}`), resource);
      });
    });
  });

  for (const moduleTemplate of template.modules) {
    for (const lessonTemplate of moduleTemplate.lessons) {
      const storedLesson = lessonMap.get(lessonKey(moduleTemplate.title, lessonTemplate.title));

      if (lessonTemplate.quiz) {
        await createQuizWithQuestions(
          storedLesson.lessonId,
          lessonTemplate.quiz.title,
          lessonTemplate.quiz.timeLimitMinutes,
          lessonTemplate.quiz.passingScore,
          lessonTemplate.quiz.questions
        );
      }

      if (lessonTemplate.assignment) {
        await prisma.assignment.create({
          data: {
            lessonId: storedLesson.lessonId,
            title: lessonTemplate.assignment.title,
            instructions: lessonTemplate.assignment.instructions,
          },
        });
      }
    }
  }

  return loadCourseBundle(course.courseId, lessonMap, resourceMap);
}

async function loadCourseBundle(courseId, initialLessonMap = null, initialResourceMap = null) {
  const course = await prisma.course.findUnique({
    where: { courseId },
    include: {
      instructor: true,
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessonResources: true,
              quizzes: {
                include: {
                  questions: {
                    include: {
                      questionAnswers: true,
                    },
                    orderBy: { orderIndex: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const lessonMap = initialLessonMap || new Map();
  const resourceMap = initialResourceMap || new Map();
  const quizMap = new Map();

  course.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      lessonMap.set(lessonKey(module.title, lesson.title), lesson);
      lesson.lessonResources.forEach((resource) => {
        resourceMap.set(resourceKey(module.title, lesson.title, resource.title || `resource-${resource.resourceId}`), resource);
      });
      lesson.quizzes.forEach((quiz) => {
        quizMap.set(lessonKey(module.title, lesson.title), quiz);
      });
    });
  });

  return { course, lessonMap, resourceMap, quizMap };
}

function getLesson(bundle, moduleTitle, lessonTitle) {
  return bundle.lessonMap.get(lessonKey(moduleTitle, lessonTitle));
}

function getResource(bundle, moduleTitle, lessonTitle, title) {
  return bundle.resourceMap.get(resourceKey(moduleTitle, lessonTitle, title));
}

function getQuiz(bundle, moduleTitle, lessonTitle) {
  return bundle.quizMap.get(lessonKey(moduleTitle, lessonTitle));
}

async function createEnrollment({ userId, courseId, orderId = null, status = 'active', enrolledAt = new Date(), expiryDate = null }) {
  return prisma.enrollment.create({
    data: {
      userId,
      courseId,
      orderId,
      status,
      enrolledAt,
      expiryDate,
    },
  });
}

async function createOrder({ userId, items, paymentMethod = 'vnpay', status = 'completed', couponId = null, createdAt = new Date() }) {
  const totalAmount = items.reduce((sum, item) => sum + Number(item.price), 0);
  return prisma.order.create({
    data: {
      userId,
      couponId,
      totalAmount,
      status,
      paymentMethod,
      createdAt,
      orderDetails: {
        create: items.map((item) => ({
          courseId: item.courseId,
          price: item.price,
        })),
      },
      transaction: {
        create: {
          amount: totalAmount,
          platformFee: Math.round(totalAmount * 0.2 * 100) / 100,
          status: status === 'completed' ? 'success' : 'pending',
          transactionRef: `TX-${userId}-${createdAt.getTime()}`,
          vnpayTxnRef: `VNP-${userId}-${createdAt.getTime()}`,
          vnpayOrderId: `ORD-${userId}-${createdAt.getTime()}`,
          vnpayResponseCode: status === 'completed' ? '00' : '01',
          vnpayMessage: status === 'completed' ? 'Payment successful' : 'Pending payment',
          paidAt: status === 'completed' ? createdAt : null,
          createdAt,
        },
      },
    },
    include: {
      orderDetails: true,
      transaction: true,
    },
  });
}

async function createCart(userId, courseId, createdAt = new Date()) {
  return prisma.cart.create({
    data: {
      userId,
      courseId,
      createdAt,
    },
  });
}

async function createReview({ courseId, userId, rating, comment, createdAt = new Date() }) {
  return prisma.courseReview.create({
    data: {
      courseId,
      userId,
      rating,
      comment,
      createdAt,
    },
  });
}

async function markContentViewed(enrollmentId, lessonId, viewedAt) {
  return prisma.learningProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId,
        lessonId,
      },
    },
    update: {
      status: 'in_progress',
      contentViewedAt: viewedAt,
    },
    create: {
      enrollmentId,
      lessonId,
      status: 'in_progress',
      contentViewedAt: viewedAt,
    },
  });
}

async function completePrimaryVideo(enrollmentId, lesson, completedAt) {
  return prisma.learningProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId,
        lessonId: lesson.lessonId,
      },
    },
    update: {
      status: 'in_progress',
      lastWatchedSecond: lesson.durationSeconds || 0,
      videoCompletedAt: completedAt,
    },
    create: {
      enrollmentId,
      lessonId: lesson.lessonId,
      status: 'in_progress',
      lastWatchedSecond: lesson.durationSeconds || 0,
      videoCompletedAt: completedAt,
    },
  });
}

async function completeResource(enrollmentId, resourceId, completedAt) {
  return prisma.lessonResourceProgress.upsert({
    where: {
      enrollmentId_resourceId: {
        enrollmentId,
        resourceId,
      },
    },
    update: {
      status: 'completed',
      viewedAt: completedAt,
      completedAt,
    },
    create: {
      enrollmentId,
      resourceId,
      status: 'completed',
      viewedAt: completedAt,
      completedAt,
    },
  });
}

async function markResourceStarted(enrollmentId, resourceId, startedAt) {
  return prisma.lessonResourceProgress.upsert({
    where: {
      enrollmentId_resourceId: {
        enrollmentId,
        resourceId,
      },
    },
    update: {
      status: 'in_progress',
      viewedAt: startedAt,
      completedAt: null,
    },
    create: {
      enrollmentId,
      resourceId,
      status: 'in_progress',
      viewedAt: startedAt,
      completedAt: null,
    },
  });
}

async function createQuizAttemptFromMode(enrollmentId, quiz, mode, completedAt) {
  const questions = quiz.questions || [];
  const passMode = mode === 'pass';
  const halfCorrectThreshold = Math.max(1, Math.floor(questions.length / 2));

  const answers = questions.map((question, index) => {
    const correctAnswer = question.questionAnswers.find((answer) => answer.isCorrect);
    const incorrectAnswer = question.questionAnswers.find((answer) => !answer.isCorrect) || correctAnswer;
    const shouldBeCorrect = passMode ? true : index < halfCorrectThreshold - 1;
    const chosen = shouldBeCorrect ? correctAnswer : incorrectAnswer;

    return {
      questionId: question.questionId,
      selectedAnswerId: chosen.answerId,
      isCorrect: chosen.isCorrect,
    };
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const totalScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return prisma.quizAttempt.create({
    data: {
      quizId: quiz.quizId,
      enrollmentId,
      totalScore,
      startedAt: completedAt,
      completedAt,
      quizAttemptAnswers: {
        create: answers,
      },
    },
  });
}

async function buildEnrollmentSnapshot(enrollmentId, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { enrollmentId },
  });
  const course = await prisma.course.findUnique({
    where: { courseId },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessonResources: true,
              quizzes: {
                select: { quizId: true, title: true, passingScore: true },
              },
            },
          },
        },
      },
    },
  });

  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId));
  const resourceIds = course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.lessonResources.map((resource) => resource.resourceId))
  );
  const quizIds = course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.quizzes.map((quiz) => quiz.quizId))
  );

  const [learningProgressRecords, resourceProgressRecords, quizAttempts] = await Promise.all([
    prisma.learningProgress.findMany({
      where: {
        enrollmentId,
        lessonId: { in: lessonIds.length > 0 ? lessonIds : [-1] },
      },
    }),
    prisma.lessonResourceProgress.findMany({
      where: {
        enrollmentId,
        resourceId: { in: resourceIds.length > 0 ? resourceIds : [-1] },
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        enrollmentId,
        quizId: { in: quizIds.length > 0 ? quizIds : [-1] },
      },
    }),
  ]);

  return {
    enrollment,
    snapshot: buildEnrollmentProgressSnapshot({
      enrollment,
      course,
      learningProgressRecords,
      resourceProgressRecords,
      quizAttempts,
    }),
    learningProgressRecords,
  };
}

async function finalizeEnrollmentProgress(enrollmentId, courseId, enrollmentStatus = null) {
  const { snapshot, learningProgressRecords } = await buildEnrollmentSnapshot(enrollmentId, courseId);
  const existingMap = new Map(learningProgressRecords.map((record) => [record.lessonId, record]));

  for (const module of snapshot.modules) {
    for (const lesson of module.lessons) {
      const existing = existingMap.get(lesson.lessonId);
      const hasSignals =
        !!existing ||
        !!lesson.contentViewedAt ||
        !!lesson.videoCompletedAt ||
        Number(lesson.lastWatchedSecond || 0) > 0 ||
        lesson.status !== 'not_started' ||
        lesson.resources.some((resource) => resource.status !== 'not_started') ||
        (lesson.quiz && lesson.quiz.attemptsCount > 0);

      if (!hasSignals) {
        continue;
      }

      await prisma.learningProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId,
            lessonId: lesson.lessonId,
          },
        },
        update: {
          status: lesson.status,
          lastWatchedSecond: lesson.lastWatchedSecond || 0,
          contentViewedAt: lesson.contentViewedAt,
          videoCompletedAt: lesson.videoCompletedAt,
          completedAt: lesson.status === 'completed' ? lesson.completedAt || new Date() : null,
        },
        create: {
          enrollmentId,
          lessonId: lesson.lessonId,
          status: lesson.status,
          lastWatchedSecond: lesson.lastWatchedSecond || 0,
          contentViewedAt: lesson.contentViewedAt,
          videoCompletedAt: lesson.videoCompletedAt,
          completedAt: lesson.status === 'completed' ? lesson.completedAt || new Date() : null,
        },
      });
    }
  }

  await prisma.enrollment.update({
    where: { enrollmentId },
    data: {
      progressPercent: snapshot.percentage,
      ...(enrollmentStatus ? { status: enrollmentStatus } : {}),
    },
  });

  return snapshot;
}

async function seedWebFoundationsScenarios(bundle, enrollmentsByKey) {
  const l1 = getLesson(bundle, 'Module 1: HTML Foundations', 'HTML Foundations Overview');
  const l2 = getLesson(bundle, 'Module 1: HTML Foundations', 'Form Building Workshop');
  const l3 = getLesson(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice');
  const l4 = getLesson(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio');
  const l5 = getLesson(bundle, 'Module 2: CSS and DOM', 'DOM Interaction Lab');
  const l6 = getLesson(bundle, 'Module 2: CSS and DOM', 'API Integration Demo');
  const l7 = getLesson(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive');
  const l8 = getLesson(bundle, 'Module 3: Project Delivery', 'Final Project Review');

  const formChecklist = getResource(bundle, 'Module 1: HTML Foundations', 'Form Building Workshop', 'Form Checklist');
  const semanticGuide = getResource(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice', 'Semantic Tags Guide');
  const accessibilityNotes = getResource(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice', 'Accessibility Notes');
  const flexboxWorksheet = getResource(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio', 'Flexbox Worksheet');
  const apiCheatsheet = getResource(bundle, 'Module 2: CSS and DOM', 'API Integration Demo', 'API Response Cheatsheet');
  const componentTree = getResource(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive', 'Component Tree Template');
  const bonusVideo = getResource(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive', 'Bonus Walkthrough Video');

  const htmlQuiz = getQuiz(bundle, 'Module 1: HTML Foundations', 'HTML Foundations Overview');
  const cssQuiz = getQuiz(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio');
  const capstoneQuiz = getQuiz(bundle, 'Module 3: Project Delivery', 'Final Project Review');

  const student2 = enrollmentsByKey.startedOnly;
  await markContentViewed(student2.enrollmentId, l1.lessonId, daysAgo(7));
  await finalizeEnrollmentProgress(student2.enrollmentId, bundle.course.courseId);

  const student3 = enrollmentsByKey.completedFirstLesson;
  await markContentViewed(student3.enrollmentId, l1.lessonId, daysAgo(12));
  await createQuizAttemptFromMode(student3.enrollmentId, htmlQuiz, 'pass', daysAgo(11));
  await finalizeEnrollmentProgress(student3.enrollmentId, bundle.course.courseId);

  const student4 = enrollmentsByKey.moduleTwoPartial;
  await markContentViewed(student4.enrollmentId, l1.lessonId, daysAgo(30));
  await createQuizAttemptFromMode(student4.enrollmentId, htmlQuiz, 'pass', daysAgo(29));
  await completePrimaryVideo(student4.enrollmentId, l2, daysAgo(28));
  await completeResource(student4.enrollmentId, formChecklist.resourceId, daysAgo(28));
  await markContentViewed(student4.enrollmentId, l3.lessonId, daysAgo(26));
  await completeResource(student4.enrollmentId, semanticGuide.resourceId, daysAgo(26));
  await completeResource(student4.enrollmentId, accessibilityNotes.resourceId, daysAgo(26));
  await completePrimaryVideo(student4.enrollmentId, l4, daysAgo(24));
  await completeResource(student4.enrollmentId, flexboxWorksheet.resourceId, daysAgo(24));
  await createQuizAttemptFromMode(student4.enrollmentId, cssQuiz, 'fail', daysAgo(24));
  await finalizeEnrollmentProgress(student4.enrollmentId, bundle.course.courseId);

  const student5 = enrollmentsByKey.nearlyFinished;
  await markContentViewed(student5.enrollmentId, l1.lessonId, daysAgo(18));
  await createQuizAttemptFromMode(student5.enrollmentId, htmlQuiz, 'pass', daysAgo(18));
  await completePrimaryVideo(student5.enrollmentId, l2, daysAgo(17));
  await completeResource(student5.enrollmentId, formChecklist.resourceId, daysAgo(17));
  await markContentViewed(student5.enrollmentId, l3.lessonId, daysAgo(16));
  await completeResource(student5.enrollmentId, semanticGuide.resourceId, daysAgo(16));
  await completeResource(student5.enrollmentId, accessibilityNotes.resourceId, daysAgo(16));
  await completePrimaryVideo(student5.enrollmentId, l4, daysAgo(15));
  await completeResource(student5.enrollmentId, flexboxWorksheet.resourceId, daysAgo(15));
  await createQuizAttemptFromMode(student5.enrollmentId, cssQuiz, 'pass', daysAgo(15));
  await markContentViewed(student5.enrollmentId, l5.lessonId, daysAgo(13));
  await completePrimaryVideo(student5.enrollmentId, l6, daysAgo(12));
  await completeResource(student5.enrollmentId, apiCheatsheet.resourceId, daysAgo(12));
  await markContentViewed(student5.enrollmentId, l7.lessonId, daysAgo(9));
  await completeResource(student5.enrollmentId, componentTree.resourceId, daysAgo(9));
  await markResourceStarted(student5.enrollmentId, bonusVideo.resourceId, daysAgo(9));
  await finalizeEnrollmentProgress(student5.enrollmentId, bundle.course.courseId);

  const student6 = enrollmentsByKey.completedCourse;
  await markContentViewed(student6.enrollmentId, l1.lessonId, daysAgo(40));
  await createQuizAttemptFromMode(student6.enrollmentId, htmlQuiz, 'pass', daysAgo(39));
  await completePrimaryVideo(student6.enrollmentId, l2, daysAgo(38));
  await completeResource(student6.enrollmentId, formChecklist.resourceId, daysAgo(38));
  await markContentViewed(student6.enrollmentId, l3.lessonId, daysAgo(36));
  await completeResource(student6.enrollmentId, semanticGuide.resourceId, daysAgo(36));
  await completeResource(student6.enrollmentId, accessibilityNotes.resourceId, daysAgo(36));
  await completePrimaryVideo(student6.enrollmentId, l4, daysAgo(34));
  await completeResource(student6.enrollmentId, flexboxWorksheet.resourceId, daysAgo(34));
  await createQuizAttemptFromMode(student6.enrollmentId, cssQuiz, 'pass', daysAgo(34));
  await markContentViewed(student6.enrollmentId, l5.lessonId, daysAgo(32));
  await completePrimaryVideo(student6.enrollmentId, l6, daysAgo(30));
  await completeResource(student6.enrollmentId, apiCheatsheet.resourceId, daysAgo(30));
  await markContentViewed(student6.enrollmentId, l7.lessonId, daysAgo(28));
  await completeResource(student6.enrollmentId, componentTree.resourceId, daysAgo(28));
  await completeResource(student6.enrollmentId, bonusVideo.resourceId, daysAgo(28));
  await markContentViewed(student6.enrollmentId, l8.lessonId, daysAgo(26));
  await createQuizAttemptFromMode(student6.enrollmentId, capstoneQuiz, 'pass', daysAgo(26));
  await finalizeEnrollmentProgress(student6.enrollmentId, bundle.course.courseId, 'completed');

  const student7 = enrollmentsByKey.videoOnly;
  await completePrimaryVideo(student7.enrollmentId, l2, daysAgo(10));
  await finalizeEnrollmentProgress(student7.enrollmentId, bundle.course.courseId);

  const student8 = enrollmentsByKey.capstoneWaiting;
  await markContentViewed(student8.enrollmentId, l1.lessonId, daysAgo(21));
  await createQuizAttemptFromMode(student8.enrollmentId, htmlQuiz, 'pass', daysAgo(20));
  await completePrimaryVideo(student8.enrollmentId, l2, daysAgo(19));
  await completeResource(student8.enrollmentId, formChecklist.resourceId, daysAgo(19));
  await markContentViewed(student8.enrollmentId, l3.lessonId, daysAgo(18));
  await completeResource(student8.enrollmentId, semanticGuide.resourceId, daysAgo(18));
  await completeResource(student8.enrollmentId, accessibilityNotes.resourceId, daysAgo(18));
  await completePrimaryVideo(student8.enrollmentId, l4, daysAgo(16));
  await completeResource(student8.enrollmentId, flexboxWorksheet.resourceId, daysAgo(16));
  await createQuizAttemptFromMode(student8.enrollmentId, cssQuiz, 'pass', daysAgo(16));
  await markContentViewed(student8.enrollmentId, l5.lessonId, daysAgo(14));
  await completePrimaryVideo(student8.enrollmentId, l6, daysAgo(13));
  await completeResource(student8.enrollmentId, apiCheatsheet.resourceId, daysAgo(13));
  await markContentViewed(student8.enrollmentId, l7.lessonId, daysAgo(12));
  await completeResource(student8.enrollmentId, componentTree.resourceId, daysAgo(12));
  await completeResource(student8.enrollmentId, bonusVideo.resourceId, daysAgo(12));
  await markContentViewed(student8.enrollmentId, l8.lessonId, daysAgo(11));
  await finalizeEnrollmentProgress(student8.enrollmentId, bundle.course.courseId);
}

async function seedPaidCourseProgress(bundle, enrollmentsByKey) {
  const listeningLesson = getLesson(bundle, 'Module 1: Listening Mastery', 'Listening Foundations');
  const listeningNotes = getResource(bundle, 'Module 1: Listening Mastery', 'Listening Foundations', 'Listening Notes');
  const listeningQuizLesson = getLesson(bundle, 'Module 1: Listening Mastery', 'Listening Practice Test');
  const listeningQuiz = getQuiz(bundle, 'Module 1: Listening Mastery', 'Listening Practice Test');
  const readingLesson = getLesson(bundle, 'Module 2: Reading Strategies', 'Reading Strategy Workshop');
  const readingMap = getResource(bundle, 'Module 2: Reading Strategies', 'Reading Strategy Workshop', 'Reading Strategy Map');
  const readingQuizLesson = getLesson(bundle, 'Module 2: Reading Strategies', 'Reading Practice Test');
  const readingQuiz = getQuiz(bundle, 'Module 2: Reading Strategies', 'Reading Practice Test');
  const writingLesson = getLesson(bundle, 'Module 3: Writing and Feedback', 'Writing Task Frameworks');
  const writingPlanner = getResource(bundle, 'Module 3: Writing and Feedback', 'Writing Task Frameworks', 'Writing Planner');
  const writingSubmissionLesson = getLesson(bundle, 'Module 3: Writing and Feedback', 'Writing Submission');
  const speakingLesson = getLesson(bundle, 'Module 4: Speaking Practice', 'Speaking Strategy Session');
  const speakingCards = getResource(bundle, 'Module 4: Speaking Practice', 'Speaking Strategy Session', 'Speaking Cue Cards');

  const activeLearner = enrollmentsByKey.activeLearner;
  await completePrimaryVideo(activeLearner.enrollmentId, listeningLesson, daysAgo(14));
  await completeResource(activeLearner.enrollmentId, listeningNotes.resourceId, daysAgo(14));
  await markContentViewed(activeLearner.enrollmentId, listeningQuizLesson.lessonId, daysAgo(13));
  await createQuizAttemptFromMode(activeLearner.enrollmentId, listeningQuiz, 'pass', daysAgo(13));
  await markContentViewed(activeLearner.enrollmentId, readingLesson.lessonId, daysAgo(10));
  await completeResource(activeLearner.enrollmentId, readingMap.resourceId, daysAgo(10));
  await markContentViewed(activeLearner.enrollmentId, readingQuizLesson.lessonId, daysAgo(9));
  await createQuizAttemptFromMode(activeLearner.enrollmentId, readingQuiz, 'fail', daysAgo(9));
  await finalizeEnrollmentProgress(activeLearner.enrollmentId, bundle.course.courseId);

  const finisher = enrollmentsByKey.finishedLearner;
  await completePrimaryVideo(finisher.enrollmentId, listeningLesson, daysAgo(45));
  await completeResource(finisher.enrollmentId, listeningNotes.resourceId, daysAgo(45));
  await markContentViewed(finisher.enrollmentId, listeningQuizLesson.lessonId, daysAgo(44));
  await createQuizAttemptFromMode(finisher.enrollmentId, listeningQuiz, 'pass', daysAgo(44));
  await markContentViewed(finisher.enrollmentId, readingLesson.lessonId, daysAgo(43));
  await completeResource(finisher.enrollmentId, readingMap.resourceId, daysAgo(43));
  await markContentViewed(finisher.enrollmentId, readingQuizLesson.lessonId, daysAgo(42));
  await createQuizAttemptFromMode(finisher.enrollmentId, readingQuiz, 'pass', daysAgo(42));
  await markContentViewed(finisher.enrollmentId, writingLesson.lessonId, daysAgo(41));
  await completeResource(finisher.enrollmentId, writingPlanner.resourceId, daysAgo(41));
  await markContentViewed(finisher.enrollmentId, writingSubmissionLesson.lessonId, daysAgo(40));
  await completePrimaryVideo(finisher.enrollmentId, speakingLesson, daysAgo(39));
  await completeResource(finisher.enrollmentId, speakingCards.resourceId, daysAgo(39));
  await finalizeEnrollmentProgress(finisher.enrollmentId, bundle.course.courseId, 'completed');
}

async function seedToeicArchivedScenarios(bundle, enrollmentsByKey) {
  const photoLesson = getLesson(bundle, 'Module 1: Listening Comprehension', 'Part 1: Photos');
  const listeningQuiz = getQuiz(bundle, 'Module 1: Listening Comprehension', 'Part 2: Question Response');
  const readingLesson = getLesson(bundle, 'Module 2: Reading Focus', 'Part 5: Incomplete Sentences');
  const readingNotes = getResource(bundle, 'Module 2: Reading Focus', 'Part 5: Incomplete Sentences', 'TOEIC Reading Notes');
  const completionVideo = getLesson(bundle, 'Module 2: Reading Focus', 'Part 6: Text Completion');

  const finisher = enrollmentsByKey.finishedLearner;
  await completePrimaryVideo(finisher.enrollmentId, photoLesson, daysAgo(110));
  await markContentViewed(finisher.enrollmentId, getLesson(bundle, 'Module 1: Listening Comprehension', 'Part 2: Question Response').lessonId, daysAgo(109));
  await createQuizAttemptFromMode(finisher.enrollmentId, listeningQuiz, 'pass', daysAgo(109));
  await markContentViewed(finisher.enrollmentId, readingLesson.lessonId, daysAgo(108));
  await completeResource(finisher.enrollmentId, readingNotes.resourceId, daysAgo(108));
  await completePrimaryVideo(finisher.enrollmentId, completionVideo, daysAgo(107));
  await finalizeEnrollmentProgress(finisher.enrollmentId, bundle.course.courseId, 'completed');

  const expiredLearner = enrollmentsByKey.expiredLearner;
  await completePrimaryVideo(expiredLearner.enrollmentId, photoLesson, daysAgo(150));
  await markContentViewed(expiredLearner.enrollmentId, readingLesson.lessonId, daysAgo(149));
  await finalizeEnrollmentProgress(expiredLearner.enrollmentId, bundle.course.courseId, 'expired');
}

async function seedGrammarBasicsScenarios(bundle, enrollmentsByKey) {
  const nounsLesson = getLesson(bundle, 'Module 1: Core Grammar', 'Nouns and Pronouns');
  const grammarTable = getResource(bundle, 'Module 1: Core Grammar', 'Nouns and Pronouns', 'Grammar Table');
  const checkpointLesson = getLesson(bundle, 'Module 1: Core Grammar', 'Grammar Checkpoint');
  const checkpointQuiz = getQuiz(bundle, 'Module 1: Core Grammar', 'Grammar Checkpoint');
  const tensesLesson = getLesson(bundle, 'Module 2: Tenses in Use', 'Simple Present and Past');
  const verbsLesson = getLesson(bundle, 'Module 2: Tenses in Use', 'Verbs and Tenses');
  const tenseWorksheet = getResource(bundle, 'Module 2: Tenses in Use', 'Verbs and Tenses', 'Verb Tense Worksheet');

  const activeLearner = enrollmentsByKey.activeLearner;
  await markContentViewed(activeLearner.enrollmentId, nounsLesson.lessonId, daysAgo(10));
  await completeResource(activeLearner.enrollmentId, grammarTable.resourceId, daysAgo(10));
  await finalizeEnrollmentProgress(activeLearner.enrollmentId, bundle.course.courseId);

  const finishedLearner = enrollmentsByKey.finishedLearner;
  await markContentViewed(finishedLearner.enrollmentId, nounsLesson.lessonId, daysAgo(30));
  await completeResource(finishedLearner.enrollmentId, grammarTable.resourceId, daysAgo(30));
  await markContentViewed(finishedLearner.enrollmentId, checkpointLesson.lessonId, daysAgo(29));
  await createQuizAttemptFromMode(finishedLearner.enrollmentId, checkpointQuiz, 'pass', daysAgo(29));
  await markContentViewed(finishedLearner.enrollmentId, tensesLesson.lessonId, daysAgo(28));
  await completePrimaryVideo(finishedLearner.enrollmentId, verbsLesson, daysAgo(27));
  await completeResource(finishedLearner.enrollmentId, tenseWorksheet.resourceId, daysAgo(27));
  await finalizeEnrollmentProgress(finishedLearner.enrollmentId, bundle.course.courseId, 'completed');
}

async function seedWorkplaceEmailScenarios(bundle, enrollmentsByKey) {
  const structureLesson = getLesson(bundle, 'Module 1: Clear Professional Emails', 'Email Structure Fundamentals');
  const emailTemplates = getResource(bundle, 'Module 1: Clear Professional Emails', 'Email Structure Fundamentals', 'Email Template Pack');
  const quizLesson = getLesson(bundle, 'Module 1: Clear Professional Emails', 'Approval Request Practice');
  const workplaceQuiz = getQuiz(bundle, 'Module 1: Clear Professional Emails', 'Approval Request Practice');
  const followUpLesson = getLesson(bundle, 'Module 2: Client Follow-up', 'Following Up with Clients');
  const followUpExamples = getResource(bundle, 'Module 2: Client Follow-up', 'Following Up with Clients', 'Follow-up Examples');

  const activeLearner = enrollmentsByKey.activeLearner;
  await markContentViewed(activeLearner.enrollmentId, structureLesson.lessonId, daysAgo(8));
  await completeResource(activeLearner.enrollmentId, emailTemplates.resourceId, daysAgo(8));
  await markContentViewed(activeLearner.enrollmentId, quizLesson.lessonId, daysAgo(7));
  await createQuizAttemptFromMode(activeLearner.enrollmentId, workplaceQuiz, 'pass', daysAgo(7));
  await finalizeEnrollmentProgress(activeLearner.enrollmentId, bundle.course.courseId);

  const finishedLearner = enrollmentsByKey.finishedLearner;
  await markContentViewed(finishedLearner.enrollmentId, structureLesson.lessonId, daysAgo(16));
  await completeResource(finishedLearner.enrollmentId, emailTemplates.resourceId, daysAgo(16));
  await markContentViewed(finishedLearner.enrollmentId, quizLesson.lessonId, daysAgo(15));
  await createQuizAttemptFromMode(finishedLearner.enrollmentId, workplaceQuiz, 'pass', daysAgo(15));
  await completePrimaryVideo(finishedLearner.enrollmentId, followUpLesson, daysAgo(14));
  await completeResource(finishedLearner.enrollmentId, followUpExamples.resourceId, daysAgo(14));
  await finalizeEnrollmentProgress(finishedLearner.enrollmentId, bundle.course.courseId, 'completed');

  const activeLearnerTwo = enrollmentsByKey.activeLearnerTwo;
  if (activeLearnerTwo) {
    await markContentViewed(activeLearnerTwo.enrollmentId, structureLesson.lessonId, daysAgo(6));
    await completeResource(activeLearnerTwo.enrollmentId, emailTemplates.resourceId, daysAgo(6));
    await finalizeEnrollmentProgress(activeLearnerTwo.enrollmentId, bundle.course.courseId);
  }

  const finishedLearnerTwo = enrollmentsByKey.finishedLearnerTwo;
  if (finishedLearnerTwo) {
    await markContentViewed(finishedLearnerTwo.enrollmentId, structureLesson.lessonId, daysAgo(19));
    await completeResource(finishedLearnerTwo.enrollmentId, emailTemplates.resourceId, daysAgo(19));
    await markContentViewed(finishedLearnerTwo.enrollmentId, quizLesson.lessonId, daysAgo(18));
    await createQuizAttemptFromMode(finishedLearnerTwo.enrollmentId, workplaceQuiz, 'fail', daysAgo(18));
    await createQuizAttemptFromMode(finishedLearnerTwo.enrollmentId, workplaceQuiz, 'pass', daysAgo(17));
    await completePrimaryVideo(finishedLearnerTwo.enrollmentId, followUpLesson, daysAgo(16));
    await completeResource(finishedLearnerTwo.enrollmentId, followUpExamples.resourceId, daysAgo(16));
    await finalizeEnrollmentProgress(finishedLearnerTwo.enrollmentId, bundle.course.courseId, 'completed');
  }
}

async function seedBusinessCommunicationScenarios(bundle, enrollmentsByKey) {
  const meetingsLesson = getLesson(bundle, 'Module 1: Meeting Communication', 'Running Better Meetings');
  const agendaTemplate = getResource(bundle, 'Module 1: Meeting Communication', 'Running Better Meetings', 'Meeting Agenda Template');
  const followUpLesson = getLesson(bundle, 'Module 1: Meeting Communication', 'Follow-up Communication');
  const clientLesson = getLesson(bundle, 'Module 2: Client Communication', 'Client Status Updates');
  const statusTemplate = getResource(bundle, 'Module 2: Client Communication', 'Client Status Updates', 'Status Update Sample');

  const activeLearner = enrollmentsByKey.activeLearner;
  await completePrimaryVideo(activeLearner.enrollmentId, meetingsLesson, daysAgo(6));
  await completeResource(activeLearner.enrollmentId, agendaTemplate.resourceId, daysAgo(6));
  await finalizeEnrollmentProgress(activeLearner.enrollmentId, bundle.course.courseId);

  const finishedLearner = enrollmentsByKey.finishedLearner;
  await completePrimaryVideo(finishedLearner.enrollmentId, meetingsLesson, daysAgo(22));
  await completeResource(finishedLearner.enrollmentId, agendaTemplate.resourceId, daysAgo(22));
  await markContentViewed(finishedLearner.enrollmentId, followUpLesson.lessonId, daysAgo(21));
  await markContentViewed(finishedLearner.enrollmentId, clientLesson.lessonId, daysAgo(20));
  await completeResource(finishedLearner.enrollmentId, statusTemplate.resourceId, daysAgo(20));
  await finalizeEnrollmentProgress(finishedLearner.enrollmentId, bundle.course.courseId, 'completed');

  const startedLearner = enrollmentsByKey.startedLearner;
  if (startedLearner) {
    await completePrimaryVideo(startedLearner.enrollmentId, meetingsLesson, daysAgo(7));
    await finalizeEnrollmentProgress(startedLearner.enrollmentId, bundle.course.courseId);
  }

  const finishedLearnerTwo = enrollmentsByKey.finishedLearnerTwo;
  if (finishedLearnerTwo) {
    await completePrimaryVideo(finishedLearnerTwo.enrollmentId, meetingsLesson, daysAgo(18));
    await completeResource(finishedLearnerTwo.enrollmentId, agendaTemplate.resourceId, daysAgo(18));
    await markContentViewed(finishedLearnerTwo.enrollmentId, followUpLesson.lessonId, daysAgo(17));
    await markContentViewed(finishedLearnerTwo.enrollmentId, clientLesson.lessonId, daysAgo(16));
    await completeResource(finishedLearnerTwo.enrollmentId, statusTemplate.resourceId, daysAgo(16));
    await finalizeEnrollmentProgress(finishedLearnerTwo.enrollmentId, bundle.course.courseId, 'completed');
  }
}

async function seedPronunciationClinicScenarios(bundle, enrollmentsByKey) {
  const minimalPairsLesson = getLesson(bundle, 'Module 1: Sound Awareness', 'Minimal Pairs Practice');
  const minimalPairsSheet = getResource(bundle, 'Module 1: Sound Awareness', 'Minimal Pairs Practice', 'Minimal Pairs Sheet');
  const sentenceStressLesson = getLesson(bundle, 'Module 1: Sound Awareness', 'Sentence Stress');

  const activeLearner = enrollmentsByKey.activeLearner;
  await completePrimaryVideo(activeLearner.enrollmentId, minimalPairsLesson, daysAgo(5));
  await finalizeEnrollmentProgress(activeLearner.enrollmentId, bundle.course.courseId);

  const finishedLearner = enrollmentsByKey.finishedLearner;
  await completePrimaryVideo(finishedLearner.enrollmentId, minimalPairsLesson, daysAgo(12));
  await completeResource(finishedLearner.enrollmentId, minimalPairsSheet.resourceId, daysAgo(12));
  await markContentViewed(finishedLearner.enrollmentId, sentenceStressLesson.lessonId, daysAgo(11));
  await finalizeEnrollmentProgress(finishedLearner.enrollmentId, bundle.course.courseId, 'completed');

  const activeLearnerTwo = enrollmentsByKey.activeLearnerTwo;
  if (activeLearnerTwo) {
    await completePrimaryVideo(activeLearnerTwo.enrollmentId, minimalPairsLesson, daysAgo(8));
    await completeResource(activeLearnerTwo.enrollmentId, minimalPairsSheet.resourceId, daysAgo(8));
    await finalizeEnrollmentProgress(activeLearnerTwo.enrollmentId, bundle.course.courseId);
  }

  const finishedLearnerTwo = enrollmentsByKey.finishedLearnerTwo;
  if (finishedLearnerTwo) {
    await completePrimaryVideo(finishedLearnerTwo.enrollmentId, minimalPairsLesson, daysAgo(15));
    await completeResource(finishedLearnerTwo.enrollmentId, minimalPairsSheet.resourceId, daysAgo(15));
    await markContentViewed(finishedLearnerTwo.enrollmentId, sentenceStressLesson.lessonId, daysAgo(14));
    await finalizeEnrollmentProgress(finishedLearnerTwo.enrollmentId, bundle.course.courseId, 'completed');
  }
}

async function seedConversationConfidenceScenarios(bundle, enrollmentsByKey) {
  const warmupLesson = getLesson(bundle, 'Module 1: Everyday Fluency', 'Warm-up Phrases');
  const phraseList = getResource(bundle, 'Module 1: Everyday Fluency', 'Warm-up Phrases', 'Phrase List');
  const roleplayLesson = getLesson(bundle, 'Module 1: Everyday Fluency', 'Roleplay Practice');
  const followUpLesson = getLesson(bundle, 'Module 2: Confidence Building', 'Handling Follow-up Questions');

  const startedLearner = enrollmentsByKey.startedLearner;
  await markContentViewed(startedLearner.enrollmentId, warmupLesson.lessonId, daysAgo(9));
  await finalizeEnrollmentProgress(startedLearner.enrollmentId, bundle.course.courseId);

  const advancedLearner = enrollmentsByKey.advancedLearner;
  await markContentViewed(advancedLearner.enrollmentId, warmupLesson.lessonId, daysAgo(13));
  await completeResource(advancedLearner.enrollmentId, phraseList.resourceId, daysAgo(13));
  await completePrimaryVideo(advancedLearner.enrollmentId, roleplayLesson, daysAgo(12));
  await finalizeEnrollmentProgress(advancedLearner.enrollmentId, bundle.course.courseId);

  const finishedLearner = enrollmentsByKey.finishedLearner;
  await markContentViewed(finishedLearner.enrollmentId, warmupLesson.lessonId, daysAgo(20));
  await completeResource(finishedLearner.enrollmentId, phraseList.resourceId, daysAgo(20));
  await completePrimaryVideo(finishedLearner.enrollmentId, roleplayLesson, daysAgo(19));
  await markContentViewed(finishedLearner.enrollmentId, followUpLesson.lessonId, daysAgo(18));
  await finalizeEnrollmentProgress(finishedLearner.enrollmentId, bundle.course.courseId, 'completed');
}

async function seedSupplementalWebScenarios(bundle, enrollmentsByKey) {
  const l1 = getLesson(bundle, 'Module 1: HTML Foundations', 'HTML Foundations Overview');
  const l2 = getLesson(bundle, 'Module 1: HTML Foundations', 'Form Building Workshop');
  const l3 = getLesson(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice');
  const l4 = getLesson(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio');
  const l5 = getLesson(bundle, 'Module 2: CSS and DOM', 'DOM Interaction Lab');
  const l6 = getLesson(bundle, 'Module 2: CSS and DOM', 'API Integration Demo');
  const l7 = getLesson(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive');
  const l8 = getLesson(bundle, 'Module 3: Project Delivery', 'Final Project Review');

  const formChecklist = getResource(bundle, 'Module 1: HTML Foundations', 'Form Building Workshop', 'Form Checklist');
  const semanticGuide = getResource(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice', 'Semantic Tags Guide');
  const accessibilityNotes = getResource(bundle, 'Module 1: HTML Foundations', 'Semantic Markup Practice', 'Accessibility Notes');
  const flexboxWorksheet = getResource(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio', 'Flexbox Worksheet');
  const apiCheatsheet = getResource(bundle, 'Module 2: CSS and DOM', 'API Integration Demo', 'API Response Cheatsheet');
  const componentTree = getResource(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive', 'Component Tree Template');
  const bonusVideo = getResource(bundle, 'Module 3: Project Delivery', 'Component Architecture Deep Dive', 'Bonus Walkthrough Video');

  const htmlQuiz = getQuiz(bundle, 'Module 1: HTML Foundations', 'HTML Foundations Overview');
  const cssQuiz = getQuiz(bundle, 'Module 2: CSS and DOM', 'CSS Layout Studio');
  const capstoneQuiz = getQuiz(bundle, 'Module 3: Project Delivery', 'Final Project Review');

  const startedLearner = enrollmentsByKey.startedLearner;
  await markContentViewed(startedLearner.enrollmentId, l1.lessonId, daysAgo(10));
  await finalizeEnrollmentProgress(startedLearner.enrollmentId, bundle.course.courseId);

  const moduleTwoLearner = enrollmentsByKey.moduleTwoLearner;
  await markContentViewed(moduleTwoLearner.enrollmentId, l1.lessonId, daysAgo(22));
  await createQuizAttemptFromMode(moduleTwoLearner.enrollmentId, htmlQuiz, 'pass', daysAgo(22));
  await completePrimaryVideo(moduleTwoLearner.enrollmentId, l2, daysAgo(21));
  await completeResource(moduleTwoLearner.enrollmentId, formChecklist.resourceId, daysAgo(21));
  await markContentViewed(moduleTwoLearner.enrollmentId, l3.lessonId, daysAgo(20));
  await completeResource(moduleTwoLearner.enrollmentId, semanticGuide.resourceId, daysAgo(20));
  await completeResource(moduleTwoLearner.enrollmentId, accessibilityNotes.resourceId, daysAgo(20));
  await completePrimaryVideo(moduleTwoLearner.enrollmentId, l4, daysAgo(18));
  await completeResource(moduleTwoLearner.enrollmentId, flexboxWorksheet.resourceId, daysAgo(18));
  await createQuizAttemptFromMode(moduleTwoLearner.enrollmentId, cssQuiz, 'pass', daysAgo(18));
  await markContentViewed(moduleTwoLearner.enrollmentId, l5.lessonId, daysAgo(16));
  await finalizeEnrollmentProgress(moduleTwoLearner.enrollmentId, bundle.course.courseId);

  const completedLearner = enrollmentsByKey.completedLearner;
  await markContentViewed(completedLearner.enrollmentId, l1.lessonId, daysAgo(27));
  await createQuizAttemptFromMode(completedLearner.enrollmentId, htmlQuiz, 'pass', daysAgo(27));
  await completePrimaryVideo(completedLearner.enrollmentId, l2, daysAgo(26));
  await completeResource(completedLearner.enrollmentId, formChecklist.resourceId, daysAgo(26));
  await markContentViewed(completedLearner.enrollmentId, l3.lessonId, daysAgo(25));
  await completeResource(completedLearner.enrollmentId, semanticGuide.resourceId, daysAgo(25));
  await completeResource(completedLearner.enrollmentId, accessibilityNotes.resourceId, daysAgo(25));
  await completePrimaryVideo(completedLearner.enrollmentId, l4, daysAgo(24));
  await completeResource(completedLearner.enrollmentId, flexboxWorksheet.resourceId, daysAgo(24));
  await createQuizAttemptFromMode(completedLearner.enrollmentId, cssQuiz, 'pass', daysAgo(24));
  await markContentViewed(completedLearner.enrollmentId, l5.lessonId, daysAgo(23));
  await completePrimaryVideo(completedLearner.enrollmentId, l6, daysAgo(22));
  await completeResource(completedLearner.enrollmentId, apiCheatsheet.resourceId, daysAgo(22));
  await markContentViewed(completedLearner.enrollmentId, l7.lessonId, daysAgo(21));
  await completeResource(completedLearner.enrollmentId, componentTree.resourceId, daysAgo(21));
  await completeResource(completedLearner.enrollmentId, bonusVideo.resourceId, daysAgo(21));
  await markContentViewed(completedLearner.enrollmentId, l8.lessonId, daysAgo(20));
  await createQuizAttemptFromMode(completedLearner.enrollmentId, capstoneQuiz, 'pass', daysAgo(20));
  await finalizeEnrollmentProgress(completedLearner.enrollmentId, bundle.course.courseId, 'completed');
}

async function seedExpandedIeltsScenarios(bundle, enrollmentsByKey) {
  const listeningLesson = getLesson(bundle, 'Module 1: Listening Mastery', 'Listening Foundations');
  const listeningNotes = getResource(bundle, 'Module 1: Listening Mastery', 'Listening Foundations', 'Listening Notes');
  const listeningQuizLesson = getLesson(bundle, 'Module 1: Listening Mastery', 'Listening Practice Test');
  const listeningQuiz = getQuiz(bundle, 'Module 1: Listening Mastery', 'Listening Practice Test');
  const readingLesson = getLesson(bundle, 'Module 2: Reading Strategies', 'Reading Strategy Workshop');
  const readingMap = getResource(bundle, 'Module 2: Reading Strategies', 'Reading Strategy Workshop', 'Reading Strategy Map');
  const readingQuizLesson = getLesson(bundle, 'Module 2: Reading Strategies', 'Reading Practice Test');
  const readingQuiz = getQuiz(bundle, 'Module 2: Reading Strategies', 'Reading Practice Test');
  const writingLesson = getLesson(bundle, 'Module 3: Writing and Feedback', 'Writing Task Frameworks');
  const writingPlanner = getResource(bundle, 'Module 3: Writing and Feedback', 'Writing Task Frameworks', 'Writing Planner');
  const writingSubmissionLesson = getLesson(bundle, 'Module 3: Writing and Feedback', 'Writing Submission');
  const speakingLesson = getLesson(bundle, 'Module 4: Speaking Practice', 'Speaking Strategy Session');
  const speakingCards = getResource(bundle, 'Module 4: Speaking Practice', 'Speaking Strategy Session', 'Speaking Cue Cards');

  const retryLearner = enrollmentsByKey.retryLearner;
  await completePrimaryVideo(retryLearner.enrollmentId, listeningLesson, daysAgo(17));
  await completeResource(retryLearner.enrollmentId, listeningNotes.resourceId, daysAgo(17));
  await markContentViewed(retryLearner.enrollmentId, listeningQuizLesson.lessonId, daysAgo(16));
  await createQuizAttemptFromMode(retryLearner.enrollmentId, listeningQuiz, 'pass', daysAgo(16));
  await markContentViewed(retryLearner.enrollmentId, readingLesson.lessonId, daysAgo(15));
  await completeResource(retryLearner.enrollmentId, readingMap.resourceId, daysAgo(15));
  await markContentViewed(retryLearner.enrollmentId, readingQuizLesson.lessonId, daysAgo(14));
  await createQuizAttemptFromMode(retryLearner.enrollmentId, readingQuiz, 'fail', daysAgo(14));
  await createQuizAttemptFromMode(retryLearner.enrollmentId, readingQuiz, 'pass', daysAgo(13));
  await markContentViewed(retryLearner.enrollmentId, writingLesson.lessonId, daysAgo(12));
  await finalizeEnrollmentProgress(retryLearner.enrollmentId, bundle.course.courseId);

  const completedLearnerTwo = enrollmentsByKey.completedLearnerTwo;
  await completePrimaryVideo(completedLearnerTwo.enrollmentId, listeningLesson, daysAgo(35));
  await completeResource(completedLearnerTwo.enrollmentId, listeningNotes.resourceId, daysAgo(35));
  await markContentViewed(completedLearnerTwo.enrollmentId, listeningQuizLesson.lessonId, daysAgo(34));
  await createQuizAttemptFromMode(completedLearnerTwo.enrollmentId, listeningQuiz, 'pass', daysAgo(34));
  await markContentViewed(completedLearnerTwo.enrollmentId, readingLesson.lessonId, daysAgo(33));
  await completeResource(completedLearnerTwo.enrollmentId, readingMap.resourceId, daysAgo(33));
  await markContentViewed(completedLearnerTwo.enrollmentId, readingQuizLesson.lessonId, daysAgo(32));
  await createQuizAttemptFromMode(completedLearnerTwo.enrollmentId, readingQuiz, 'pass', daysAgo(32));
  await markContentViewed(completedLearnerTwo.enrollmentId, writingLesson.lessonId, daysAgo(31));
  await completeResource(completedLearnerTwo.enrollmentId, writingPlanner.resourceId, daysAgo(31));
  await markContentViewed(completedLearnerTwo.enrollmentId, writingSubmissionLesson.lessonId, daysAgo(30));
  await completePrimaryVideo(completedLearnerTwo.enrollmentId, speakingLesson, daysAgo(29));
  await completeResource(completedLearnerTwo.enrollmentId, speakingCards.resourceId, daysAgo(29));
  await finalizeEnrollmentProgress(completedLearnerTwo.enrollmentId, bundle.course.courseId, 'completed');
}

async function finalizeCourseAggregate(courseId) {
  const [enrollmentCount, reviewAgg] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.courseReview.aggregate({
      where: { courseId },
      _count: { reviewId: true },
      _avg: { rating: true },
    }),
  ]);

  await prisma.course.update({
    where: { courseId },
    data: {
      totalStudents: enrollmentCount,
      totalReviews: reviewAgg._count.reviewId || 0,
      avgRating: reviewAgg._avg.rating || 0,
    },
  });
}

async function recalculateInstructorWallets() {
  const instructors = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            roleName: 'instructor',
          },
        },
      },
    },
    include: {
      coursesAsInstructor: {
        include: {
          orderDetails: {
            include: {
              order: {
                include: {
                  transaction: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const instructor of instructors) {
    const successfulRevenue = instructor.coursesAsInstructor
      .flatMap((course) => course.orderDetails)
      .filter((detail) => detail.order.transaction?.status === 'success')
      .reduce((sum, detail) => sum + Number(detail.price), 0);

    await prisma.instructorWallet.update({
      where: { instructorId: instructor.userId },
      data: {
        totalEarnings: Math.round(successfulRevenue * 80) / 100,
        balance: Math.round(successfulRevenue * 45) / 100,
      },
    });
  }
}

async function main() {
  console.log('🌱 Seeding expanded demo database...\n');

  const adminRole = await createRole('admin');
  const instructorRole = await createRole('instructor');
  const studentRole = await createRole('student');

  console.log('👥 Creating users and instructor profiles...');
  const admin = await createUserWithRole({
    email: 'admin@example.com',
    fullName: 'Admin User',
    currentLevel: 'C2',
    roleId: adminRole.roleId,
    phoneNumber: '0900000001',
  });

  const instructors = {};
  instructors.lecturer1 = await createUserWithRole({
    email: 'lecturer@example.com',
    fullName: 'Giang Nguyen',
    currentLevel: 'C2',
    roleId: instructorRole.roleId,
    phoneNumber: '0901000001',
  });
  await createInstructorProfile(instructors.lecturer1, {
    bio: 'Full-stack instructor focused on practical project-based teaching.',
    expertise: 'Web Development',
    experienceYears: 8,
    workEmail: 'giang@beeenglish.edu',
    workPhone: '0901000001',
    bankAccountInfo: { bankName: 'ACB', accountNumber: '111222333', accountName: 'Giang Nguyen' },
  });

  instructors.lecturer2 = await createUserWithRole({
    email: 'teacher2@example.com',
    fullName: 'Huong Tran',
    currentLevel: 'C1',
    roleId: instructorRole.roleId,
    phoneNumber: '0901000002',
  });
  await createInstructorProfile(instructors.lecturer2, {
    bio: 'Exam preparation specialist for TOEIC and grammar foundations.',
    expertise: 'TOEIC, Grammar',
    experienceYears: 6,
    workEmail: 'huong@beeenglish.edu',
    workPhone: '0901000002',
    bankAccountInfo: { bankName: 'VCB', accountNumber: '222333444', accountName: 'Huong Tran' },
  });

  instructors.mentor3 = await createUserWithRole({
    email: 'mentor3@example.com',
    fullName: 'Linh Pham',
    currentLevel: 'C2',
    roleId: instructorRole.roleId,
    phoneNumber: '0901000003',
  });
  await createInstructorProfile(instructors.mentor3, {
    bio: 'Communication coach helping learners become more fluent and confident.',
    expertise: 'Speaking, Business Communication',
    experienceYears: 5,
    workEmail: 'linh@beeenglish.edu',
    workPhone: '0901000003',
    bankAccountInfo: { bankName: 'Techcombank', accountNumber: '333444555', accountName: 'Linh Pham' },
  });

  instructors.coach4 = await createUserWithRole({
    email: 'coach4@example.com',
    fullName: 'An Le',
    currentLevel: 'B2',
    roleId: instructorRole.roleId,
    phoneNumber: '0901000004',
  });
  await createInstructorProfile(instructors.coach4, {
    bio: 'Kids curriculum designer building playful starter experiences.',
    expertise: 'Kids English',
    experienceYears: 4,
    workEmail: 'an@beeenglish.edu',
    workPhone: '0901000004',
    bankAccountInfo: { bankName: 'MB', accountNumber: '444555666', accountName: 'An Le' },
  });

  const studentDefinitions = [
    ['student@example.com', 'Hoc Le', 'A1'],
    ['student2@example.com', 'Mai Pham', 'B1'],
    ['student3@example.com', 'Nam Hoang', 'A2'],
    ['student4@example.com', 'Quynh Dao', 'A0'],
    ['student5@example.com', 'Khanh Vo', 'B2'],
    ['student6@example.com', 'Minh Bui', 'A2'],
    ['student7@example.com', 'Trang Ho', 'B1'],
    ['student8@example.com', 'Phuc Do', 'B2'],
    ['student9@example.com', 'Nhi Tran', 'A1'],
    ['student10@example.com', 'Vy Nguyen', 'C1'],
    ['student11@example.com', 'Long Pham', 'A0'],
    ['student12@example.com', 'My Dang', 'A2'],
    ['student13@example.com', 'Huy Le', 'B1'],
    ['student14@example.com', 'Lan Vu', 'A2'],
    ['student15@example.com', 'Bao Tran', 'C1'],
  ];

  const students = {};
  for (const [email, fullName, level] of studentDefinitions) {
    const user = await createUserWithRole({
      email,
      fullName,
      currentLevel: level,
      roleId: studentRole.roleId,
    });
    students[email] = user;
  }
  console.log(`  ✅ Created ${Object.keys(students).length} students\n`);

  console.log('📚 Creating course portfolio...');
  const courseBundles = {};
  courseBundles.webFoundations = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'webFoundations'), instructors.lecturer1.userId);
  courseBundles.ieltsMastery = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'ieltsMastery'), instructors.lecturer1.userId);
  const flaggedTemplate = {
    ...COURSE_TEMPLATES.find((item) => item.key === 'businessFlagged'),
    contentFlagged: true,
    contentFlaggedAt: daysAgo(5),
    contentFlaggedBy: admin.userId,
    contentFlaggedReason: 'Contains outdated communication guidance that needs review.',
  };
  courseBundles.businessFlagged = await createCourseFromTemplate(flaggedTemplate, instructors.lecturer1.userId);
  courseBundles.grammarBasics = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'grammarBasics'), instructors.lecturer2.userId);
  courseBundles.toeicArchived = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'toeicArchived'), instructors.lecturer2.userId);
  courseBundles.conversationConfidence = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'conversationConfidence'), instructors.mentor3.userId);
  courseBundles.kidsStarter = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'kidsStarter'), instructors.coach4.userId);
  courseBundles.workplaceEmail = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'workplaceEmail'), instructors.mentor3.userId);
  courseBundles.pronunciationClinic = await createCourseFromTemplate(COURSE_TEMPLATES.find((item) => item.key === 'pronunciationClinic'), instructors.coach4.userId);
  console.log(`  ✅ Created ${Object.keys(courseBundles).length} courses\n`);

  console.log('🏷️ Creating coupons...');
  const activeCoupon = await prisma.coupon.create({
    data: {
      code: 'ACTIVE20',
      type: 'percent',
      value: 20,
      minOrderValue: 200000,
      startDate: daysAgo(30),
      endDate: daysFromNow(60),
      usageLimit: 100,
      usedCount: 4,
      isActive: true,
    },
  });
  await prisma.coupon.create({
    data: {
      code: 'OLD10',
      type: 'percent',
      value: 10,
      minOrderValue: 100000,
      startDate: daysAgo(200),
      endDate: daysAgo(30),
      usageLimit: 30,
      usedCount: 30,
      isActive: false,
    },
  });
  console.log('  ✅ Coupons created\n');

  console.log('🧾 Creating orders, carts, and enrollments...');
  const enrollments = {};

  const webStudents = [
    students['student@example.com'],
    students['student2@example.com'],
    students['student3@example.com'],
    students['student4@example.com'],
    students['student5@example.com'],
    students['student6@example.com'],
    students['student7@example.com'],
    students['student8@example.com'],
  ];

  for (const learner of webStudents) {
    enrollments[`web-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.webFoundations.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(45),
    });
  }

  const grammarStudents = [
    students['student2@example.com'],
    students['student4@example.com'],
    students['student9@example.com'],
    students['student10@example.com'],
    students['student11@example.com'],
  ];
  for (const learner of grammarStudents) {
    enrollments[`grammar-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.grammarBasics.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(20),
    });
  }

  const conversationStudents = [
    students['student8@example.com'],
    students['student9@example.com'],
    students['student12@example.com'],
  ];
  for (const learner of conversationStudents) {
    enrollments[`conversation-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.conversationConfidence.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(14),
    });
  }

  const supplementalWebStudents = [
    students['student9@example.com'],
    students['student10@example.com'],
    students['student13@example.com'],
    students['student14@example.com'],
    students['student15@example.com'],
  ];
  for (const learner of supplementalWebStudents) {
    enrollments[`web-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.webFoundations.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(28),
    });
  }

  const supplementalGrammarStudents = [
    students['student3@example.com'],
    students['student6@example.com'],
    students['student13@example.com'],
    students['student15@example.com'],
  ];
  for (const learner of supplementalGrammarStudents) {
    enrollments[`grammar-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.grammarBasics.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(18),
    });
  }

  const supplementalConversationStudents = [
    students['student@example.com'],
    students['student5@example.com'],
    students['student14@example.com'],
    students['student15@example.com'],
  ];
  for (const learner of supplementalConversationStudents) {
    enrollments[`conversation-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.conversationConfidence.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(12),
    });
  }

  const supplementalPronunciationStudents = [
    students['student7@example.com'],
    students['student14@example.com'],
    students['student15@example.com'],
  ];
  for (const learner of supplementalPronunciationStudents) {
    enrollments[`pronunciation-${learner.email}`] = await createEnrollment({
      userId: learner.userId,
      courseId: courseBundles.pronunciationClinic.course.courseId,
      status: 'active',
      enrolledAt: daysAgo(11),
    });
  }

  const ieltsOrder1 = await createOrder({
    userId: students['student2@example.com'].userId,
    items: [{ courseId: courseBundles.ieltsMastery.course.courseId, price: 500000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(25),
    couponId: activeCoupon.couponId,
  });
  enrollments['ielts-student2@example.com'] = await createEnrollment({
    userId: students['student2@example.com'].userId,
    courseId: courseBundles.ieltsMastery.course.courseId,
    orderId: ieltsOrder1.orderId,
    status: 'active',
    enrolledAt: daysAgo(25),
  });

  const bundleOrder = await createOrder({
    userId: students['student3@example.com'].userId,
    items: [
      { courseId: courseBundles.ieltsMastery.course.courseId, price: 500000 },
      { courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 },
    ],
    paymentMethod: 'bank_transfer',
    status: 'completed',
    createdAt: daysAgo(40),
  });
  enrollments['ielts-student3@example.com'] = await createEnrollment({
    userId: students['student3@example.com'].userId,
    courseId: courseBundles.ieltsMastery.course.courseId,
    orderId: bundleOrder.orderId,
    status: 'completed',
    enrolledAt: daysAgo(40),
  });
  enrollments['workplace-student3@example.com'] = await createEnrollment({
    userId: students['student3@example.com'].userId,
    courseId: courseBundles.workplaceEmail.course.courseId,
    orderId: bundleOrder.orderId,
    status: 'active',
    enrolledAt: daysAgo(40),
  });

  const ieltsOrder2 = await createOrder({
    userId: students['student5@example.com'].userId,
    items: [{ courseId: courseBundles.ieltsMastery.course.courseId, price: 500000 }],
    paymentMethod: 'paypal',
    status: 'completed',
    createdAt: daysAgo(18),
  });
  enrollments['ielts-student5@example.com'] = await createEnrollment({
    userId: students['student5@example.com'].userId,
    courseId: courseBundles.ieltsMastery.course.courseId,
    orderId: ieltsOrder2.orderId,
    status: 'active',
    enrolledAt: daysAgo(18),
  });

  const ieltsOrder3 = await createOrder({
    userId: students['student8@example.com'].userId,
    items: [{ courseId: courseBundles.ieltsMastery.course.courseId, price: 500000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(19),
  });
  enrollments['ielts-student8@example.com'] = await createEnrollment({
    userId: students['student8@example.com'].userId,
    courseId: courseBundles.ieltsMastery.course.courseId,
    orderId: ieltsOrder3.orderId,
    status: 'active',
    enrolledAt: daysAgo(19),
  });

  const ieltsOrder4 = await createOrder({
    userId: students['student14@example.com'].userId,
    items: [{ courseId: courseBundles.ieltsMastery.course.courseId, price: 500000 }],
    paymentMethod: 'paypal',
    status: 'completed',
    createdAt: daysAgo(36),
  });
  enrollments['ielts-student14@example.com'] = await createEnrollment({
    userId: students['student14@example.com'].userId,
    courseId: courseBundles.ieltsMastery.course.courseId,
    orderId: ieltsOrder4.orderId,
    status: 'active',
    enrolledAt: daysAgo(36),
  });

  const workplaceOrder = await createOrder({
    userId: students['student6@example.com'].userId,
    items: [{ courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(9),
  });
  enrollments['workplace-student6@example.com'] = await createEnrollment({
    userId: students['student6@example.com'].userId,
    courseId: courseBundles.workplaceEmail.course.courseId,
    orderId: workplaceOrder.orderId,
    status: 'active',
    enrolledAt: daysAgo(9),
  });

  const toeicHistoryOrder = await createOrder({
    userId: students['student10@example.com'].userId,
    items: [{ courseId: courseBundles.toeicArchived.course.courseId, price: 300000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(120),
  });
  enrollments['toeic-student10@example.com'] = await createEnrollment({
    userId: students['student10@example.com'].userId,
    courseId: courseBundles.toeicArchived.course.courseId,
    orderId: toeicHistoryOrder.orderId,
    status: 'completed',
    enrolledAt: daysAgo(120),
    expiryDate: daysAgo(5),
  });

  const toeicExpiredOrder = await createOrder({
    userId: students['student3@example.com'].userId,
    items: [{ courseId: courseBundles.toeicArchived.course.courseId, price: 300000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(160),
  });
  enrollments['toeic-student3@example.com'] = await createEnrollment({
    userId: students['student3@example.com'].userId,
    courseId: courseBundles.toeicArchived.course.courseId,
    orderId: toeicExpiredOrder.orderId,
    status: 'expired',
    enrolledAt: daysAgo(160),
    expiryDate: daysAgo(20),
  });

  const businessOrder1 = await createOrder({
    userId: students['student9@example.com'].userId,
    items: [{ courseId: courseBundles.businessFlagged.course.courseId, price: 400000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(11),
  });
  enrollments['business-student9@example.com'] = await createEnrollment({
    userId: students['student9@example.com'].userId,
    courseId: courseBundles.businessFlagged.course.courseId,
    orderId: businessOrder1.orderId,
    status: 'active',
    enrolledAt: daysAgo(11),
  });

  const businessOrder2 = await createOrder({
    userId: students['student11@example.com'].userId,
    items: [{ courseId: courseBundles.businessFlagged.course.courseId, price: 400000 }],
    paymentMethod: 'bank_transfer',
    status: 'completed',
    createdAt: daysAgo(24),
  });
  enrollments['business-student11@example.com'] = await createEnrollment({
    userId: students['student11@example.com'].userId,
    courseId: courseBundles.businessFlagged.course.courseId,
    orderId: businessOrder2.orderId,
    status: 'completed',
    enrolledAt: daysAgo(24),
  });

  enrollments['pronunciation-student@example.com'] = await createEnrollment({
    userId: students['student@example.com'].userId,
    courseId: courseBundles.pronunciationClinic.course.courseId,
    status: 'active',
    enrolledAt: daysAgo(9),
  });
  enrollments['pronunciation-student12@example.com'] = await createEnrollment({
    userId: students['student12@example.com'].userId,
    courseId: courseBundles.pronunciationClinic.course.courseId,
    status: 'completed',
    enrolledAt: daysAgo(15),
  });

  const workplaceOrder2 = await createOrder({
    userId: students['student8@example.com'].userId,
    items: [{ courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 }],
    paymentMethod: 'paypal',
    status: 'completed',
    createdAt: daysAgo(17),
  });
  enrollments['workplace-student8@example.com'] = await createEnrollment({
    userId: students['student8@example.com'].userId,
    courseId: courseBundles.workplaceEmail.course.courseId,
    orderId: workplaceOrder2.orderId,
    status: 'active',
    enrolledAt: daysAgo(17),
  });

  const workplaceOrder3 = await createOrder({
    userId: students['student9@example.com'].userId,
    items: [{ courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 }],
    paymentMethod: 'vnpay',
    status: 'completed',
    createdAt: daysAgo(13),
  });
  enrollments['workplace-student9@example.com'] = await createEnrollment({
    userId: students['student9@example.com'].userId,
    courseId: courseBundles.workplaceEmail.course.courseId,
    orderId: workplaceOrder3.orderId,
    status: 'active',
    enrolledAt: daysAgo(13),
  });

  const mentorBundleOrder = await createOrder({
    userId: students['student13@example.com'].userId,
    items: [
      { courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 },
      { courseId: courseBundles.businessFlagged.course.courseId, price: 400000 },
    ],
    paymentMethod: 'bank_transfer',
    status: 'completed',
    createdAt: daysAgo(21),
  });
  enrollments['workplace-student13@example.com'] = await createEnrollment({
    userId: students['student13@example.com'].userId,
    courseId: courseBundles.workplaceEmail.course.courseId,
    orderId: mentorBundleOrder.orderId,
    status: 'active',
    enrolledAt: daysAgo(21),
  });
  enrollments['business-student13@example.com'] = await createEnrollment({
    userId: students['student13@example.com'].userId,
    courseId: courseBundles.businessFlagged.course.courseId,
    orderId: mentorBundleOrder.orderId,
    status: 'active',
    enrolledAt: daysAgo(21),
  });

  const businessOrder3 = await createOrder({
    userId: students['student15@example.com'].userId,
    items: [{ courseId: courseBundles.businessFlagged.course.courseId, price: 400000 }],
    paymentMethod: 'paypal',
    status: 'completed',
    createdAt: daysAgo(19),
  });
  enrollments['business-student15@example.com'] = await createEnrollment({
    userId: students['student15@example.com'].userId,
    courseId: courseBundles.businessFlagged.course.courseId,
    orderId: businessOrder3.orderId,
    status: 'active',
    enrolledAt: daysAgo(19),
  });

  await prisma.order.create({
    data: {
      userId: students['student12@example.com'].userId,
      totalAmount: 250000,
      status: 'pending',
      paymentMethod: 'vnpay',
      createdAt: daysAgo(1),
      orderDetails: {
        create: [{ courseId: courseBundles.workplaceEmail.course.courseId, price: 250000 }],
      },
      transaction: {
        create: {
          amount: 250000,
          platformFee: 50000,
          status: 'pending',
          transactionRef: 'TX-PENDING-12',
          vnpayTxnRef: 'VNP-PENDING-12',
          vnpayOrderId: 'ORD-PENDING-12',
          vnpayResponseCode: '01',
          vnpayMessage: 'Waiting for payment',
          createdAt: daysAgo(1),
        },
      },
    },
  });

  await createCart(students['student11@example.com'].userId, courseBundles.workplaceEmail.course.courseId, daysAgo(2));
  await createCart(students['student12@example.com'].userId, courseBundles.businessFlagged.course.courseId, daysAgo(3));
  console.log('  ✅ Commerce and enrollments created\n');

  console.log('📈 Applying progress scenarios...');
  await seedWebFoundationsScenarios(courseBundles.webFoundations, {
    startedOnly: enrollments['web-student2@example.com'],
    completedFirstLesson: enrollments['web-student3@example.com'],
    moduleTwoPartial: enrollments['web-student4@example.com'],
    nearlyFinished: enrollments['web-student5@example.com'],
    completedCourse: enrollments['web-student6@example.com'],
    videoOnly: enrollments['web-student7@example.com'],
    capstoneWaiting: enrollments['web-student8@example.com'],
  });
  await seedPaidCourseProgress(courseBundles.ieltsMastery, {
    activeLearner: enrollments['ielts-student2@example.com'],
    finishedLearner: enrollments['ielts-student3@example.com'],
  });
  await seedToeicArchivedScenarios(courseBundles.toeicArchived, {
    finishedLearner: enrollments['toeic-student10@example.com'],
    expiredLearner: enrollments['toeic-student3@example.com'],
  });
  await seedGrammarBasicsScenarios(courseBundles.grammarBasics, {
    activeLearner: enrollments['grammar-student2@example.com'],
    finishedLearner: enrollments['grammar-student10@example.com'],
  });
  await seedWorkplaceEmailScenarios(courseBundles.workplaceEmail, {
    activeLearner: enrollments['workplace-student3@example.com'],
    finishedLearner: enrollments['workplace-student6@example.com'],
    activeLearnerTwo: enrollments['workplace-student9@example.com'],
    finishedLearnerTwo: enrollments['workplace-student13@example.com'],
  });
  await seedBusinessCommunicationScenarios(courseBundles.businessFlagged, {
    activeLearner: enrollments['business-student9@example.com'],
    finishedLearner: enrollments['business-student11@example.com'],
    startedLearner: enrollments['business-student13@example.com'],
    finishedLearnerTwo: enrollments['business-student15@example.com'],
  });
  await seedPronunciationClinicScenarios(courseBundles.pronunciationClinic, {
    activeLearner: enrollments['pronunciation-student@example.com'],
    finishedLearner: enrollments['pronunciation-student12@example.com'],
    activeLearnerTwo: enrollments['pronunciation-student7@example.com'],
    finishedLearnerTwo: enrollments['pronunciation-student15@example.com'],
  });
  await seedConversationConfidenceScenarios(courseBundles.conversationConfidence, {
    startedLearner: enrollments['conversation-student@example.com'],
    advancedLearner: enrollments['conversation-student14@example.com'],
    finishedLearner: enrollments['conversation-student15@example.com'],
  });
  await seedSupplementalWebScenarios(courseBundles.webFoundations, {
    startedLearner: enrollments['web-student9@example.com'],
    moduleTwoLearner: enrollments['web-student10@example.com'],
    completedLearner: enrollments['web-student13@example.com'],
  });
  await seedExpandedIeltsScenarios(courseBundles.ieltsMastery, {
    retryLearner: enrollments['ielts-student8@example.com'],
    completedLearnerTwo: enrollments['ielts-student14@example.com'],
  });
  console.log('  ✅ Progress scenarios created\n');

  console.log('🏅 Creating certificates and reviews...');
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['web-student6@example.com'].enrollmentId,
      userId: students['student6@example.com'].userId,
      courseId: courseBundles.webFoundations.course.courseId,
      serialNumber: `CERT-WEB-${enrollments['web-student6@example.com'].enrollmentId}`,
      issuedAt: daysAgo(25),
      pdfUrl: 'https://example.com/certificates/web-foundations.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['ielts-student3@example.com'].enrollmentId,
      userId: students['student3@example.com'].userId,
      courseId: courseBundles.ieltsMastery.course.courseId,
      serialNumber: `CERT-IELTS-${enrollments['ielts-student3@example.com'].enrollmentId}`,
      issuedAt: daysAgo(39),
      pdfUrl: 'https://example.com/certificates/ielts-mastery.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['toeic-student10@example.com'].enrollmentId,
      userId: students['student10@example.com'].userId,
      courseId: courseBundles.toeicArchived.course.courseId,
      serialNumber: `CERT-TOEIC-${enrollments['toeic-student10@example.com'].enrollmentId}`,
      issuedAt: daysAgo(60),
      pdfUrl: 'https://example.com/certificates/toeic-history.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['grammar-student10@example.com'].enrollmentId,
      userId: students['student10@example.com'].userId,
      courseId: courseBundles.grammarBasics.course.courseId,
      serialNumber: `CERT-GRAMMAR-${enrollments['grammar-student10@example.com'].enrollmentId}`,
      issuedAt: daysAgo(27),
      pdfUrl: 'https://example.com/certificates/grammar-basics.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['workplace-student6@example.com'].enrollmentId,
      userId: students['student6@example.com'].userId,
      courseId: courseBundles.workplaceEmail.course.courseId,
      serialNumber: `CERT-WORKPLACE-${enrollments['workplace-student6@example.com'].enrollmentId}`,
      issuedAt: daysAgo(14),
      pdfUrl: 'https://example.com/certificates/workplace-email.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['business-student11@example.com'].enrollmentId,
      userId: students['student11@example.com'].userId,
      courseId: courseBundles.businessFlagged.course.courseId,
      serialNumber: `CERT-BUSINESS-${enrollments['business-student11@example.com'].enrollmentId}`,
      issuedAt: daysAgo(20),
      pdfUrl: 'https://example.com/certificates/business-communication.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['pronunciation-student12@example.com'].enrollmentId,
      userId: students['student12@example.com'].userId,
      courseId: courseBundles.pronunciationClinic.course.courseId,
      serialNumber: `CERT-PRON-${enrollments['pronunciation-student12@example.com'].enrollmentId}`,
      issuedAt: daysAgo(11),
      pdfUrl: 'https://example.com/certificates/pronunciation-clinic.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['workplace-student13@example.com'].enrollmentId,
      userId: students['student13@example.com'].userId,
      courseId: courseBundles.workplaceEmail.course.courseId,
      serialNumber: `CERT-WORKPLACE-${enrollments['workplace-student13@example.com'].enrollmentId}`,
      issuedAt: daysAgo(16),
      pdfUrl: 'https://example.com/certificates/workplace-email-advanced.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['business-student15@example.com'].enrollmentId,
      userId: students['student15@example.com'].userId,
      courseId: courseBundles.businessFlagged.course.courseId,
      serialNumber: `CERT-BUSINESS-${enrollments['business-student15@example.com'].enrollmentId}`,
      issuedAt: daysAgo(16),
      pdfUrl: 'https://example.com/certificates/business-communication-advanced.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['web-student13@example.com'].enrollmentId,
      userId: students['student13@example.com'].userId,
      courseId: courseBundles.webFoundations.course.courseId,
      serialNumber: `CERT-WEB-${enrollments['web-student13@example.com'].enrollmentId}`,
      issuedAt: daysAgo(20),
      pdfUrl: 'https://example.com/certificates/web-foundations-advanced.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['ielts-student14@example.com'].enrollmentId,
      userId: students['student14@example.com'].userId,
      courseId: courseBundles.ieltsMastery.course.courseId,
      serialNumber: `CERT-IELTS-${enrollments['ielts-student14@example.com'].enrollmentId}`,
      issuedAt: daysAgo(29),
      pdfUrl: 'https://example.com/certificates/ielts-mastery-advanced.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['conversation-student15@example.com'].enrollmentId,
      userId: students['student15@example.com'].userId,
      courseId: courseBundles.conversationConfidence.course.courseId,
      serialNumber: `CERT-CONV-${enrollments['conversation-student15@example.com'].enrollmentId}`,
      issuedAt: daysAgo(18),
      pdfUrl: 'https://example.com/certificates/conversation-confidence.pdf',
    },
  });
  await prisma.certificate.create({
    data: {
      enrollmentId: enrollments['pronunciation-student15@example.com'].enrollmentId,
      userId: students['student15@example.com'].userId,
      courseId: courseBundles.pronunciationClinic.course.courseId,
      serialNumber: `CERT-PRON-${enrollments['pronunciation-student15@example.com'].enrollmentId}`,
      issuedAt: daysAgo(14),
      pdfUrl: 'https://example.com/certificates/pronunciation-clinic-advanced.pdf',
    },
  });

  await createReview({
    courseId: courseBundles.webFoundations.course.courseId,
    userId: students['student3@example.com'].userId,
    rating: 5,
    comment: 'Great progression from beginner basics to practical project work.',
    createdAt: daysAgo(8),
  });
  await createReview({
    courseId: courseBundles.webFoundations.course.courseId,
    userId: students['student6@example.com'].userId,
    rating: 5,
    comment: 'The module milestones made it easy to stay motivated.',
    createdAt: daysAgo(3),
  });
  await createReview({
    courseId: courseBundles.grammarBasics.course.courseId,
    userId: students['student2@example.com'].userId,
    rating: 4,
    comment: 'Simple explanations and good practice for beginners.',
    createdAt: daysAgo(5),
  });
  await createReview({
    courseId: courseBundles.ieltsMastery.course.courseId,
    userId: students['student3@example.com'].userId,
    rating: 5,
    comment: 'Useful reading and listening checkpoints with clear passing goals.',
    createdAt: daysAgo(2),
  });
  await createReview({
    courseId: courseBundles.workplaceEmail.course.courseId,
    userId: students['student3@example.com'].userId,
    rating: 4,
    comment: 'Professional and practical examples for workplace communication.',
    createdAt: daysAgo(1),
  });
  console.log('  ✅ Certificates and reviews created\n');

  console.log('💸 Creating payout examples...');
  await recalculateInstructorWallets();
  await prisma.instructorPayout.create({
    data: {
      instructorId: instructors.lecturer1.userId,
      amount: 120000,
      status: 'processed',
      requestDate: daysAgo(12),
      processedDate: daysAgo(10),
    },
  });
  await prisma.instructorPayout.create({
    data: {
      instructorId: instructors.mentor3.userId,
      amount: 80000,
      status: 'requested',
      requestDate: daysAgo(2),
    },
  });
  console.log('  ✅ Payout data created\n');

  console.log('📊 Refreshing course aggregates...');
  for (const bundle of Object.values(courseBundles)) {
    await finalizeCourseAggregate(bundle.course.courseId);
  }
  console.log('  ✅ Aggregates refreshed\n');

  console.log('✨ Expanded seed completed!\n');
  console.log('📝 Core test accounts:');
  console.log('Admin: admin@example.com / password123');
  console.log('Instructors: lecturer@example.com, teacher2@example.com, mentor3@example.com, coach4@example.com / password123');
  console.log('Students: student@example.com ... student15@example.com / password123');
  console.log('');
  console.log('📌 Seed highlights:');
  console.log('- 4 instructors with profiles and wallets');
  console.log('- 15 students with dense cross-enrollments across the portfolio');
  console.log('- 9 courses across published / flagged / archived / in-progress states');
  console.log('- Multiple progress scenarios for instructor dashboard testing');
  console.log('- Paid orders, transactions, carts, reviews, and certificates');
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error('❌ Error seeding expanded data:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
