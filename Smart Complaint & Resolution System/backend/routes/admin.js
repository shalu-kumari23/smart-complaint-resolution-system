const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/dashboard
// @desc    Get aggregated stats for dashboard KPIs and Recharts
// @access  Private (ADMIN only)
router.get('/dashboard', protect, authorize('ADMIN'), async (req, res) => {
  try {
    // 1. KPI Cards data
    const totalComplaints = await Complaint.countDocuments();
    const pendingCount = await Complaint.countDocuments({ status: { $in: ['SUBMITTED', 'AI_ANALYZED'] } });
    const inProgressCount = await Complaint.countDocuments({ status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } });
    const resolvedCount = await Complaint.countDocuments({ status: 'RESOLVED' });
    const criticalCount = await Complaint.countDocuments({ priority: 'CRITICAL', status: { $ne: 'RESOLVED' } });

    // Average resolution time (in hours)
    const resolvedComplaints = await Complaint.find({ status: 'RESOLVED', resolutionTime: { $ne: null } });
    const totalHours = resolvedComplaints.reduce((acc, c) => acc + (c.resolutionTime || 0), 0);
    const avgResolutionTime = resolvedComplaints.length > 0 ? parseFloat((totalHours / resolvedComplaints.length).toFixed(1)) : 0;

    // 2. Aggregate: Complaints by Category
    const categoryAgg = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const byCategory = categoryAgg.map(item => ({ name: item._id, value: item.count }));

    // 3. Aggregate: Complaints by Priority
    const priorityAgg = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const byPriority = priorityAgg.map(item => ({ name: item._id, value: item.count }));

    // 4. Aggregate: Complaints by Status
    const statusAgg = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = statusAgg.map(item => ({ name: item._id, value: item.count }));

    // 5. Aggregate: Monthly complaint trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyAgg = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrends = monthlyAgg.map(item => {
      const label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      return { month: label, count: item.count };
    });

    // 6. Aggregate: Department performance
    const depts = await Department.find({});
    const deptPerformance = [];
    for (const dept of depts) {
      const totalDept = await Complaint.countDocuments({ department: dept._id });
      const resolvedDept = await Complaint.countDocuments({ department: dept._id, status: 'RESOLVED' });
      const avgTimeDeptComplaints = await Complaint.find({ department: dept._id, status: 'RESOLVED', resolutionTime: { $ne: null } });
      const sumHours = avgTimeDeptComplaints.reduce((acc, c) => acc + (c.resolutionTime || 0), 0);
      const avgTimeDept = avgTimeDeptComplaints.length > 0 ? parseFloat((sumHours / avgTimeDeptComplaints.length).toFixed(1)) : 0;

      deptPerformance.push({
        department: dept.name,
        total: totalDept,
        resolved: resolvedDept,
        avgResolutionTime: avgTimeDept
      });
    }

    return res.json({
      kpis: {
        totalComplaints,
        pendingCount,
        inProgressCount,
        resolvedCount,
        criticalCount,
        avgResolutionTime
      },
      charts: {
        byCategory,
        byPriority,
        byStatus,
        monthlyTrends,
        deptPerformance
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/complaints
// @desc    Get all complaints with advanced filtering
// @access  Private (ADMIN only)
router.get('/complaints', protect, authorize('ADMIN'), async (req, res) => {
  const { category, priority, status, departmentId } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (status) filter.status = status;
  if (departmentId) filter.department = departmentId;

  try {
    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('department')
      .populate('assignedOfficer', 'name email')
      .sort({ createdAt: -1 });

    return res.json(complaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all system users list
// @access  Private (ADMIN only)
router.get('/users', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await User.find({}).populate('department').select('-password');
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get all system audit trails
// @access  Private (ADMIN only)
router.get('/audit-logs', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100);
    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
