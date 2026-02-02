const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config();

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId) {
      console.warn('⚠️  FIREBASE_PROJECT_ID is not set. Firebase features will be disabled.');
    } else if (!privateKey) {
      console.warn('⚠️  FIREBASE_PRIVATE_KEY is not set. Firebase features will be disabled.');
    } else if (!clientEmail) {
      console.warn('⚠️  FIREBASE_CLIENT_EMAIL is not set. Firebase features will be disabled.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail: clientEmail,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  }
}

const getStorageBucket = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK is not initialized. Please check your .env file.');
  }
  return getStorage().bucket();
};

const verifyFirebaseToken = async (idToken) => {
  try {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK is not initialized');
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
};

const getFirebaseUser = async (uid) => {
  try {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK is not initialized');
    }
    const user = await admin.auth().getUser(uid);
    return user;
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    throw error;
  }
};

const createCustomToken = async (uid, additionalClaims) => {
  try {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK is not initialized');
    }
    const token = await admin.auth().createCustomToken(uid, additionalClaims);
    return token;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
};

const { sendEmail, sendLoginNotification } = require('./email.service');

module.exports = {
  getStorageBucket,
  verifyFirebaseToken,
  getFirebaseUser,
  createCustomToken,
  sendEmail,
  sendLoginNotification,
};
module.exports.default = admin;
