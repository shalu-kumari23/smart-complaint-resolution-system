const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// @route   GET /api/departments
// @desc    Get all departments
// @access  Public
router.get('/', async (req, res) => {
  try {
    const depts = await Department.find({});
    return res.json(depts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/departments
// @desc    Create a new department
// @access  Private/Admin
router.post('/', protect, authorize('ADMIN'), async (req, res) => {
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const deptExists = await Department.findOne({ name });
    if (deptExists) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    const dept = await Department.create({ name, description });

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Department created',
      details: `Created department: ${name}`
    });

    return res.status(201).json(dept);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/departments/officers
// @desc    Get all department officers
// @access  Private/Admin
router.get('/officers', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const officers = await User.find({ role: 'DEPARTMENT_OFFICER' }).populate('department');
    return res.json(officers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
