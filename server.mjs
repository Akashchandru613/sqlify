// server.js - Consolidated Node.js backend for SQL learning platform

// Load environment variables from .env file
import dotenv from 'dotenv';
import cors from 'cors';



// Import required packages
import express from 'express';
import { Sequelize, QueryTypes } from 'sequelize';
import OpenAI from 'openai';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
// import { use } from './src/routes/authRoutes';

// Initialize the OpenAI client using the API key from the environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



// Initialize Sequelize with SQLite database (update this config for MySQL if needed)
const pool = new Sequelize(
  process.env.DB_NAME,      // Database name
  process.env.DB_USER,      // Username
  process.env.DB_PASSWORD,  // Password
  {
    host: process.env.DB_HOST, // e.g., 'localhost' or an IP address
    dialect: 'mysql',
    logging: false,
  }
);


// ----------------- ROUTES -----------------

// Authentication Routes



// Login route: verify username and password
app.get('/login/:email/:password', async (req, res) => {
  // Extract the email and password from the route parameters
  const { email, password } = req.params;

  try {
    console.log("Path params:", req.params);

    // Use parameterized query to prevent SQL injection
    const [users] = await pool.query(
      `SELECT * FROM users WHERE email = "${email}" AND password = "${password}"`);

    console.log(users, "UserDetails");

    if (users.length === 0) {
      return res.json({ success: false, message: "No data found" });
    }

    const user = users[0];
    console.log("user response", user);

    return res.json({
      success: true,
      userName: user.name,
      userId: user.uid,
      role: user.role
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
});



// Signup route: create a new user (instructor or student)
app.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!['Instructor', 'Student'].includes(role)) {
    return res.status(400).json({ success: false, message: "Role must be 'Instructor' or 'Student'" });
  }

  try {
    // Check if name OR email already exists
// check for existing user
const qry =  `SELECT 1 FROM users WHERE name = "${name}" OR email = "${email}" LIMIT 1`

console.log("The queryy",qry);
const [existing] = await pool.query(qry);
if (existing.length) {
  return res
    .status(400)
    .json({ success: false, message: 'usersname/Email already taken' });
}

// insert new user
const [result] = await pool.query(
  ` INSERT INTO users (name, email, password, role) VALUES ("${name}", "${email}", "${password}", "${role}")`);


    return res.json({
      success: true,
      userId: result.insertId,
      role
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});


// Instructor Routes

// Get all courses for an instructor
app.get('/instructor/:instructorId/courses', async (req, res) => {
  const { instructorId } = req.params;

  try {
    // Join Course with users to get instructor name
    const [rows] = await pool.query(
      `SELECT c.id AS courseId, c.name AS courseName,c.description  AS courseDescription,u.name AS instructorName FROM Course c JOIN users u ON c.instructor_id = u.uid WHERE c.instructor_id = ${instructorId}`);

    return res.json({ success: true, courses: rows });
  } catch (err) {
    console.error('Error fetching courses:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Create a new course (instructor)
app.post('/instructor/courses', async (req, res) => {
  const { name, description, instructorId } = req.body;

  // 1) Validate inputs
  if (!name || !instructorId) {
    return res.status(400).json({
      success: false,
      message: 'Course name and instructorId are required'
    });
  }

  try {
    // 2) Verify instructorId belongs to an Instructor
    const [users] = await pool.query(
      `SELECT role FROM users WHERE uid = ${instructorId} LIMIT 1`,);

    if (users.length === 0 || users[0].role !== 'Instructor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructorId'
      });
    }

    // 3) Insert new course
    console.log(name,description,instructorId)
    const [result] = await pool.query(
      `INSERT INTO Course (name, description, instructor_id) VALUES ("${name}", "${description?description:''}", "${instructorId}")`);

    // 4) Respond with success (and new course ID if needed)
    return res.json({
      success: true,
      courseId: result.insertId
    });
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course'
    });
  }
});

// Get all modules for a course (instructor view)
app.post('/instructor/modules', async (req, res) => {
  console.log("Requestttt",req)
  const { courseId } = req.body;
  try {
    const modules = await pool.query(`select m.id,m.title,m.content_link from Module m inner join Course c on c.id = m.course_id where m.course_id = ${courseId}`);
    console.log(modules)
    return res.json(modules);
  } catch (error) {
    console.error("Fetch modules error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve modules" });
  }
});


// 2) Create a new module under a course (Instructor only)

app.post('/instructor/courses/:courseId/modules', async (req, res) => {
  // from your auth middleware
  const { courseId } = req.params;
  const { title, contentLink } = req.body;

  // 1) Validate
  if (!title || !contentLink) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: title, contentLink'
    });
  }

  try {
  
    // 3) Insert the new module
    const [result] = await pool.query(
      `INSERT INTO Module (course_id, title, content_link) VALUES (${courseId}, "${title}", "${contentLink}")`);

    // 4) Return the created module
    const newModule = {
      id: result.id,
      title,
      contentLink
    };
    return res.status(201).json({
      success: true,
      module: newModule
    });
  } catch (err) {
    console.error('Error creating module:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error creating module'
    });
  }
});



// Update a module's details
app.put('/instructor/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const { instructorId, title, contentLink, courseId: newCourseId } = req.body;

  if (!instructorId) {
    return res.status(400).json({ success: false, message: 'Missing instructorId' });
  }

  try {
    // 1) Fetch the module
    const [[moduleRow]] = await pool.query(
      `SELECT * FROM Module WHERE id = ${moduleId}`);

    if (!moduleRow) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const currentCourseId = moduleRow.course_id;

    // 2) Verify instructor owns current course
    const [[currentCourse]] = await pool.query(
      `SELECT instructor_id FROM Course WHERE id = ${currentCourseId}`);

    if (!currentCourse || currentCourse.instructor_id !== instructorId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this module' });
    }

    // 3) If changing course, verify ownership of new course
    if (newCourseId !== undefined && newCourseId !== currentCourseId) {
      const [[newCourse]] = await pool.query(`SELECT instructor_id FROM Course WHERE id = ${newCourseId}`);

      if (!newCourse || newCourse.instructor_id !== instructorId) {
        return res.status(403).json({ success: false, message: 'Not authorized to assign module to this course' });
      }
    }

    // 4) Build dynamic UPDATE
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (contentLink !== undefined) {
      fields.push('content_link = ?');
      values.push(contentLink);
    }
    if (newCourseId !== undefined) {
      fields.push('course_id = ?');
      values.push(newCourseId);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(moduleId); // for WHERE clause

    const sql = `UPDATE Module SET "${fields.join(', ')}" WHERE id = ?`;

    await pool.query(sql, values);

    return res.json({ success: true, message: 'Module updated' });
  } catch (err) {
    console.error('Update module error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating module' });
  }
});


app.post('/instructor/newquizzes', async (req, res) => {
  console.log('hitting this route valid')
  const { instructorId, moduleId, title, difficultyLevel, questions, quizId } = req.body;

  // 1) Validate input
  
  if (!instructorId || !moduleId || !title || !questions ) {
    return res.status(400).json({
      success: false,
      message: 'Required: instructorId, moduleId, title, questions[]'+instructorId + moduleId + title + questions
    });
  }

  try {
    // 2) Verify instructor owns the course for this module
    console.log('verifying')
    const [[moduleRow]] = await pool.query(
      `SELECT c.instructor_id FROM Module m JOIN Course c ON m.course_id = c.id WHERE m.id = ${moduleId}`);

    if (!moduleRow || moduleRow.instructor_id !== instructorId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let effectiveQuizId = quizId;
// console.log('if quiz id')
//     if (quizId) {
//       // ——— UPDATE FLOW ———
//       // 3a) Update the quiz record
//       console.log('update')
//       await pool.query(
//         `UPDATE QuizSET title = ${title}, difficulty_level = ${difficultyLevel?difficultyLevel:1}, module_id = ${moduleId} WHERE id = ${quizId}`);
//         console.log('remove')
//       // 3b) Remove old questions
//       await pool.query(
//         `DELETE FROM Question WHERE quiz_id = ${quizId}`);

//     } else {
      // ——— CREATE FLOW ———
      console.log('else')
      const [quizResult] = await pool.query(
        `INSERT INTO Quiz (title, difficulty_level, module_id)VALUES ("${title}", ${difficultyLevel?difficultyLevel:1}, ${moduleId})`);
      effectiveQuizId = quizResult;
    // }

    // 4) Insert questions for this quiz
  
      for (let i = 0; i < questions.length;i++){
        const response = await pool.query(`INSERT INTO Question (id, quizId, text,difficulty, correctAnswer) VALUES ("${10*effectiveQuizId + i}","${effectiveQuizId}","${questions[i].text}",${difficultyLevel},"${questions[i].correctAnswer}")`);
      }
    
    return res.json({
      success: true,
      quizId: effectiveQuizId,
      message: quizId ? 'Quiz updated' : 'Quiz created'
    });

  } catch (err) {
    console.error('Create/Update quiz error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all students enrolled in a specific course
app.get('/instructor/students', async (req, res) => {
  try {
    // Fetch all students who have at least one enrollment
    const [students] = await pool.query(
      `SELECT u.uid, u.name, u.email, u.role, u.institution, u.certification, u.yoe FROM users AS u JOIN Enrollment AS e ON u.uid = e.student_id WHERE u.role = 'Student' GROUP BY u.uid`);


    return res.json({ success: true, students });
  } catch (err) {
    console.error('Fetch students error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve students'
    });
  }
});

// Get all quiz attempts (progress) for a course
app.post('/instructor/progress', async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) {
    return res.status(400).json({ success: false, message: 'Missing required query parameter: courseId' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.id AS attemptId, a.userId AS studentId, u.name AS studentUsername, a.questionId AS questionId, q.text AS questionText, q.correctAnswer AS correctAnswer, a.answer AS givenAnswer, a.correct AS correct, z.title AS quizTitle FROM Attempt a JOIN users u ON a.userId = u.uid JOIN Question q ON a.questionId = q.id JOIN Quiz z ON q.quizId = z.id JOIN Module m ON z.module_id = m.id WHERE m.course_id = ${courseId} ORDER BY a.id`);

    return res.json({ success: true, progress: rows });
  } catch (err) {
    console.error('Fetch progress error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve progress' });
  }
});

// Student Routes

// Get all courses (for students to view/enroll)
// GET /student/courses
// Returns all courses for students to view/enroll

app.get('/student/courses', async (req, res) => {
  try {
    // Fetch all courses
    const [courses] = await pool.query(
      `SELECT id, name, description, instructor_id AS instructorId FROM Course`);

    return res.json({ success: true, courses });
  } catch (err) {
    console.error('Fetch all courses error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses'
    });
  }
});


// Enroll in a course (student enrollment)
// POST /student/enroll
// Enroll a student in a course, recording date & status

app.post('/student/enroll', async (req, res) => {
  const { studentId, courseId } = req.body;

  // 1) Validate input
  if (!studentId || !courseId) {
    return res.status(400).json({
      success: false,
      message: 'studentId and courseId are required'
    });
  }

  try {
    // 2) Verify student exists and is a 'Student'
    const [userRows] = await pool.query(
      `SELECT role FROM users WHERE uid = ${studentId} LIMIT 1`);

    if (userRows.length === 0 || userRows[0].role !== 'Student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid studentId'
      });
    }

    // 3) Check duplicate enrollment
    const [enrollRows] = await pool.query(
      `SELECT 1 FROM Enrollment WHERE student_id = ${studentId} AND course_id = ${courseId} LIMIT 1`);

    if (enrollRows.length > 0) {
      return res.json({
        success: false,
        message: 'Student already enrolled in this course'
      });
    }

    // 4) Verify course exists
    const [courseRows] = await pool.query(
      `SELECT 1 FROM Course WHERE id = ${courseId} LIMIT 1`);

    if (courseRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course not found'
      });
    }

    // 5) Insert enrollment with date & status
    const [result] = await pool.query(
      `INSERT INTO Enrollment (student_id, course_id, enrollment_date, status) VALUES (${studentId}, ${courseId}, NOW(), 'Active')`);

    return res.json({
      success: true,
      enrollmentId: result.insertId,
      enrollmentDate: new Date().toISOString(), // mirror NOW()
      status: 'Active'
    });
  } catch (err) {
    console.error('Enrollment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    });
  }
});

// acquire all the course enrolled by a student

app.post('/student/enrolled', async (req, res) => {
  
  console.log("REQ BODY >>>", req.body); 
  const { studentId } = req.body;


  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Missing studentId' });
  }

  try {
    const courses = await pool.query(`
      SELECT c.id, c.name, c.description
      FROM Course c
      JOIN Enrollment e ON c.id = e.course_id
      WHERE e.student_id = ?
    `, {
      replacements: [studentId],
      type: QueryTypes.SELECT
    });
    console.log("Database query result:", courses);
    

    return res.json({ 
      success: true, 
      courses });
  } catch (err) {
    console.error('Fetch enrolled courses error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});



// Get all modules of a course (student view)
// GET /student/modules?courseId=123
// Returns all modules for a given course (student view)
app.post('/instructor/modules', async (req, res) => {
  console.log("Requestttt",req)
  const { courseId } = req.body;
  try {
    const modules = await pool.query(`select m.id,m.title,m.content_link from Module m inner join Course c on c.id = m.course_id where m.course_id = ${courseId}`);
    console.log("Moduless",modules)
    return res.json(modules);
  } catch (error) {
    console.error("Fetch modules error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve modules" });
  }
});



app.post('/student/quizzes', async (req, res) => {
  const { moduleId } = req.body;

  try {
    // 
    if (moduleId === "all" || moduleId === "any") {
      const [quizzes] = await pool.query(
        `SELECT id, title, module_id AS moduleId, difficulty_level AS difficultyLevel FROM Quiz`);
      return res.json({ success: true, quizzes });
    }
    
    
    if (!moduleId || isNaN(parseInt(moduleId))) {
      return res.status(400).json({ success: false, message: 'Invalid moduleId' });
    }

    
    const [quizzes] = await pool.query(
      `SELECT id, title, module_id AS moduleId, difficulty_level AS difficultyLevel FROM Quiz WHERE module_id = ${moduleId}`, 
    );

    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Fetch quizzes error (student):', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve quizzes' });
  }
});

// Get all quizzes for a module
app.post('/instructor/quizzes', async (req, res) => {
  const { moduleId } = req.body;
  if (!moduleId) {
    return res.status(400).json({ success: false, message: 'Missing required query parameter: moduleId' });
  }

  try {
    const [quizzes] = await pool.query(
      `SELECT id, title, module_id AS moduleId, difficulty_level AS difficultyLevel FROM Quiz WHERE module_id = ${moduleId}`);
console.log(quizzes)
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Fetch quizzes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve quizzes' });
  }
});

app.post('/instructor/quiz-questions', async (req, res) => {
  const { quizId } = req.body;
  if (!quizId) {
    return res.status(400).json({ success: false, message: '缺少必要的参数: quizId' });
  }

  try {
    
    const [questions] = await pool.query(
      `SELECT id, quizId AS quizId, text, correctAnswer AS correctAnswer FROM Question WHERE quizId = ${quizId}`);

    return res.json({ success: true, questions });
  } catch (err) {
    console.error('error:', err);
    return res.status(500).json({ success: false, message: 'dail to get the message' });
  }
});

// Get all quizzes of a module (student view)
// GET /student/quizzes?moduleId=123
// Returns all quizzes for a given module (student view)

app.post('/student/quizzes', async (req, res) => {
  const { moduleId } = req.body;

  // 1) Validate input
  if (!moduleId) {
    return res.status(400).json({ success: false, message: 'Missing required query parameter: moduleId' });
  }

  try {
    // 2) Fetch quizzes for that module
    const [quizzes] = await pool.query(
      `SELECT id, title, module_id AS moduleId, difficulty_level AS difficultyLevel FROM Quiz WHERE module_id = ${moduleId}`);

    // 3) Return the result
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Fetch quizzes error (student):', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve quizzes' });
  }
});


// Attempt a quiz (submit answers)
// POST /student/attempt
// Record a student’s quiz answers in the Attempt table

app.post('/student/attempt', async (req, res) => {
  const { studentId, answers } = req.body;

  // 1) Validate input
  if (!studentId || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'studentId and answers[] are required'
    });
  }

  try {
    // 2) Verify student exists and is a Student
    const [userRows] = await pool.query(
      `SELECT role FROM users WHERE uid = ${studentId} LIMIT 1`);
    if (userRows.length === 0 || userRows[0].role !== 'Student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid studentId'
      });
    }

    // 3) For each answer, check question and insert attempt
    for (const ans of answers) {
      const { questionId, answer } = ans;
      if (!questionId) continue;

      // 3a) Fetch the correct answer
      const [qRows] = await pool.query(
        `SELECT correctAnswer FROM Question WHERE id = ${questionId} LIMIT 1`);

      if (qRows.length === 0) continue; // skip nonexistent questions

      const isCorrect = qRows[0].correct_answer === answer;

      // 3b) Insert into Attempt
      await pool.query(
        `INSERT INTO Attempt (userId, questionId, answer, correct) VALUES (${studentId}, ${questionId}, "${answer}", ${isCorrect})`);
    }

    // 4) Respond success
    return res.json({ success: true });
  } catch (err) {
    console.error('Quiz attempt error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to record quiz attempts'
    });
  }
});


// Instructor Profile Route

// Update instructor profile (institution, certification, yoe)
// PUT /instructor/profile
// Update an instructor’s institution, certification, and yoe in the User table

app.put('/instructor/profile', async (req, res) => {
  const { instructorId, institution, certification, yoe } = req.body;

  // 1) Validate instructorId
  if (!instructorId) {
    return res.status(400).json({ success: false, message: 'instructorId is required' });
  }

  try {
    // 2) Verify the user exists and is an Instructor
    const [userRows] = await pool.query(
      `SELECT role FROM users WHERE uid = ${instructorId} LIMIT 1`);
    if (userRows.length === 0 || userRows[0].role !== 'Instructor') {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }

    // 3) Build dynamic SET clause
    const fields = [];
    const values = [];

    if (institution !== undefined) {
      fields.push('institution = ?');
      values.push(institution);
    }
    if (certification !== undefined) {
      fields.push('certification = ?');
      values.push(certification);
    }
    if (yoe !== undefined) {
      fields.push('yoe = ?');
      values.push(yoe);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // 4) Execute UPDATE
    values.push(instructorId); // for WHERE clause
    const sql = `UPDATE \`users\` SET ${fields.join(', ')} WHERE uid = ?`;
    await pool.query(sql, values);

    return res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});


// ChatGPT SQL Query Route

// POST /chat
// Generate a SQL query via ChatGPT, execute it against MySQL, and return only the query & results

app.post('/chat', async (req, res) => {
  const { question } = req.body;

  // Validate input
  if (!question) {
    return res.status(400).json({ success: false, message: 'Question text is required' });
  }

  try {
    // Provide OpenAI with the correct table structure
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are a SQL query assistant. 
          
          The database has the following tables:
          - Attempt (with columns : id, userId, questionId, answer, correct)
          - Course (with columns : id, name, description, instructor_id)
          - Enrollment (with columns : student_id, course_id, enrollment_date, status)
          - Message (with columns : id, sender_id, receiver_id, content, is_read, priority)
          - Module (with columns : id, title, content_link, course_id)
          - Question (with columns: id, quizId, text, correctAnswer, difficulty)
          - Quiz (with columns : id, title, module_id, difficulty_level)
          - users (with columns : uid, name, email, password, role)
          
          Please generate SQL queries using only these exact table names. Also, for the information about Students and Instructors,
          fetch the data from the users table using the column named "role" which should be either 'Instructor' or 'Student'`
        },
        { role: 'user', content: `Convert this question into an SQL query:\n"${question}"` }
      ]
    });
    
    const sqlQuery = completion.choices[0].message.content.trim();
    console.log('Generated SQL query:', sqlQuery);
    
    try {
      // Execute the query
      let queryResult;
      if (sqlQuery.toLowerCase().startsWith('select')) {
        const [rows] = await pool.query(sqlQuery);
        queryResult = rows;
      } else {
        const [info] = await pool.query(sqlQuery);
        queryResult = { affectedRows: info.affectedRows, insertId: info.insertId };
      }
      
      return res.json({
        success: true,
        query: sqlQuery,
        result: queryResult
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      
      return res.json({
        success: true,
        query: sqlQuery,
        result: null,
        message: "Query generated but execution failed: " + dbError.message
      });
    }
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process query', 
      error: err.message 
    });
  }
});



// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  // You can customize logging, error codes, etc. here.
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
