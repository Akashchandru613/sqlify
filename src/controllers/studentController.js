// src/controllers/studentController.js
const { Course, Module, Quiz, Enrollment, Attempt } = require('../models');

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll();
    return res.json(courses);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.enrollCourse = async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    // check if already enrolled
    const existing = await Enrollment.findOne({ where: { student_id, course_id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }
    await Enrollment.create({ student_id, course_id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getModulesForCourse = async (req, res) => {
  try {
    const { course_id } = req.query;
    const modules = await Module.findAll({ where: { course_id } });
    return res.json(modules);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getQuizzesForModule = async (req, res) => {
  try {
    const { module_id } = req.query;
    const quizzes = await Quiz.findAll({ where: { module_id } });
    return res.json(quizzes);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.attemptQuiz = async (req, res) => {
  try {
    const { student_id, quiz_id, responses } = req.body;
    // store the attempt
    await Attempt.create({
      student_id,
      quiz_id,
      responses: JSON.stringify(responses) // store as JSON string
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
