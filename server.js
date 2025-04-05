// server.js - Consolidated Node.js backend for SQL learning platform

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');  // optional if using express.json
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(express.json());  // for parsing JSON request bodies

// Initialize Sequelize with SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',  // database file
  logging: false               // disable logging SQL queries (optional)
});

// Define Sequelize models and their fields
const User = sequelize.define('User', {
  username:    { type: DataTypes.STRING, allowNull: false, unique: true },
  password:    { type: DataTypes.STRING, allowNull: false },  // store hashed in real app
  role:        { type: DataTypes.ENUM('instructor', 'student'), allowNull: false },
  institution: { type: DataTypes.STRING },   // for instructors: institution name
  certification:{type: DataTypes.STRING },   // for instructors: certification
  yoe:         { type: DataTypes.INTEGER }   // for instructors: years of experience
});

const Course = sequelize.define('Course', {
  name:        { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  instructorId:{ type: DataTypes.INTEGER, allowNull: false }  // foreign key to User (instructor)
});

const Module = sequelize.define('Module', {
  title:       { type: DataTypes.STRING, allowNull: false },
  content:     { type: DataTypes.TEXT },
  courseId:    { type: DataTypes.INTEGER, allowNull: false }  // foreign key to Course
});

const Quiz = sequelize.define('Quiz', {
  name:        { type: DataTypes.STRING, allowNull: false },
  difficulty:  { type: DataTypes.INTEGER },  // 1-5 difficulty level
  moduleId:    { type: DataTypes.INTEGER, allowNull: false }  // foreign key to Module
});

const Question = sequelize.define('Question', {
  text:         { type: DataTypes.TEXT, allowNull: false },
  correctAnswer:{ type: DataTypes.TEXT, allowNull: false },
  quizId:       { type: DataTypes.INTEGER, allowNull: false }  // foreign key to Quiz
});

const Enrollment = sequelize.define('Enrollment', {
  // This model links Users (students) to Courses
  userId:   { type: DataTypes.INTEGER, allowNull: false },
  courseId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [{ unique: true, fields: ['userId', 'courseId'] }]  // prevent duplicate enrollment
});

const Attempt = sequelize.define('Attempt', {
  // This model records quiz attempts (answers to questions by students)
  answer:     { type: DataTypes.TEXT },      // answer given by student
  correct:    { type: DataTypes.BOOLEAN },   // whether the answer was correct
  userId:     { type: DataTypes.INTEGER, allowNull: false },
  questionId: { type: DataTypes.INTEGER, allowNull: false }
});

// Define model relationships (associations)
// User (Instructor) <-> Course
User.hasMany(Course, { as: 'Courses', foreignKey: 'instructorId' });
Course.belongsTo(User, { as: 'Instructor', foreignKey: 'instructorId' });

// Course <-> Module
Course.hasMany(Module, { foreignKey: 'courseId' });
Module.belongsTo(Course, { foreignKey: 'courseId' });

// Module <-> Quiz
Module.hasMany(Quiz, { foreignKey: 'moduleId' });
Quiz.belongsTo(Module, { foreignKey: 'moduleId' });

// Quiz <-> Question
Quiz.hasMany(Question, { foreignKey: 'quizId' });
Question.belongsTo(Quiz, { foreignKey: 'quizId' });

// User (Student) <-> Course through Enrollment
User.hasMany(Enrollment, { foreignKey: 'userId' });
Course.hasMany(Enrollment, { foreignKey: 'courseId' });
Enrollment.belongsTo(User,   { foreignKey: 'userId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });

// User (Student) <-> Question through Attempt
User.hasMany(Attempt, { foreignKey: 'userId' });
Question.hasMany(Attempt, { foreignKey: 'questionId' });
Attempt.belongsTo(User,    { foreignKey: 'userId' });
Attempt.belongsTo(Question,{ foreignKey: 'questionId' });

// Sync all models with the database (create tables if not exist)
sequelize.sync().then(() => {
  console.log("Database synced");
}).catch(err => {
  console.error("Database sync error:", err);
});

// Configure OpenAI API (ChatGPT integration)
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY  // ensure to set your OpenAI API key in environment
});
const openai = new OpenAIApi(openaiConfig);

// Routes

// ** Authentication Routes **

// Login route: verify username and password
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username, password } });
    if (!user) {
      return res.json({ success: false, message: "Invalid username or password" });
    }
    // Login successful
    return res.json({ success: true, userId: user.id, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// Signup route: create a new user (instructor or student)
app.post('/signup', async (req, res) => {
  const { username, password, identity } = req.body;  // identity is 'instructor' or 'student'
  try {
    if (!username || !password || !identity) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (!['instructor', 'student'].includes(identity)) {
      return res.status(400).json({ success: false, message: "Identity must be 'instructor' or 'student'" });
    }
    // Check if username already exists
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.json({ success: false, message: "Username already taken" });
    }
    // Create new user
    const newUser = await User.create({ username, password, role: identity });
    return res.json({ success: true, userId: newUser.id, role: newUser.role });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error during signup" });
  }
});

// ** Instructor Routes ** (for instructor functionalities)

// Get all courses for an instructor
app.get('/instructor/courses', async (req, res) => {
  const { instructorId } = req.query;
  try {
    const courses = await Course.findAll({ where: { instructorId } });
    return res.json(courses);  // return list of courses (empty list if none)
  } catch (error) {
    console.error("Fetch courses error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve courses" });
  }
});

// Create a new course (instructor)
app.post('/instructor/courses', async (req, res) => {
  const { name, description, instructorId } = req.body;
  try {
    if (!name || !instructorId) {
      return res.status(400).json({ success: false, message: "Course name and instructorId are required" });
    }
    // Optionally, verify that instructorId corresponds to an instructor user
    const instructor = await User.findByPk(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }
    // Create course
    await Course.create({ name, description: description || '', instructorId });
    return res.json({ success: true });
  } catch (error) {
    console.error("Create course error:", error);
    return res.status(500).json({ success: false, message: "Failed to create course" });
  }
});

// Get all modules for a course (instructor view)
app.get('/instructor/modules', async (req, res) => {
  const { courseId } = req.query;
  try {
    const modules = await Module.findAll({ where: { courseId } });
    return res.json(modules);
  } catch (error) {
    console.error("Fetch modules error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve modules" });
  }
});

// Create a new module under a course
app.post('/instructor/modules', async (req, res) => {
  const { title, content, courseId } = req.body;
  try {
    if (!title || !courseId) {
      return res.status(400).json({ success: false, message: "Module title and courseId are required" });
    }
    // Ensure course exists (and perhaps instructor owns it, but skip owner check here)
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }
    await Module.create({ title, content: content || '', courseId });
    return res.json({ success: true });
  } catch (error) {
    console.error("Create module error:", error);
    return res.status(500).json({ success: false, message: "Failed to create module" });
  }
});

// Update a module's details
app.put('/instructor/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const { title, content, courseId } = req.body;
  try {
    // Find the module
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }
    // (Optional: verify the instructor owns the course of this module)
    // Update fields if provided
    if (title !== undefined) module.title = title;
    if (content !== undefined) module.content = content;
    if (courseId !== undefined) module.courseId = courseId;
    await module.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Update module error:", error);
    return res.status(500).json({ success: false, message: "Failed to update module" });
  }
});

// Get all quizzes for a module
app.get('/instructor/quizzes', async (req, res) => {
  const { moduleId } = req.query;
  try {
    const quizzes = await Quiz.findAll({ where: { moduleId } });
    return res.json(quizzes);
  } catch (error) {
    console.error("Fetch quizzes error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve quizzes" });
  }
});

// Create a new quiz (with questions) under a module
app.post('/instructor/quizzes', async (req, res) => {
  const { name, difficulty, moduleId, questions } = req.body;
  try {
    if (!name || !moduleId || !questions) {
      return res.status(400).json({ success: false, message: "Quiz name, moduleId and questions are required" });
    }
    // Ensure module exists
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(400).json({ success: false, message: "Module not found" });
    }
    // Create quiz
    const quiz = await Quiz.create({ name, difficulty: difficulty || 1, moduleId });
    // Create questions (assuming questions is an array of {text, correctAnswer})
    for (let q of questions) {
      if (q.text && q.correctAnswer) {
        await Question.create({ text: q.text, correctAnswer: q.correctAnswer, quizId: quiz.id });
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Create quiz error:", error);
    return res.status(500).json({ success: false, message: "Failed to create quiz" });
  }
});

// Get all students enrolled in a specific course
app.get('/instructor/students', async (req, res) => {
  const { courseId } = req.query;
  try {
    // Find all enrollments for the course and include the User (student) details
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: [{ model: User, attributes: ['id', 'username', 'role', 'institution', 'certification', 'yoe'] }]
    });
    // Map to just student info (filter only students)
    const students = enrollments
      .filter(enr => enr.User && enr.User.role === 'student')
      .map(enr => ({
        id: enr.User.id,
        username: enr.User.username,
        // (In case any instructor accidentally enrolled, we filtered above)
      }));
    return res.json(students);
  } catch (error) {
    console.error("Fetch students error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve students" });
  }
});

// Get all quiz attempts (progress) for a course
app.get('/instructor/progress', async (req, res) => {
  const { courseId } = req.query;
  try {
    // Find all attempts where the question belongs to quizzes of modules of this course
    const attempts = await Attempt.findAll({
      include: [
        { 
          model: Question, 
          attributes: ['id', 'text', 'correctAnswer'], 
          include: [
            { 
              model: Quiz, 
              attributes: ['id', 'name'], 
              include: [
                { model: Module, attributes: ['id'], where: { courseId } }
              ] 
            }
          ] 
        },
        { model: User, attributes: ['id', 'username'] }
      ]
    });
    // Filter out attempts that didn't match (if any) and format the output
    const progressList = attempts
      .filter(att => att.Question && att.Question.Quiz && att.Question.Quiz.Module)  // ensure the attempt is for the specified course
      .map(att => ({
        studentId: att.User.id,
        studentUsername: att.User.username,
        questionId: att.Question.id,
        questionText: att.Question.text,
        correctAnswer: att.Question.correctAnswer,
        givenAnswer: att.answer,
        correct: att.correct,
        quizName: att.Question.Quiz.name
      }));
    return res.json(progressList);
  } catch (error) {
    console.error("Fetch progress error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve progress" });
  }
});

// ** Student Routes ** (for student functionalities)

// Get all courses (for students to view/enroll)
app.get('/student/courses', async (req, res) => {
  try {
    const courses = await Course.findAll();
    return res.json(courses);
  } catch (error) {
    console.error("Fetch all courses error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve courses" });
  }
});

// Enroll in a course (student enrollment)
app.post('/student/enroll', async (req, res) => {
  const { studentId, courseId } = req.body;
  try {
    if (!studentId || !courseId) {
      return res.status(400).json({ success: false, message: "studentId and courseId are required" });
    }
    // Optionally verify the user is a student
    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }
    // Check if already enrolled
    const existingEnroll = await Enrollment.findOne({ where: { userId: studentId, courseId } });
    if (existingEnroll) {
      return res.json({ success: false, message: "Student already enrolled in this course" });
    }
    // Check course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }
    // Create enrollment
    await Enrollment.create({ userId: studentId, courseId });
    return res.json({ success: true });
  } catch (error) {
    console.error("Enrollment error:", error);
    return res.status(500).json({ success: false, message: "Failed to enroll in course" });
  }
});

// Get all modules of a course (student view) – same as instructor route
app.get('/student/modules', async (req, res) => {
  const { courseId } = req.query;
  try {
    const modules = await Module.findAll({ where: { courseId } });
    return res.json(modules);
  } catch (error) {
    console.error("Fetch modules error (student):", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve modules" });
  }
});

// Get all quizzes of a module (student view)
app.get('/student/quizzes', async (req, res) => {
  const { moduleId } = req.query;
  try {
    const quizzes = await Quiz.findAll({ where: { moduleId } });
    return res.json(quizzes);
  } catch (error) {
    console.error("Fetch quizzes error (student):", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve quizzes" });
  }
});

// Attempt a quiz (submit answers to quiz questions)
app.post('/student/attempt', async (req, res) => {
  // Expecting req.body to contain: studentId, answers (array of { questionId, answer })
  const { studentId, answers } = req.body;
  try {
    if (!studentId || !answers) {
      return res.status(400).json({ success: false, message: "studentId and answers are required" });
    }
    // Optionally verify student exists and role
    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }
    // Iterate over answers array and record each attempt
    for (let ans of answers) {
      const { questionId, answer } = ans;
      if (!questionId) continue;
      // Find question to check correctness
      const question = await Question.findByPk(questionId);
      if (!question) continue;  // skip if question not found (shouldn't happen normally)
      const isCorrect = question.correctAnswer === answer;
      // Record attempt
      await Attempt.create({ userId: studentId, questionId, answer, correct: isCorrect });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Quiz attempt error:", error);
    return res.status(500).json({ success: false, message: "Failed to record quiz attempt" });
  }
});

// ** Profile Route (Instructor) **

// Update instructor profile (institution, certification, yoe)
app.put('/instructor/profile', async (req, res) => {
  const { instructorId, institution, certification, yoe } = req.body;
  try {
    if (!instructorId) {
      return res.status(400).json({ success: false, message: "instructorId is required" });
    }
    const instructor = await User.findByPk(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ success: false, message: "Instructor not found" });
    }
    // Update only the provided fields
    if (institution !== undefined) instructor.institution = institution;
    if (certification !== undefined) instructor.certification = certification;
    if (yoe !== undefined) instructor.yoe = yoe;
    await instructor.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// ** ChatGPT SQL Query Route **

// Send a question to ChatGPT to generate and execute an SQL query
app.post('/chat', async (req, res) => {
  const { question } = req.body;
  try {
    if (!question) {
      return res.status(400).json({ success: false, message: "Question text is required" });
    }
    // Use OpenAI API to get an SQL query for the question
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: "You are a helpful assistant that only outputs SQL queries without explanation." },
        { role: 'user', content: `Convert the following question to an SQL query:\n"${question}"` }
      ]
    });
    const sqlQuery = completion.data.choices[0].message.content.trim();
    console.log("Generated SQL query:", sqlQuery);
    // Execute the generated SQL query on the SQLite database
    let queryResult;
    if (sqlQuery.toLowerCase().startsWith('select')) {
      // For SELECT queries, use QueryTypes.SELECT to get results directly
      queryResult = await sequelize.query(sqlQuery, { type: QueryTypes.SELECT });
    } else {
      // For non-SELECT queries, execute and return info (like number of affected rows)
      const [result, metadata] = await sequelize.query(sqlQuery);
      if (metadata && typeof metadata.changes !== 'undefined') {
        queryResult = `${metadata.changes} rows affected.`;
      } else if (metadata && typeof metadata.rowCount !== 'undefined') {
        queryResult = `${metadata.rowCount} rows affected.`;
      } else {
        queryResult = result;  // could be undefined or some result for other queries
      }
    }
    return res.json({ success: true, query: sqlQuery, result: queryResult });
  } catch (error) {
    console.error("ChatGPT query error:", error);
    return res.status(500).json({ success: false, message: "Failed to process query", error: error.message });
  }
});

// Global error handling middleware (catch any unhandled errors)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
