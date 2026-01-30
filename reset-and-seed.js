/**
 * Script to reset database and seed fresh data
 * Run: node reset-and-seed.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Resetting database and seeding fresh data...\n');

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Step 1: Generating Prisma Client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('✅ Prisma Client generated\n');

  // Step 2: Reset database (drops all data and reruns migrations)
  console.log('🗑️  Step 2: Resetting database (this will delete all data)...');
  execSync('npx prisma migrate reset --force', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('✅ Database reset complete\n');

  // Step 3: Seed database
  console.log('🌱 Step 3: Seeding database...');
  execSync('npm run prisma:seed', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('✅ Database seeded successfully\n');

  console.log('✨ Database reset and seed completed!');
  console.log('\n📝 Test accounts:');
  console.log('   Admin: admin@example.com / password123');
  console.log('   Lecturer: lecturer@example.com / password123');
  console.log('   Student: student@example.com / password123');
  console.log('   Paid Student: paidstudent@example.com / password123');
  console.log('\n💳 Test Payment:');
  console.log('   Course: Advanced English Course - IELTS Preparation (500,000 VND)');
  console.log('   Login as: student@example.com');
  console.log('   Enroll in the paid course to test payment flow\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
