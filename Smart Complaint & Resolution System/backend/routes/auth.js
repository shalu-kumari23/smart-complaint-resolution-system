const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const { protect } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const mongoose = require('mongoose');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_please_change_in_production',
    { expiresIn: '30d' }
  );
};

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database is not connected. Please ensure MongoDB is running or configure MONGO_URI in .env'
    });
  }
  next();
};

// @route   POST /api/auth/register
// @desc    Register a user/officer/admin
// @access  Public
router.post('/register', checkDBConnection, async (req, res) => {
  const { name, email, password, role, departmentName } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let departmentId = null;
    if (role === 'DEPARTMENT_OFFICER' && departmentName) {
      const dept = await Department.findOne({ name: departmentName });
      if (dept) {
        departmentId = dept._id;
      } else {
        // Create department dynamically if it doesn't exist
        const newDept = await Department.create({ name: departmentName });
        departmentId = newDept._id;
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'USER',
      department: departmentId
    });

    if (user) {
      // Log audit
      try {
        await AuditLog.create({
          userId: user._id,
          userName: user.name,
          action: 'User registered',
          details: `Registered as ${user.role}`
        });
      } catch (auditErr) {
        console.warn('AuditLog creation notice:', auditErr.message);
      }

      return res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        token: generateToken(user._id)
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', checkDBConnection, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check for user email
    const user = await User.findOne({ email: cleanEmail }).populate('department');

    if (!user) {
      return res.status(401).json({ message: 'No account found with this email. Please register first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    // Log audit
    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'User logged in',
        details: `Logged in as ${user.role}`
      });
    } catch (auditErr) {
      console.warn('AuditLog creation notice:', auditErr.message);
    }

    return res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during authentication' });
  }
});

// @route   GET /api/auth/me
// @desc    Get user data
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('department');
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
