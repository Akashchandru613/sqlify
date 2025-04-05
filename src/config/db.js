// src/config/db.js
const { Sequelize } = require('sequelize');

// For simplicity, using SQLite:
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'sql_learning_platform.db',
  logging: false
});

module.exports = sequelize;
