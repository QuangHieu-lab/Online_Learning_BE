import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Sample questions for quizzes
const sampleQuestions10 = [
  {
    contentText: 'What is the capital of France?',
    questionAnswers: [
      { contentText: 'London', isCorrect: false, orderIndex: 0 },
      { contentText: 'Berlin', isCorrect: false, orderIndex: 1 },
      { contentText: 'Paris', isCorrect: true, orderIndex: 2 },
      { contentText: 'Madrid', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which programming language is used for web development?',
    questionAnswers: [
      { contentText: 'Python', isCorrect: false, orderIndex: 0 },
      { contentText: 'JavaScript', isCorrect: true, orderIndex: 1 },
      { contentText: 'C++', isCorrect: false, orderIndex: 2 },
      { contentText: 'Java', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What does HTML stand for?',
    questionAnswers: [
      { contentText: 'HyperText Markup Language', isCorrect: true, orderIndex: 0 },
      { contentText: 'High Tech Modern Language', isCorrect: false, orderIndex: 1 },
      { contentText: 'Home Tool Markup Language', isCorrect: false, orderIndex: 2 },
      { contentText: 'Hyperlink and Text Markup Language', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the result of 2 + 2?',
    questionAnswers: [
      { contentText: '3', isCorrect: false, orderIndex: 0 },
      { contentText: '4', isCorrect: true, orderIndex: 1 },
      { contentText: '5', isCorrect: false, orderIndex: 2 },
      { contentText: '6', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which of the following is a database management system?',
    questionAnswers: [
      { contentText: 'MySQL', isCorrect: true, orderIndex: 0 },
      { contentText: 'HTML', isCorrect: false, orderIndex: 1 },
      { contentText: 'CSS', isCorrect: false, orderIndex: 2 },
      { contentText: 'JavaScript', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the main purpose of CSS?',
    questionAnswers: [
      { contentText: 'To structure web pages', isCorrect: false, orderIndex: 0 },
      { contentText: 'To style web pages', isCorrect: true, orderIndex: 1 },
      { contentText: 'To add interactivity', isCorrect: false, orderIndex: 2 },
      { contentText: 'To store data', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which HTTP method is used to retrieve data?',
    questionAnswers: [
      { contentText: 'POST', isCorrect: false, orderIndex: 0 },
      { contentText: 'PUT', isCorrect: false, orderIndex: 1 },
      { contentText: 'GET', isCorrect: true, orderIndex: 2 },
      { contentText: 'DELETE', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is React?',
    questionAnswers: [
      { contentText: 'A database', isCorrect: false, orderIndex: 0 },
      { contentText: 'A JavaScript library for building user interfaces', isCorrect: true, orderIndex: 1 },
      { contentText: 'A programming language', isCorrect: false, orderIndex: 2 },
      { contentText: 'A web server', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What does API stand for?',
    questionAnswers: [
      { contentText: 'Application Programming Interface', isCorrect: true, orderIndex: 0 },
      { contentText: 'Advanced Programming Interface', isCorrect: false, orderIndex: 1 },
      { contentText: 'Application Program Integration', isCorrect: false, orderIndex: 2 },
      { contentText: 'Automated Programming Interface', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'Which of the following is a version control system?',
    questionAnswers: [
      { contentText: 'Git', isCorrect: true, orderIndex: 0 },
      { contentText: 'Java', isCorrect: false, orderIndex: 1 },
      { contentText: 'Python', isCorrect: false, orderIndex: 2 },
      { contentText: 'HTML', isCorrect: false, orderIndex: 3 },
    ],
  },
];

// IELTS-specific questions
const ieltsListeningQuestions = [
  {
    contentText: 'In IELTS Listening, how many sections are there?',
    questionAnswers: [
      { contentText: '2 sections', isCorrect: false, orderIndex: 0 },
      { contentText: '3 sections', isCorrect: false, orderIndex: 1 },
      { contentText: '4 sections', isCorrect: true, orderIndex: 2 },
      { contentText: '5 sections', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the best strategy for IELTS Listening?',
    questionAnswers: [
      { contentText: 'Read all questions before listening', isCorrect: true, orderIndex: 0 },
      { contentText: 'Listen first, then read questions', isCorrect: false, orderIndex: 1 },
      { contentText: 'Skip difficult questions', isCorrect: false, orderIndex: 2 },
      { contentText: 'Only focus on keywords', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'How long is the IELTS Listening test?',
    questionAnswers: [
      { contentText: '30 minutes', isCorrect: true, orderIndex: 0 },
      { contentText: '40 minutes', isCorrect: false, orderIndex: 1 },
      { contentText: '50 minutes', isCorrect: false, orderIndex: 2 },
      { contentText: '60 minutes', isCorrect: false, orderIndex: 3 },
    ],
  },
];

const ieltsReadingQuestions = [
  {
    contentText: 'How many passages are in IELTS Academic Reading?',
    questionAnswers: [
      { contentText: '2 passages', isCorrect: false, orderIndex: 0 },
      { contentText: '3 passages', isCorrect: true, orderIndex: 1 },
      { contentText: '4 passages', isCorrect: false, orderIndex: 2 },
      { contentText: '5 passages', isCorrect: false, orderIndex: 3 },
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
];

const ieltsWritingQuestions = [
  {
    contentText: 'How many tasks are in IELTS Writing test?',
    questionAnswers: [
      { contentText: '1 task', isCorrect: false, orderIndex: 0 },
      { contentText: '2 tasks', isCorrect: true, orderIndex: 1 },
      { contentText: '3 tasks', isCorrect: false, orderIndex: 2 },
      { contentText: '4 tasks', isCorrect: false, orderIndex: 3 },
    ],
  },
  {
    contentText: 'What is the minimum word count for Task 1?',
    questionAnswers: [
      { contentText: '100 words', isCorrect: false, orderIndex: 0 },
      { contentText: '150 words', isCorrect: true, orderIndex: 1 },
      { contentText: '200 words', isCorrect: false, orderIndex: 2 },
      { contentText: '250 words', isCorrect: false, orderIndex: 3 },
    ],
  },
];

// Helper function to create quiz with questions
async function createQuizWithQuestions(
  lessonId: number,
  title: string,
  timeLimitMinutes: number,
  passingScore: number,
  questions: any[]
) {
  const quiz = await prisma.quiz.create({
    data: {
      lessonId,
      title,
      timeLimitMinutes,
      passingScore,
    },
  });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await prisma.question.create({
      data: {
        quizId: quiz.quizId,
        contentText: q.contentText,
        type: 'single_choice',
        orderIndex: i,
        questionAnswers: {
          create: q.questionAnswers,
        },
      },
    });
  }

  return quiz;
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Step 1: Create roles
  console.log('📋 Creating roles...');
  const studentRole = await prisma.role.upsert({
    where: { roleName: 'student' },
    update: {},
    create: {
      roleName: 'student',
      description: 'Học viên',
    },
  });

  const instructorRole = await prisma.role.upsert({
    where: { roleName: 'instructor' },
    update: {},
    create: {
      roleName: 'instructor',
      description: 'Giảng viên',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { roleName: 'admin' },
    update: {},
    create: {
      roleName: 'admin',
      description: 'Quản trị viên',
    },
  });
  console.log('✅ Roles created\n');

  // Step 2: Create users with user_roles
  console.log('👥 Creating users...');
  
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      currentLevel: 'C2',
      userRoles: {
        create: {
          roleId: adminRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Admin:', admin.email);

  // Instructor users
  const lecturer1 = await prisma.user.upsert({
    where: { email: 'lecturer@example.com' },
    update: {},
    create: {
      email: 'lecturer@example.com',
      passwordHash: hashedPassword,
      fullName: 'Nguyễn Văn Giảng',
      currentLevel: 'C2',
      userRoles: {
        create: {
          roleId: instructorRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Instructor 1:', lecturer1.email);

  const lecturer2 = await prisma.user.upsert({
    where: { email: 'teacher2@example.com' },
    update: {},
    create: {
      email: 'teacher2@example.com',
      passwordHash: hashedPassword,
      fullName: 'Trần Thị Hương',
      currentLevel: 'C1',
      userRoles: {
        create: {
          roleId: instructorRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Instructor 2:', lecturer2.email);

  // Student users
  const student1 = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      passwordHash: hashedPassword,
      fullName: 'Lê Văn Học',
      currentLevel: 'A1',
      userRoles: {
        create: {
          roleId: studentRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Student 1:', student1.email);

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {},
    create: {
      email: 'student2@example.com',
      passwordHash: hashedPassword,
      fullName: 'Phạm Thị Mai',
      currentLevel: 'B1',
      userRoles: {
        create: {
          roleId: studentRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Student 2:', student2.email);

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@example.com' },
    update: {},
    create: {
      email: 'student3@example.com',
      passwordHash: hashedPassword,
      fullName: 'Hoàng Văn Nam',
      currentLevel: 'A2',
      userRoles: {
        create: {
          roleId: studentRole.roleId,
        },
      },
    },
  });
  console.log('  ✅ Student 3:', student3.email);
  console.log('');

  // Step 3: Create FREE courses
  console.log('📚 Creating FREE courses...');
  
  const freeCourse1 = await prisma.course.create({
    data: {
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development including HTML, CSS, JavaScript, and modern frameworks. Perfect for beginners who want to start their journey in web development.',
      price: 0,
      instructorId: lecturer1.userId,
      category: 'Communication',
      levelTarget: 'A1',
      status: 'published',
      modules: {
        create: [
          {
            title: 'Module 1: HTML Fundamentals',
            description: 'Learn the basics of HTML structure and tags',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: 'Introduction to HTML',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'HTML is the foundation of web development. Learn about tags, elements, and structure.',
                },
                {
                  title: 'HTML Forms and Input',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Create interactive forms with various input types.',
                },
              ],
            },
          },
          {
            title: 'Module 2: CSS Styling',
            description: 'Master CSS to style your web pages',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: 'CSS Basics',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Learn about selectors, properties, and values.',
                },
                {
                  title: 'CSS Layouts',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Flexbox and Grid for modern layouts.',
                },
              ],
            },
          },
          {
            title: 'Module 3: JavaScript Basics',
            description: 'Add interactivity with JavaScript',
            orderIndex: 2,
            lessons: {
              create: [
                {
                  title: 'JavaScript Fundamentals',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Variables, functions, and control structures.',
                },
                {
                  title: 'DOM Manipulation',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Interact with HTML elements using JavaScript.',
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('  ✅ FREE Course 1:', freeCourse1.title);

  const freeCourse2 = await prisma.course.create({
    data: {
      title: 'English Grammar Basics',
      description: 'Master the fundamentals of English grammar. Perfect for beginners who want to build a strong foundation.',
      price: 0,
      instructorId: lecturer2.userId,
      category: 'Grammar',
      levelTarget: 'A0',
      status: 'published',
      modules: {
        create: [
          {
            title: 'Module 1: Parts of Speech',
            description: 'Learn about nouns, verbs, adjectives, and more',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: 'Nouns and Pronouns',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Understanding nouns and how to use pronouns correctly.',
                },
                {
                  title: 'Verbs and Tenses',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Master verb forms and basic tenses.',
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('  ✅ FREE Course 2:', freeCourse2.title);
  console.log('');

  // Step 4: Create PAID courses
  console.log('💰 Creating PAID courses...');
  
  const paidCourse1 = await prisma.course.create({
    data: {
      title: 'Advanced English Course - IELTS Preparation',
      description: 'Comprehensive IELTS preparation course with practice tests, expert guidance, and personalized feedback. Perfect for students aiming for band 7.0+ in IELTS exam.',
      price: 500000,
      instructorId: lecturer1.userId,
      category: 'IELTS',
      levelTarget: 'B2',
      status: 'published',
      modules: {
        create: [
          {
            title: 'Module 1: IELTS Listening',
            description: 'Master IELTS Listening skills',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: 'IELTS Listening Fundamentals',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Learn the structure and strategies for IELTS Listening test.',
                },
                {
                  title: 'Practice Test 1',
                  type: 'quiz',
                  orderIndex: 2,
                  contentText: 'Complete a full IELTS Listening practice test.',
                },
              ],
            },
          },
          {
            title: 'Module 2: IELTS Reading',
            description: 'IELTS Reading strategies',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: 'IELTS Reading Strategies',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Learn how to read efficiently and answer questions accurately.',
                },
                {
                  title: 'Practice Test 2',
                  type: 'quiz',
                  orderIndex: 2,
                  contentText: 'Complete a full IELTS Reading practice test.',
                },
              ],
            },
          },
          {
            title: 'Module 3: IELTS Writing',
            description: 'IELTS Writing Task 1 & 2',
            orderIndex: 2,
            lessons: {
              create: [
                {
                  title: 'IELTS Writing Task 1 & 2',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Master both writing tasks with detailed examples.',
                },
                {
                  title: 'Writing Practice',
                  type: 'assignment',
                  orderIndex: 2,
                  contentText: 'Submit your writing for expert feedback.',
                },
              ],
            },
          },
          {
            title: 'Module 4: IELTS Speaking',
            description: 'IELTS Speaking Practice',
            orderIndex: 3,
            lessons: {
              create: [
                {
                  title: 'IELTS Speaking Practice',
                  type: 'assignment',
                  orderIndex: 1,
                  contentText: 'Practice speaking with AI tutor and get feedback.',
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('  ✅ PAID Course 1:', paidCourse1.title, `(${paidCourse1.price.toLocaleString('vi-VN')} VND)`);

  const paidCourse2 = await prisma.course.create({
    data: {
      title: 'TOEIC Preparation Course',
      description: 'Complete TOEIC preparation course covering all sections. Achieve your target score with our comprehensive study materials.',
      price: 300000,
      instructorId: lecturer2.userId,
      category: 'TOEIC',
      levelTarget: 'B1',
      status: 'published',
      modules: {
        create: [
          {
            title: 'Module 1: Listening Comprehension',
            description: 'Master TOEIC Listening section',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: 'Part 1: Photos',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Learn strategies for photo description questions.',
                },
                {
                  title: 'Part 2: Question-Response',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Master question-response patterns.',
                },
              ],
            },
          },
          {
            title: 'Module 2: Reading Comprehension',
            description: 'TOEIC Reading strategies',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: 'Part 5: Incomplete Sentences',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Grammar and vocabulary for sentence completion.',
                },
                {
                  title: 'Part 6: Text Completion',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Reading comprehension and context clues.',
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('  ✅ PAID Course 2:', paidCourse2.title, `(${paidCourse2.price.toLocaleString('vi-VN')} VND)`);

  const paidCourse3 = await prisma.course.create({
    data: {
      title: 'Business English Communication',
      description: 'Professional English communication skills for the workplace. Learn to write emails, conduct meetings, and present effectively.',
      price: 400000,
      instructorId: lecturer1.userId,
      category: 'Business',
      levelTarget: 'B2',
      status: 'published',
      modules: {
        create: [
          {
            title: 'Module 1: Business Writing',
            description: 'Professional email and report writing',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: 'Email Etiquette',
                  type: 'video',
                  orderIndex: 1,
                  contentText: 'Learn how to write professional emails.',
                },
                {
                  title: 'Business Reports',
                  type: 'video',
                  orderIndex: 2,
                  contentText: 'Structure and write effective business reports.',
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('  ✅ PAID Course 3:', paidCourse3.title, `(${paidCourse3.price.toLocaleString('vi-VN')} VND)`);
  console.log('');

  // Step 5: Create quizzes for lessons
  console.log('📝 Creating quizzes...');
  
  // Get all lessons from free course 1
  const freeCourse1Modules = await prisma.module.findMany({
    where: { courseId: freeCourse1.courseId },
    include: { lessons: true },
  });
  const freeCourse1Lessons = freeCourse1Modules.flatMap(m => m.lessons);

  // Create quiz for first lesson of free course 1
  if (freeCourse1Lessons.length > 0) {
    const quiz1 = await createQuizWithQuestions(
      freeCourse1Lessons[0].lessonId,
      'HTML Basics Quiz',
      10,
      70,
      sampleQuestions10.slice(0, 5)
    );
    console.log('  ✅ Quiz:', quiz1.title, `(${5} questions)`);
  }

  // Get lessons from paid course 1 (IELTS)
  const paidCourse1Modules = await prisma.module.findMany({
    where: { courseId: paidCourse1.courseId },
    include: { lessons: true },
  });
  const paidCourse1Lessons = paidCourse1Modules.flatMap(m => m.lessons);

  // Create quizzes for IELTS course
  if (paidCourse1Lessons.length >= 2) {
    const ieltsQuiz1 = await createQuizWithQuestions(
      paidCourse1Lessons[1].lessonId, // Practice Test 1
      'IELTS Listening Practice Quiz',
      30,
      70,
      ieltsListeningQuestions
    );
    console.log('  ✅ Quiz:', ieltsQuiz1.title, `(${ieltsListeningQuestions.length} questions)`);

    if (paidCourse1Lessons.length >= 4) {
      const ieltsQuiz2 = await createQuizWithQuestions(
        paidCourse1Lessons[3].lessonId, // Practice Test 2
        'IELTS Reading Comprehension Quiz',
        60,
        70,
        ieltsReadingQuestions
      );
      console.log('  ✅ Quiz:', ieltsQuiz2.title, `(${ieltsReadingQuestions.length} questions)`);
    }
  }

  // Step 6: Create some enrollments
  console.log('\n📖 Creating enrollments...');
  
  // Student 1 enrolls in free course 1
  await prisma.enrollment.create({
    data: {
      userId: student1.userId,
      courseId: freeCourse1.courseId,
      status: 'active',
    },
  });
  console.log('  ✅ Student 1 enrolled in:', freeCourse1.title);

  // Student 2 enrolls in free course 2
  await prisma.enrollment.create({
    data: {
      userId: student2.userId,
      courseId: freeCourse2.courseId,
      status: 'active',
    },
  });
  console.log('  ✅ Student 2 enrolled in:', freeCourse2.title);

  console.log('\n✨ Seeding completed!\n');
  console.log('📝 Test Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Email: admin@example.com');
  console.log('  Password: password123');
  console.log('');
  console.log('Instructors:');
  console.log('  Email: lecturer@example.com / Password: password123');
  console.log('  Email: teacher2@example.com / Password: password123');
  console.log('');
  console.log('Students:');
  console.log('  Email: student@example.com / Password: password123');
  console.log('  Email: student2@example.com / Password: password123');
  console.log('  Email: student3@example.com / Password: password123');
  console.log('');
  console.log('📚 Sample Courses:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FREE Courses:');
  console.log(`  1. ${freeCourse1.title}`);
  console.log(`  2. ${freeCourse2.title}`);
  console.log('');
  console.log('PAID Courses:');
  console.log(`  1. ${paidCourse1.title} - ${paidCourse1.price.toLocaleString('vi-VN')} VND`);
  console.log(`  2. ${paidCourse2.title} - ${paidCourse2.price.toLocaleString('vi-VN')} VND`);
  console.log(`  3. ${paidCourse3.title} - ${paidCourse3.price.toLocaleString('vi-VN')} VND`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
