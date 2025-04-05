// server.js - Consolidated Node.js backend for SQL learning platform

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Import required packages
import express from 'express';
import { Sequelize, DataTypes, QueryTypes } from 'sequelize';
import OpenAI from 'openai';
// import { use } from './src/routes/authRoutes';

// Initialize the OpenAI client using the API key from the environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Express app
const app = express();
app.use(express.json());  // for parsing JSON request bodies

// Initialize Sequelize with SQLite database (update this config for MySQL if needed)
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Database name
  process.env.DB_USER,      // Username
  process.env.DB_PASSWORD,  // Password
  {
    host: process.env.DB_HOST, // e.g., 'localhost' or an IP address
    dialect: 'mysql',
    logging: false,
  }
);



// Sync all models with the database (create tables if not exist)
sequelize.sync()
  .then(() => console.log("Database synced"))
  .catch(err => console.error("Database sync error:", err));

// ----------------- ROUTES -----------------

// Authentication Routes

// Login route: verify username and password
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await sequelize.query(
      "SELECT * FROM User WHERE name = ? AND password = ?",
      { replacements: [username, password], type: QueryTypes.SELECT }
    );
    console.log(user, "UserDetails")
    if (user.length === 0) {
      console.log("Inside !user")
      const insertUser = await sequelize.query(
        "Insert into User (name, email, password, role) values (?,?,?,?)",
        { replacements: [req.name,req.email,req.password,req.role], type : QueryTypes.INSERT}
      )
      console.log(insertUser, "Insert Response")
    };
    console.log("Outside !user")
    return res.json({ success: true, userId: user[0].uid, role: user[0].role, userName : user[0].name });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// Signup route: create a new user (instructor or student)
app.post('/signup', async (req, res) => {
  const { username, password, identity } = req.body;  // identity must be 'instructor' or 'student'
  try {
    if (!username || !password || !identity) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (!['instructor', 'student'].includes(identity)) {
      return res.status(400).json({ success: false, message: "Identity must be 'instructor' or 'student'" });
    }
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.json({ success: false, message: "Username already taken" });
    }
    const newUser = await User.create({ username, password, role: identity });
    return res.json({ success: true, userId: newUser.id, role: newUser.role });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error during signup" });
  }
});

// Instructor Routes

// Get all courses for an instructor
app.get('/instructor/courses', async (req, res) => {
  const { instructorId } = req.query;
  try {
    const courses = await Course.findAll({ where: { instructorId } });
    return res.json(courses);
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
    const instructor = await User.findByPk(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(400).json({ success: false, message: "Invalid instructorId" });
    }
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
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }
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
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(400).json({ success: false, message: "Module not found" });
    }
    const quiz = await Quiz.create({ name, difficulty: difficulty || 1, moduleId });
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
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: [{ model: User, attributes: ['id', 'username', 'role', 'institution', 'certification', 'yoe'] }]
    });
    const students = enrollments
      .filter(enr => enr.User && enr.User.role === 'student')
      .map(enr => ({
        id: enr.User.id,
        username: enr.User.username
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
    const progressList = attempts
      .filter(att => att.Question && att.Question.Quiz && att.Question.Quiz.Module)
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

// Student Routes

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
    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }
    const existingEnroll = await Enrollment.findOne({ where: { userId: studentId, courseId } });
    if (existingEnroll) {
      return res.json({ success: false, message: "Student already enrolled in this course" });
    }
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }
    await Enrollment.create({ userId: studentId, courseId });
    return res.json({ success: true });
  } catch (error) {
    console.error("Enrollment error:", error);
    return res.status(500).json({ success: false, message: "Failed to enroll in course" });
  }
});

// Get all modules of a course (student view)
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

// Attempt a quiz (submit answers)
app.post('/student/attempt', async (req, res) => {
  const { studentId, answers } = req.body;
  try {
    if (!studentId || !answers) {
      return res.status(400).json({ success: false, message: "studentId and answers are required" });
    }
    const student = await User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }
    for (let ans of answers) {
      const { questionId, answer } = ans;
      if (!questionId) continue;
      const question = await Question.findByPk(questionId);
      if (!question) continue;
      const isCorrect = question.correctAnswer === answer;
      await Attempt.create({ userId: studentId, questionId, answer, correct: isCorrect });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Quiz attempt error:", error);
    return res.status(500).json({ success: false, message: "Failed to record quiz attempt" });
  }
});

// Instructor Profile Route

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

// ChatGPT SQL Query Route

app.post('/chat', async (req, res) => {
  const { question } = req.body;
  try {
    if (!question) {
      return res.status(400).json({ success: false, message: "Question text is required" });
    }
    // Use the new OpenAI SDK v4 method for chat completions
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: "You are a helpful assistant that only outputs SQL queries without explanation." },
        { role: 'user', content: `Convert the following question to an SQL query:\n"${question}"` }
      ]
    });
    const sqlQuery = completion.choices[0].message.content.trim();
    console.log("Generated SQL query:", sqlQuery);
    let queryResult;
    if (sqlQuery.toLowerCase().startsWith('select')) {
      queryResult = await sequelize.query(sqlQuery, { type: QueryTypes.SELECT });
    } else {
      const [result, metadata] = await sequelize.query(sqlQuery);
      if (metadata && typeof metadata.changes !== 'undefined') {
        queryResult = `${metadata.changes} rows affected.`;
      } else if (metadata && typeof metadata.rowCount !== 'undefined') {
        queryResult = `${metadata.rowCount} rows affected.`;
      } else {
        queryResult = result;
      }
    }
    return res.json({ success: true, query: sqlQuery, result: queryResult });
  } catch (error) {
    console.error("ChatGPT query error:", error);
    return res.status(500).json({ success: false, message: "Failed to process query", error: error.message });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
