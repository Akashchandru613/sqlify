// src/routes/instructorRoutes.js
const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructorController');

// GET /instructor/courses?instructor_id=
router.get('/courses', instructorController.getInstructorCourses);

// POST /instructor/course
router.post('/course', instructorController.postNewCourse);

// GET /instructor/modules?course_id=
router.get('/modules', instructorController.getModules);

// POST /instructor/module
router.post('/module', instructorController.postNewModule);

// PUT /instructor/module
router.put('/module', instructorController.updateModule);

// GET /instructor/quizzes?module_id=
router.get('/quizzes', instructorController.getQuizzes);

// POST /instructor/quiz
router.post('/quiz', instructorController.postNewQuiz);

// GET /instructor/students?course_id=
router.get('/students', instructorController.getStudentsInCourse);

// GET /instructor/progress?course_id=
router.get('/progress', instructorController.getCourseProgress);

module.exports = router;
