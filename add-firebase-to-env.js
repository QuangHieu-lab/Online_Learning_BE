const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const jsonPath = path.join(__dirname, '..', 'credentials', 'firebase-service-account.json');

console.log('📝 Adding Firebase environment variables to backend/.env...\n');

// Read JSON file
if (!fs.existsSync(jsonPath)) {
  console.error('❌ Firebase JSON file not found:', jsonPath);
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Prepare environment variables
const firebaseVars = {
  FIREBASE_PROJECT_ID: jsonData.project_id,
  FIREBASE_CLIENT_EMAIL: jsonData.client_email,
  FIREBASE_STORAGE_BUCKET: 'e-learning-4f0e7.firebasestorage.app',
  FIREBASE_PRIVATE_KEY: jsonData.private_key.replace(/\n/g, '\\n'),
};

// Read existing .env file or create empty string
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Check which variables are missing
const missingVars = [];
for (const [key, value] of Object.entries(firebaseVars)) {
  if (!envContent.includes(`${key}=`)) {
    missingVars.push({ key, value });
  } else {
    console.log(`✅ ${key} already exists`);
  }
}

// Add missing variables
if (missingVars.length > 0) {
  console.log('\n➕ Adding missing variables:\n');
  
  // Add newline if file doesn't end with one
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  
  // Add Firebase section header if not present
  if (!envContent.includes('# Firebase Configuration')) {
    envContent += '\n# Firebase Configuration\n';
  }
  
  // Add each missing variable
  for (const { key, value } of missingVars) {
    if (key === 'FIREBASE_PRIVATE_KEY') {
      // Private key needs to be wrapped in quotes
      envContent += `${key}="${value}"\n`;
    } else {
      envContent += `${key}=${value}\n`;
    }
    console.log(`✅ Added ${key}`);
  }
  
  // Write to file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✅ Successfully updated backend/.env file!');
} else {
  console.log('\n✅ All Firebase variables are already present in .env file!');
}
