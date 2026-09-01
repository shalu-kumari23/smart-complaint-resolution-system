const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Other'
  },
  subcategory: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  sentiment: {
    type: String,
    enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
    default: 'NEUTRAL'
  },
  urgencyScore: {
    type: Number,
    default: 0
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  location: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  imageUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'REOPENED'],
    default: 'SUBMITTED'
  },
  aiAnalysis: {
    categoryConfidence: { type: Number, default: 0 },
    departmentConfidence: { type: Number, default: 0 },
    priorityScore: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
    draftResponse: { type: String, default: '' },
    estimatedResolutionHours: { type: Number, default: 24 },
    estimatedDate: { type: Date, default: null },
    aiStatus: { type: String, enum: ['SUCCESS', 'PENDING', 'FAILED'], default: 'PENDING' }
  },
  possibleDuplicates: [{
    complaintId: { type: String },
    title: { type: String },
    description: { type: String },
    status: { type: String },
    similarity: { type: Number }
  }],
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  resolutionProofUrl: {
    type: String,
    default: ''
  },
  resolutionTime: {
    type: Number, // in hours
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for searching / filtering
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ department: 1 });
ComplaintSchema.index({ createdAt: -1 });

// Middleware to assign human readable auto-incremented complaintId on save (e.g. CR-10001)
ComplaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    try {
      const count = await this.constructor.countDocuments();
      this.complaintId = `CR-${10001 + count}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
