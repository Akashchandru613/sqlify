// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// PUT /profile/instructor
router.put('/instructor', profileController.updateInstructorProfile);

module.exports = router;
