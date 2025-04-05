// src/controllers/instructorController.js
const { Course, Module, Quiz, Question, Enrollment, Attempt, User } = require('../models');

exports.getInstructorCourses = async (req, res) => {
  try {
    const { instructor_id } = req.query;
    const courses = await Course.findAll({ where: { instructor_id } });
    return res.json(courses);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.postNewCourse = async (req, res) => {
  try {
    const { course_name, course_description, instructor_id } = req.body;
    await Course.create({
      name: course_name,
      description: course_description,
      instructor_id
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getModules = async (req, res) => {
  try {
    const { course_id } = req.query;
    const modules = await Module.findAll({ where: { course_id } });
    return res.json(modules);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.postNewModule = async (req, res) => {
  try {
    const { module_name, course_content, course_id } = req.body;
    await Module.create({
      name: module_name,
      content: course_content,
      course_id
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { module_id, module_name, course_content, course_id } = req.body;
    const mod = await Module.findByPk(module_id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }
    mod.name = module_name || mod.name;
    mod.content = course_content || mod.content;
    mod.course_id = course_id || mod.course_id;
    await mod.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const { module_id } = req.query;
    const quizzes = await Quiz.findAll({ where: { module_id } });
    return res.json(quizzes);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.postNewQuiz = async (req, res) => {
  try {
    const { quiz_name, course_id, module_id, difficulty, questions } = req.body;
    const newQuiz = await Quiz.create({
      name: quiz_name,
      course_id,
      module_id,
      difficulty
    });
    // Add questions
    if (Array.isArray(questions)) {
      for (const q of questions) {
        await Question.create({
          quiz_id: newQuiz.id,
          text: q.text,
          correct_answer: q.correct_answer
        });
      }
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentsInCourse = async (req, res) => {
  try {
    const { course_id } = req.query;
    const enrollments = await Enrollment.findAll({ where: { course_id } });
    const studentsData = [];
    for (const enr of enrollments) {
      const student = await User.findByPk(enr.student_id);
      if (student) {
        studentsData.push({
          id: student.id,
          username: student.username
        });
      }
    }
    return res.json(studentsData);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCourseProgress = async (req, res) => {
  try {
    const { course_id } = req.query;
    // find all quizzes for that course
    const quizzes = await Quiz.findAll({ where: { course_id } });
    const quizIds = quizzes.map(q => q.id);
    // find attempts for those quizzes
    const attempts = await Attempt.findAll({
      where: { quiz_id: quizIds }
    });
    return res.json(attempts);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
