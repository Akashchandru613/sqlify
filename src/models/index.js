// src/models/index.js
const User = require('./user');
const Course = require('./course');
const Module = require('./module');
const Quiz = require('./quiz');
const Question = require('./question');
const Enrollment = require('./enrollment');
const Attempt = require('./attempt');

// 1) User <-> Course (instructor relationship)
User.hasMany(Course, { foreignKey: 'instructor_id' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// 2) Course <-> Module
Course.hasMany(Module, { foreignKey: 'course_id' });
Module.belongsTo(Course, { foreignKey: 'course_id' });

// 3) Course <-> Quiz (some quizzes might be linked directly to course + module)
Course.hasMany(Quiz, { foreignKey: 'course_id' });
Quiz.belongsTo(Course, { foreignKey: 'course_id' });

// 4) Module <-> Quiz
Module.hasMany(Quiz, { foreignKey: 'module_id' });
Quiz.belongsTo(Module, { foreignKey: 'module_id' });

// 5) Quiz <-> Question
Quiz.hasMany(Question, { foreignKey: 'quiz_id' });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// 6) User (student) <-> Course (Enrollment)
User.hasMany(Enrollment, { foreignKey: 'student_id' });
Enrollment.belongsTo(User, { foreignKey: 'student_id' });

Course.hasMany(Enrollment, { foreignKey: 'course_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });

// 7) Attempt <-> Quiz <-> Student
User.hasMany(Attempt, { foreignKey: 'student_id' });
Attempt.belongsTo(User, { foreignKey: 'student_id' });

Quiz.hasMany(Attempt, { foreignKey: 'quiz_id' });
Attempt.belongsTo(Quiz, { foreignKey: 'quiz_id' });

module.exports = {
  User,
  Course,
  Module,
  Quiz,
  Question,
  Enrollment,
  Attempt
};
