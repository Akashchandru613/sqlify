// src/config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// For simplicity, using SQLite:
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST, // e.g., 'localhost' or an IP address
  dialect: 'mysql',
  logging: false
});


module.exports = sequelize;
