// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /auth/login?username=&password=
router.get('/login', authController.login);

// POST /auth/signup
router.post('/signup', authController.signup);

module.exports = router;
