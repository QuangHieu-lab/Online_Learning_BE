// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth'); // Import Routes

const app = express();

// Middleware cơ bản
app.use(cors());
app.use(express.json()); // Để đọc được JSON từ body request

// Định nghĩa Routes
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('BeeEnglish Backend is running...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});