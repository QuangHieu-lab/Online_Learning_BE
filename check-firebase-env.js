const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load existing .env if exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('🔍 Checking Firebase environment variables...\n');

const requiredVars = {
  'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
  'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY,
  'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
  'FIREBASE_STORAGE_BUCKET': process.env.FIREBASE_STORAGE_BUCKET,
};

let allPresent = true;

for (const [key, value] of Object.entries(requiredVars)) {
  if (value) {
    console.log(`✅ ${key}: ${key === 'FIREBASE_PRIVATE_KEY' ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    allPresent = false;
  }
}

console.log('\n');

if (!allPresent) {
  console.log('⚠️  Some Firebase environment variables are missing!');
  console.log('\n📝 To fix this, add these to your backend/.env file:\n');
  
  // Try to read from JSON file
  const jsonPath = path.join(__dirname, '..', 'e-learning-4f0e7-firebase-adminsdk-fbsvc-699a11e62c.json');
  if (fs.existsSync(jsonPath)) {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('Copy these values from your Firebase JSON file:\n');
    console.log(`FIREBASE_PROJECT_ID=${jsonData.project_id}`);
    console.log(`FIREBASE_CLIENT_EMAIL=${jsonData.client_email}`);
    console.log(`FIREBASE_STORAGE_BUCKET=e-learning-4f0e7.firebasestorage.app`);
    console.log(`FIREBASE_PRIVATE_KEY="${jsonData.private_key}"`);
    console.log('\n⚠️  Note: Keep the quotes around FIREBASE_PRIVATE_KEY!');
  } else {
    console.log('Please add the Firebase configuration to your .env file.');
    console.log('See backend/SETUP_ENV.md for instructions.');
  }
} else {
  console.log('✅ All Firebase environment variables are set!');
}
