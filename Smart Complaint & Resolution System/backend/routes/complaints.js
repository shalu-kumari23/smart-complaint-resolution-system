const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Feedback = require('../models/Feedback');
const { protect, authorize } = require('../middleware/auth');
const { analyzeComplaint } = require('../services/aiService');
const upload = require('../middleware/upload');

// Indian Cities coordinates for React Leaflet mapping
const CITY_COORDINATES = {
  mumbai: [19.0760, 72.8777],
  delhi: [28.7041, 77.1025],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.3850, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  patna: [25.5941, 85.1376],
  bhopal: [23.2599, 77.4126],
  ranchi: [23.3441, 85.3096],
  chandigarh: [30.7333, 76.7794]
};

const getGeocode = (locationStr) => {
  if (!locationStr) return [20.5937, 78.9629]; // Center of India
  const locLower = locationStr.toLowerCase().trim();
  
  let baseCoords = [20.5937, 78.9629];
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (locLower.includes(city)) {
      baseCoords = coords;
      break;
    }
  }
  
  // Add minor jitter so multiple reports disperse
  const jitterLat = (Math.random() - 0.5) * 0.04;
  const jitterLng = (Math.random() - 0.5) * 0.04;
  return [baseCoords[0] + jitterLat, baseCoords[1] + jitterLng];
};

const findComplaintByIdOrCode = async (idParam) => {
  if (!idParam) return null;
  const isObjectId = idParam.match(/^[0-9a-fA-F]{24}$/);
  if (isObjectId) {
    return await Complaint.findById(idParam);
  }
  return await Complaint.findOne({ complaintId: idParam });
};

// @route   POST /api/complaints
// @desc    Submit a new complaint & trigger AI analysis
// @access  Private (USER only)
router.post('/', protect, authorize('USER'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { title, description, location, category: userCategory, latitude, longitude } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '');

  try {
    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Title, description and location are required' });
    }

    // 1. Create Complaint (triggers pre-save middleware to assign CR-id)
    let complaint = new Complaint({
      userId: req.user._id,
      title,
      description,
      location,
      imageUrl: imageUrl || '',
      status: 'SUBMITTED'
    });

    // Determine coordinates (use exact GPS if passed, otherwise geocode string)
    if (latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      complaint.latitude = Number(latitude);
      complaint.longitude = Number(longitude);
    } else {
      const [lat, lng] = getGeocode(location);
      complaint.latitude = lat;
      complaint.longitude = lng;
    }

    await complaint.save();

    // 2. Call AI Service (FastAPI) or Fallback
    const aiResult = await analyzeComplaint(description, userCategory, location);

    // 3. Resolve Recommended Department in DB
    let finalDeptId = null;
    if (aiResult.department) {
      let dept = await Department.findOne({ name: aiResult.department });
      if (!dept) {
        // Create department dynamically if not found
        dept = await Department.create({
          name: aiResult.department,
          description: `Automatically created for ${aiResult.category || 'AI Analysis'}`
        });
      }
      finalDeptId = dept._id;
    }

    // Calculate Estimated date
    let estDate = null;
    if (aiResult.estimatedDate) {
      estDate = new Date(aiResult.estimatedDate);
    } else if (aiResult.estimatedResolutionHours) {
      estDate = new Date();
      estDate.setHours(estDate.getHours() + aiResult.estimatedResolutionHours);
    }

    // 4. Update Complaint fields with AI metrics
    complaint.category = aiResult.category || 'Other';
    complaint.priority = aiResult.priority || 'MEDIUM';
    complaint.sentiment = aiResult.sentiment || 'NEUTRAL';
    complaint.urgencyScore = aiResult.urgencyScore || 50;
    complaint.department = finalDeptId;
    complaint.status = 'AI_ANALYZED';
    
    complaint.aiAnalysis = {
      categoryConfidence: aiResult.categoryConfidence || 0.5,
      departmentConfidence: aiResult.departmentConfidence || 0.5,
      priorityScore: aiResult.priorityScore || 50,
      summary: aiResult.summary || description.substring(0, 100) + '...',
      suggestedAction: aiResult.suggestedAction || 'Manual inspection recommended.',
      draftResponse: aiResult.draftResponse || 'Thank you for reporting.',
      estimatedResolutionHours: aiResult.estimatedResolutionHours || 24,
      estimatedDate: estDate,
      aiStatus: aiResult.aiStatus || 'SUCCESS'
    };

    complaint.possibleDuplicates = aiResult.duplicates || [];

    // Save final complaint
    await complaint.save();

    // 5. Send Notification
    await Notification.create({
      userId: req.user._id,
      complaintId: complaint._id,
      message: `Your complaint ${complaint.complaintId} has been analyzed. Category: ${complaint.category} | Priority: ${complaint.priority}`
    });

    if (finalDeptId && aiResult.department) {
      await Notification.create({
        userId: req.user._id,
        complaintId: complaint._id,
        message: `Complaint ${complaint.complaintId} has been routed to ${aiResult.department}.`
      });
    }

    // 6. Audit Log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Complaint submitted',
      complaintId: complaint.complaintId,
      details: `Title: ${title} | AI Status: ${complaint.aiAnalysis.aiStatus}`
    });

    const populated = await Complaint.findById(complaint._id).populate('department');
    return res.status(201).json(populated);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/complaints/my
// @desc    Get user's own complaints
// @access  Private (USER only)
router.get('/my', protect, authorize('USER'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id })
      .populate('department')
      .populate('assignedOfficer', 'name email')
      .sort({ createdAt: -1 });
    return res.json(complaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/complaints/officer
// @desc    Get complaints assigned to the officer's department
// @access  Private (DEPARTMENT_OFFICER only)
router.get('/officer', protect, authorize('DEPARTMENT_OFFICER'), async (req, res) => {
  try {
    if (!req.user.department) {
      return res.status(400).json({ message: 'Officer is not assigned to any department' });
    }

    const complaints = await Complaint.find({ department: req.user.department })
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

// @route   GET /api/complaints/:id
// @desc    Get complaint details by MongoDB _id or complaintId
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: req.params.id } : { complaintId: req.params.id };
    
    const complaint = await Complaint.findOne(query)
      .populate('userId', 'name email')
      .populate('department')
      .populate('assignedOfficer', 'name email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Verify access
    if (req.user.role === 'USER' && String(complaint.userId._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'DEPARTMENT_OFFICER' && String(complaint.department?._id) !== String(req.user.department)) {
      return res.status(403).json({ message: 'Access denied to this department' });
    }

    // Get feedback if exists
    const feedback = await Feedback.findOne({ complaintId: complaint._id });

    return res.json({ complaint, feedback });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status, assign notes, resolve proof
// @access  Private (DEPARTMENT_OFFICER, ADMIN)
router.put('/:id/status', protect, authorize('DEPARTMENT_OFFICER', 'ADMIN'), (req, res, next) => {
  upload.single('proof')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { status, resolutionNotes } = req.body;
  const resolutionProofUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.resolutionProofUrl || '');

  try {
    const complaint = await findComplaintByIdOrCode(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Verify department access for officer
    if (req.user.role === 'DEPARTMENT_OFFICER' && String(complaint.department) !== String(req.user.department)) {
      return res.status(403).json({ message: 'Not authorized for this department' });
    }

    if (status) {
      complaint.status = status;
      if (status === 'RESOLVED') {
        complaint.resolvedAt = new Date();
        // Calculate resolution time in hours
        const diffMs = complaint.resolvedAt - complaint.createdAt;
        complaint.resolutionTime = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
    }

    if (resolutionNotes !== undefined) complaint.resolutionNotes = resolutionNotes;
    if (resolutionProofUrl !== undefined) complaint.resolutionProofUrl = resolutionProofUrl;
    
    // Assign officer automatically if they update status
    if (req.user.role === 'DEPARTMENT_OFFICER') {
      complaint.assignedOfficer = req.user._id;
    }

    await complaint.save();

    // Create Notification for citizen
    await Notification.create({
      userId: complaint.userId,
      complaintId: complaint._id,
      message: `Your complaint ${complaint.complaintId} status updated to: ${complaint.status}.`
    });

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Status updated',
      complaintId: complaint.complaintId,
      details: `Status: ${complaint.status} | Officer Notes: ${resolutionNotes ? 'Yes' : 'No'}`
    });

    return res.json(complaint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/complaints/:id/assign
// @desc    Manually assign or reassign complaint to department/officer
// @access  Private (ADMIN only)
router.put('/:id/assign', protect, authorize('ADMIN'), async (req, res) => {
  const { departmentId, officerId } = req.body;

  try {
    const complaint = await findComplaintByIdOrCode(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    let auditDetails = '';

    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) return res.status(400).json({ message: 'Department not found' });
      complaint.department = departmentId;
      complaint.status = 'ASSIGNED';
      auditDetails += `Assigned to Dept: ${dept.name}. `;

      // Notify citizen
      await Notification.create({
        userId: complaint.userId,
        complaintId: complaint._id,
        message: `Your complaint ${complaint.complaintId} has been reassigned to ${dept.name}.`
      });
    }

    if (officerId) {
      const officer = await User.findById(officerId);
      if (!officer || officer.role !== 'DEPARTMENT_OFFICER') {
        return res.status(400).json({ message: 'Invalid officer' });
      }
      complaint.assignedOfficer = officerId;
      complaint.status = 'ASSIGNED';
      auditDetails += `Assigned to Officer: ${officer.name}.`;

      // Notify Officer
      await Notification.create({
        userId: officerId,
        complaintId: complaint._id,
        message: `New complaint ${complaint.complaintId} has been assigned to you.`
      });
    }

    await complaint.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Complaint assigned',
      complaintId: complaint.complaintId,
      details: auditDetails
    });

    return res.json(complaint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/complaints/:id/retry-ai
// @desc    Retry AI analysis (Admin only, useful if AI service was down or in fallback)
// @access  Private (ADMIN only)
router.put('/:id/retry-ai', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const complaint = await findComplaintByIdOrCode(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const aiResult = await analyzeComplaint(complaint.description, complaint.category, complaint.location);

    let finalDeptId = complaint.department;
    if (aiResult.department) {
      const dept = await Department.findOne({ name: aiResult.department });
      if (dept) finalDeptId = dept._id;
    }

    let estDate = null;
    if (aiResult.estimatedDate) {
      estDate = new Date(aiResult.estimatedDate);
    } else if (aiResult.estimatedResolutionHours) {
      estDate = new Date();
      estDate.setHours(estDate.getHours() + aiResult.estimatedResolutionHours);
    }

    complaint.category = aiResult.category || complaint.category;
    complaint.priority = aiResult.priority || complaint.priority;
    complaint.sentiment = aiResult.sentiment || complaint.sentiment;
    complaint.urgencyScore = aiResult.urgencyScore || complaint.urgencyScore;
    complaint.department = finalDeptId;
    
    complaint.aiAnalysis = {
      categoryConfidence: aiResult.categoryConfidence || 0.5,
      departmentConfidence: aiResult.departmentConfidence || 0.5,
      priorityScore: aiResult.priorityScore || 50,
      summary: aiResult.summary || complaint.description.substring(0, 100) + '...',
      suggestedAction: aiResult.suggestedAction || 'Manual inspection recommended.',
      draftResponse: aiResult.draftResponse || 'Thank you for reporting.',
      estimatedResolutionHours: aiResult.estimatedResolutionHours || 24,
      estimatedDate: estDate,
      aiStatus: aiResult.aiStatus || 'SUCCESS'
    };

    complaint.possibleDuplicates = aiResult.duplicates || [];
    await complaint.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'AI analysis completed',
      complaintId: complaint.complaintId,
      details: `Retried AI analysis successfully. Status: ${complaint.aiAnalysis.aiStatus}`
    });

    return res.json(complaint);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/complaints/:id/feedback
// @desc    Citizen feedback on resolved complaint
// @access  Private (USER only)
router.post('/:id/feedback', protect, authorize('USER'), async (req, res) => {
  const { rating, comment } = req.body;

  try {
    if (!rating) {
      return res.status(400).json({ message: 'Rating is required' });
    }

    const complaint = await findComplaintByIdOrCode(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (String(complaint.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Feedback can only be given on resolved complaints' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ complaintId: complaint._id });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this complaint' });
    }

    const feedback = await Feedback.create({
      complaintId: complaint._id,
      userId: req.user._id,
      rating,
      comment: comment || ''
    });

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Feedback submitted',
      complaintId: complaint.complaintId,
      details: `Rating: ${rating}/5`
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/complaints/:id
// @desc    Delete/remove complaint for inappropriate content
// @access  Private (ADMIN only)
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const complaint = await findComplaintByIdOrCode(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Delete feedback if any
    await Feedback.deleteOne({ complaintId: complaint._id });

    // Delete in-app notifications related to this complaint
    await Notification.deleteMany({ complaintId: complaint._id });

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'Complaint deleted',
      complaintId: complaint.complaintId,
      details: `Deleted ticket: ${complaint.title}`
    });

    await Complaint.deleteOne({ _id: complaint._id });

    return res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
