// src/controllers/profileController.js
const { User } = require('../models');

exports.updateInstructorProfile = async (req, res) => {
  try {
    const { instructor_id, institution, certification, yoe } = req.body;
    const instructor = await User.findByPk(instructor_id);
    if (!instructor || instructor.identity !== 'instructor') {
      return res.status(404).json({ success: false, message: 'Instructor not found' });
    }
    instructor.institution = institution || instructor.institution;
    instructor.certification = certification || instructor.certification;
    instructor.yoe = yoe !== undefined ? yoe : instructor.yoe;
    await instructor.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
