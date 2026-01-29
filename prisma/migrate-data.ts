/**
 * Data Migration Script
 * 
 * This script migrates data from the old schema (String IDs) to the new schema (Int IDs)
 * 
 * IMPORTANT: Before running this script:
 * 1. Backup your database
 * 2. Run `npx prisma migrate dev` to create the new schema
 * 3. Ensure the old database is still accessible
 * 4. Run this script: `npx ts-node backend/prisma/migrate-data.ts`
 * 
 * This script assumes:
 * - Old database uses String IDs (cuid)
 * - New database uses Int IDs (autoincrement)
 * - Both databases are accessible via the same DATABASE_URL
 */

import { PrismaClient as OldPrismaClient } from '@prisma/client';
import { PrismaClient } from './generated/client'; // New Prisma client after migration
import bcrypt from 'bcrypt';

// Note: This script needs to be run AFTER the new schema is created
// You'll need to temporarily have both Prisma clients available
// For now, we'll use a single Prisma client and assume we're migrating in-place

const prisma = new PrismaClient();

// Mapping tables to track old String IDs -> new Int IDs
const idMaps = {
  users: new Map<string, number>(),
  courses: new Map<string, number>(),
  lessons: new Map<string, number>(),
  modules: new Map<string, number>(),
  quizzes: new Map<string, number>(),
  questions: new Map<string, number>(),
  answers: new Map<string, number>(),
  enrollments: new Map<string, number>(),
  payments: new Map<string, number>(),
};

async function migrateRoles() {
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

  console.log('✅ Roles created');
  return { studentRole, instructorRole, adminRole };
}

async function migrateUsers(roles: { studentRole: any; instructorRole: any; adminRole: any }) {
  console.log('👥 Migrating users...');

  // Get old users - we'll need to query the old database directly
  // For now, assuming we can access old data via raw SQL or by keeping old Prisma client
  // This is a simplified version - in practice, you'd need to connect to both databases

  // Since we're doing an in-place migration, we'll need to:
  // 1. Export old data first
  // 2. Drop old tables
  // 3. Create new tables
  // 4. Import data with new IDs

  // For now, this is a template - actual implementation depends on your migration strategy
  console.log('⚠️  User migration requires manual data export/import');
  console.log('   Steps:');
  console.log('   1. Export all users from old schema');
  console.log('   2. Create users in new schema with Int IDs');
  console.log('   3. Map old user IDs to new user IDs');
  console.log('   4. Create user_roles entries based on old User.role field');
}

async function migrateCourses() {
  console.log('📚 Migrating courses...');
  console.log('⚠️  Course migration requires:');
  console.log('   1. Create courses with new Int IDs');
  console.log('   2. Create default module for each course');
  console.log('   3. Map old course IDs to new course IDs');
}

async function migrateLessons() {
  console.log('📖 Migrating lessons...');
  console.log('⚠️  Lesson migration requires:');
  console.log('   1. Create modules for each course');
  console.log('   2. Move lessons from course_id to module_id');
  console.log('   3. Map old lesson IDs to new lesson IDs');
}

async function migrateQuizzes() {
  console.log('📝 Migrating quizzes...');
  console.log('⚠️  Quiz migration requires:');
  console.log('   1. Update quiz.lessonId to use new Int IDs');
  console.log('   2. Map old quiz IDs to new quiz IDs');
}

async function migrateQuestionsAndAnswers() {
  console.log('❓ Migrating questions and answers...');
  console.log('⚠️  Question/Answer migration requires:');
  console.log('   1. Update question.quizId to use new Int IDs');
  console.log('   2. Rename Answer model to QuestionAnswer');
  console.log('   3. Map old question/answer IDs to new IDs');
}

async function migrateEnrollments() {
  console.log('🎓 Migrating enrollments...');
  console.log('⚠️  Enrollment migration requires:');
  console.log('   1. Update enrollment.userId and courseId to new Int IDs');
  console.log('   2. Link enrollment to order_id (from Payment migration)');
  console.log('   3. Add progress_percent, status, expiry_date fields');
}

async function migratePayments() {
  console.log('💳 Migrating payments to orders...');
  console.log('⚠️  Payment migration requires:');
  console.log('   1. Create Order from Payment');
  console.log('   2. Create OrderDetail for each course');
  console.log('   3. Create Transaction with VNPay fields');
  console.log('   4. Link Enrollment to Order');
}

async function migrateProgress() {
  console.log('📊 Migrating progress...');
  console.log('⚠️  Progress migration requires:');
  console.log('   1. Rename Progress to LearningProgress');
  console.log('   2. Change from userId+lessonId to enrollmentId+lessonId');
  console.log('   3. Update status field to enum');
}

async function migrateSubmissions() {
  console.log('📋 Migrating submissions to quiz attempts...');
  console.log('⚠️  Submission migration requires:');
  console.log('   1. Rename Submission to QuizAttempt');
  console.log('   2. Change from userId to enrollmentId');
  console.log('   3. Rename SubmissionAnswer to QuizAttemptAnswer');
}

async function main() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Step 1: Create roles
    const roles = await migrateRoles();

    // Step 2: Migrate users (requires manual export/import)
    await migrateUsers(roles);

    // Step 3: Migrate courses
    await migrateCourses();

    // Step 4: Migrate lessons
    await migrateLessons();

    // Step 5: Migrate quizzes
    await migrateQuizzes();

    // Step 6: Migrate questions and answers
    await migrateQuestionsAndAnswers();

    // Step 7: Migrate enrollments
    await migrateEnrollments();

    // Step 8: Migrate payments
    await migratePayments();

    // Step 9: Migrate progress
    await migrateProgress();

    // Step 10: Migrate submissions
    await migrateSubmissions();

    console.log('\n✅ Migration script structure created');
    console.log('⚠️  NOTE: This is a template script.');
    console.log('   You need to implement the actual data migration logic based on your setup.');
    console.log('   Consider using a tool like pg_dump/pg_restore or writing custom SQL queries.');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    });
}

export { main as migrateData };
