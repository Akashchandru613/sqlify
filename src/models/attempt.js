// src/models/attempt.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attempt = sequelize.define('Attempt', {
  responses: {
    type: DataTypes.TEXT, // store answers as string or JSON
    allowNull: true
  }
});

module.exports = Attempt;
