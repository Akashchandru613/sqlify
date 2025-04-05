// src/controllers/chatController.js
const { Configuration, OpenAIApi } = require('openai');
const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE'
});
const openai = new OpenAIApi(configuration);

exports.chat = async (req, res) => {
  try {
    const { question_text } = req.body;
    if (!question_text) {
      return res.status(400).json({ success: false, message: 'No question provided' });
    }

    // Build prompt for ChatGPT
    const prompt = `
Generate a SQL query based on the following question for our learning platform database schema:
${question_text}

The schema has these tables:
User, Course, Module, Quiz, Question, Enrollment, Attempt
Each with relevant columns. Return only the SQL query (no explanation).
    `;

    // Call OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0
    });

    const generatedSql = completion.data.choices[0].message.content.trim();

    // Try executing the generated SQL query
    try {
      const result = await sequelize.query(generatedSql, { type: QueryTypes.SELECT });
      return res.json({
        success: true,
        generated_sql: generatedSql,
        result
      });
    } catch (sqlError) {
      return res.status(500).json({
        success: false,
        generated_sql: generatedSql,
        error: sqlError.message
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
