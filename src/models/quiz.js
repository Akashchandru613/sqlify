// src/models/quiz.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Quiz = sequelize.define('Quiz', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  difficulty: {
    type: DataTypes.INTEGER, // 1-5
    allowNull: true
  }
});

module.exports = Quiz;
