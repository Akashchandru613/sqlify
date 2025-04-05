// src/models/enrollment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
  // This table just holds references to student_id and course_id
});

module.exports = Enrollment;
