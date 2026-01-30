#!/usr/bin/env node

/**
 * Development script that resets database and seeds data before starting dev server
 * Set RESET_DB_ON_DEV=false in .env to disable auto-reset
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const RESET_DB_ON_DEV = process.env.RESET_DB_ON_DEV !== 'false';
// NODE_WATCH=true enables hot reload; default off to avoid 502 during Google login
const NODE_WATCH = process.env.NODE_WATCH === 'true';
const nodeCmd = NODE_WATCH ? 'node --watch src/server.js' : 'node src/server.js';

if (!RESET_DB_ON_DEV) {
  console.log('⚠️  RESET_DB_ON_DEV is disabled. Skipping database reset.');
  console.log('🚀 Starting dev server...\n');
  execSync(nodeCmd, { stdio: 'inherit' });
  process.exit(0);
}

console.log('🔄 RESET_DB_ON_DEV is enabled. Resetting database...\n');

try {
  // Step 1: Reset database (this will drop all data and automatically run seed)
  console.log('📦 Resetting database...');
  execSync('npx prisma migrate reset --force --skip-seed', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  // Step 2: Run migrations (if needed)
  console.log('\n📋 Running migrations...');
  try {
    execSync('npx prisma migrate dev --name init', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
  } catch (e) {
    // Migration might already exist, that's okay
    console.log('  ℹ️  Migrations already up to date');
  }

  // Step 3: Seed database
  console.log('\n🌱 Seeding database...');
  execSync('node prisma/seed.js', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n✅ Database reset and seeded successfully!');
  console.log('🚀 Starting dev server...\n');

  // Step 4: Start dev server (NODE_WATCH=false avoids 502 during Google login)
  execSync(nodeCmd, { stdio: 'inherit' });
} catch (error) {
  console.error('\n❌ Error during database reset:', error.message);
  process.exit(1);
}
