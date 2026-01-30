// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// http://localhost:3000/api/auth/login
router.post('/login', authController.login);

// http://localhost:3000/api/auth/google
router.post('/google', authController.googleLogin);

// http://localhost:3000/api/auth/logout
router.post('/logout', authController.logout);

router.post('/register', authController.register);

module.exports = router;