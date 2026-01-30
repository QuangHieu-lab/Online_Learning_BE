#!/usr/bin/env node

/**
 * Development script that resets database and seeds data before starting dev server
 * Set RESET_DB_ON_DEV=false in .env to disable auto-reset
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const RESET_DB_ON_DEV = process.env.RESET_DB_ON_DEV !== 'false';

if (!RESET_DB_ON_DEV) {
  console.log('⚠️  RESET_DB_ON_DEV is disabled. Skipping database reset.');
  console.log('🚀 Starting dev server...\n');
  try {
    execSync('node scripts/kill-port.js', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
  } catch (_) {}
  execSync('node --watch src/server.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  process.exit(0);
}

console.log('🔄 RESET_DB_ON_DEV is enabled. Resetting database...\n');

try {
  console.log('📦 Resetting database...');
  execSync('npx prisma migrate reset --force --skip-seed', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  console.log('\n📋 Running migrations...');
  try {
    execSync('npx prisma migrate dev --name init', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    });
  } catch (e) {
    console.log('  ℹ️  Migrations already up to date');
  }

  console.log('\n🌱 Seeding database...');
  execSync('node prisma/seed.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  console.log('\n✅ Database reset and seeded successfully!');
  console.log('🚀 Starting dev server...\n');

  try {
    execSync('node scripts/kill-port.js', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
  } catch (_) {}
  execSync('node --watch src/server.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('\n❌ Error during database reset:', error.message);
  process.exit(1);
}
