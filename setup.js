const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('🚀 Online Learning Platform - Database Setup\n');
  console.log('This script will help you setup the database.\n');

  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('File .env already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Please provide MySQL connection details:\n');

  const dbUser = await question('MySQL Username (default: root): ') || 'root';
  const dbPassword = await question('MySQL Password: ');
  const dbHost = await question('MySQL Host (default: localhost): ') || 'localhost';
  const dbPort = await question('MySQL Port (default: 3306): ') || '3306';
  const dbName = await question('Database Name (default: online_learning): ') || 'online_learning';

  const jwtSecret = await question('\n🔐 JWT Secret (press Enter for random): ') || 
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const geminiKey = await question('🤖 Gemini API Key (optional, press Enter to skip): ') || '';

  // Create .env file
  const envContent = `# Database Connection
DATABASE_URL="mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"

# JWT Secret Key
JWT_SECRET="${jwtSecret}"

# Gemini AI API Key
GEMINI_API_KEY="${geminiKey}"

# Server Port
PORT=5000

# Environment
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
`;

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Created .env file');

  // Create database SQL script
  const sqlScript = `-- Create Database
CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE \`${dbName}\`;

-- Note: Tables will be created by Prisma migrations
`;

  const sqlPath = path.join(__dirname, 'create_database.sql');
  fs.writeFileSync(sqlPath, sqlScript);
  console.log('✅ Created create_database.sql file');

  console.log('\n📋 Next steps:');
  console.log('1. Run this SQL script in MySQL to create the database:');
  console.log(`   mysql -u ${dbUser} -p < create_database.sql`);
  console.log('   OR open MySQL Workbench and run the SQL script');
  console.log('\n2. Then run these commands:');
  console.log('   npm install');
  console.log('   npm run prisma:generate');
  console.log('   npm run prisma:migrate');
  console.log('\n✨ Setup complete!');

  rl.close();
}

setup().catch(console.error);
