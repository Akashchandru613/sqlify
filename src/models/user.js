// src/models/user.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  identity: {
    type: DataTypes.STRING,
    allowNull: false // 'instructor' or 'student'
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true
  },
  certification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  yoe: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = User;
