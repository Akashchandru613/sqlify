// src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// GET /student/courses
router.get('/courses', studentController.getAllCourses);

// POST /student/enroll
router.post('/enroll', studentController.enrollCourse);

// GET /student/modules?course_id=
router.get('/modules', studentController.getModulesForCourse);

// GET /student/quizzes?module_id=
router.get('/quizzes', studentController.getQuizzesForModule);

// POST /student/quiz/attempt
router.post('/quiz/attempt', studentController.attemptQuiz);

module.exports = router;
