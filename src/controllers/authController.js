// src/controllers/authController.js
const { User } = require('../models');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.query;
    const user = await User.findOne({ where: { username, password } });
    if (user) {
      return res.json({
        success: true,
        user_id: user.id,
        identity: user.identity
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.signup = async (req, res) => {
  try {
    const { username, identity, password } = req.body;
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const newUser = await User.create({ username, identity, password });
    return res.json({ success: true, user_id: newUser.id });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
