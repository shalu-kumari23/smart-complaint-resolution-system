import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { ChevronLeft, Brain, Calendar, User, MapPin, Building, Star, CheckCircle, Clock, AlertTriangle, Send, Copy, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace('/api', '');

const ComplaintDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Officer Resolution Form State
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [officerSuccess, setOfficerSuccess] = useState('');

  // Citizen Feedback Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getComplaintDetails(id);
      setComplaint(data.complaint);
      setFeedback(data.feedback);
      setStatus(data.complaint.status);
      setResolutionNotes(data.complaint.resolutionNotes || '');
      setProofUrl(data.complaint.resolutionProofUrl || '');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error loading details');
      showToast(err.response?.data?.message || 'Error loading details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const handleCopyId = (idText) => {
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    showToast(`Copied complaint ID: ${idText}`, 'info', 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLocation = (locText) => {
    navigator.clipboard.writeText(locText);
    showToast(`Copied location: ${locText}`, 'info', 2000);
  };

  // Officer Update Status
  const handleOfficerSubmit = async (e) => {
    e.preventDefault();
    setOfficerSuccess('');
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('resolutionNotes', resolutionNotes);
      if (proofFile) {
        formData.append('proof', proofFile);
      } else {
        formData.append('resolutionProofUrl', proofUrl);
      }

      const updated = await api.updateComplaintStatus(complaint._id, formData);
      setComplaint(updated);
      setOfficerSuccess('Status and notes updated successfully!');
      showToast('Status updated successfully!', 'success');
      setProofFile(null);
      fetchComplaintDetails();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error updating status';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  // User Feedback Submit
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSuccess('');
    try {
      const fb = await api.submitFeedback(complaint._id, { rating, comment });
      setFeedback(fb);
      setFeedbackSuccess('Thank you! Your feedback has been registered.');
      showToast('Thank you! Your rating and feedback were registered.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting feedback';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const getDashboardLink = () => {
    if (user?.role === 'ADMIN') return '/admin-dashboard';
    if (user?.role === 'DEPARTMENT_OFFICER') return '/officer-dashboard';
    return '/dashboard';
  };

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        <div className="spinner-border text-indigo mb-2" role="status"></div>
        <p>Fetching complaint tracking timeline...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="container py-5 text-center text-muted">
        <AlertTriangle size={40} className="text-danger mb-2" />
        <p>{error || 'Complaint not found.'}</p>
        <Link to={getDashboardLink()} className="btn glass-btn-secondary mt-3">Back to Dashboard</Link>
      </div>
    );
  }

  // Stepper steps configuration
  const STEPS = ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
  const currentStepIndex = STEPS.indexOf(complaint.status);

  return (
    <div className="container py-4">
      {/* Back button */}
      <Link to={getDashboardLink()} className="btn btn-sm btn-dark d-flex align-items-center gap-1 border border-secondary border-opacity-10 py-2 px-3 text-white mb-4 w-fit">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>

      <div className="row g-4">
        {/* Left Column: Complaint Details and Stepper */}
        <div className="col-lg-7">
          {/* Main Info */}
          <div className="glass-card p-4 mb-4">
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <button 
                className="btn btn-sm p-0 font-monospace small text-white-50 d-flex align-items-center gap-1 border-0" 
                onClick={() => handleCopyId(complaint.complaintId)}
                title="Click to copy Complaint ID"
              >
                <span>{complaint.complaintId}</span>
                {copiedId === complaint.complaintId ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-muted" />}
              </button>
              <span className={`badge-status badge-${complaint.status}`}>{complaint.status}</span>
              <span className={`badge-priority priority-${complaint.priority}`}>{complaint.priority}</span>
            </div>
            <h3 className="fw-bold text-white mb-3">{complaint.title}</h3>
            <p className="text-white-50 mb-4" style={{ whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
            
            {complaint.imageUrl && (
              <div className="mb-4 text-center">
                <img 
                  src={complaint.imageUrl.startsWith('http') ? complaint.imageUrl : `${SERVER_URL}${complaint.imageUrl}`} 
                  alt="Complaint evidence" 
                  className="img-fluid rounded-3" 
                  style={{ maxHeight: '320px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.08)' }} 
                />
              </div>
            )}
            
            <div className="row g-3 border-top border-secondary border-opacity-10 pt-3">
              <div className="col-sm-6 small d-flex align-items-center gap-2 text-muted">
                <MapPin size={16} /> 
                <span>
                  Location: <button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={() => handleCopyLocation(complaint.location)} title="Click to copy location"><strong>{complaint.location}</strong></button>
                </span>
              </div>
              <div className="col-sm-6 small d-flex align-items-center gap-2 text-muted">
                <Calendar size={16} /> <span>Filed: <strong>{new Date(complaint.createdAt).toLocaleDateString()}</strong></span>
              </div>
              <div className="col-sm-6 small d-flex align-items-center gap-2 text-muted">
                <Building size={16} /> <span>Department: <strong>{complaint.department?.name || 'Pending assignment'}</strong></span>
              </div>
              <div className="col-sm-6 small d-flex align-items-center gap-2 text-muted">
                <User size={16} /> <span>Officer: <strong>{complaint.assignedOfficer?.name || 'Unassigned'}</strong></span>
              </div>
            </div>
          </div>

          {/* Progress Timeline Stepper */}
          <div className="glass-card p-4 mb-4">
            <h5 className="fw-bold text-white mb-3">Resolution Timeline Stepper</h5>
            <div className="position-relative d-flex justify-content-between align-items-center py-2" style={{ overflowX: 'auto' }}>
              
              {/* Stepper background line */}
              <div className="position-absolute start-0 end-0 bg-secondary bg-opacity-20" style={{ height: '3px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                {/* Highlight line */}
                <div 
                  className="bg-indigo h-100" 
                  style={{ 
                    width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%`, 
                    backgroundColor: 'var(--primary-accent)',
                    transition: 'width 0.4s ease'
                  }}
                ></div>
              </div>

              {STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="text-center position-relative d-flex flex-column align-items-center" style={{ zIndex: 2, minWidth: '80px' }}>
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center ${isActive ? 'bg-indigo text-white' : 'bg-dark text-muted border border-secondary border-opacity-25'}`}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        backgroundColor: isActive ? 'var(--primary-accent)' : '#1f2937',
                        border: isCurrent ? '3px solid #fff' : 'none'
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span 
                      className={`small mt-2 d-block ${isCurrent ? 'text-white fw-bold' : isActive ? 'text-white-50' : 'text-muted'}`}
                      style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                    >
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Similar duplicates list */}
          {complaint.possibleDuplicates?.length > 0 && (
            <div className="glass-card p-4 border-warning bg-warning bg-opacity-5" style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h5 className="fw-bold text-white mb-2 d-flex align-items-center gap-2">
                <AlertTriangle size={18} className="text-warning" /> AI Potential Duplicate Flag
              </h5>
              <p className="small text-muted mb-3">AI identified similar reports filed recently. Similarity matches above threshold are listed below:</p>
              
              <div className="d-flex flex-column gap-2">
                {complaint.possibleDuplicates.map((dup, dIdx) => (
                  <div key={dIdx} className="p-2 rounded-3 bg-dark bg-opacity-50 small border border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="text-white-50 d-block">{dup.complaintId}: {dup.title}</strong>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Status: {dup.status}</span>
                    </div>
                    <span className="badge bg-warning bg-opacity-20 text-warning px-3 py-1 font-monospace">
                      {Math.round(dup.similarity * 100)}% Similarity
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis pane & Feedback/Resolution forms */}
        <div className="col-lg-5">
          {/* AI Analysis Card */}
          <div className="glass-card p-4 mb-4">
            <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <Brain size={20} className="text-indigo" style={{ color: '#818cf8' }} /> Live AI Insight Pane
            </h4>

            <div className="mb-3 p-3 rounded-3 bg-dark bg-opacity-40">
              <span className="text-muted small d-block mb-1">AI-Generated Executive Summary</span>
              <p className="small text-white-50 italic mb-0">"{complaint.aiAnalysis?.summary || 'N/A'}"</p>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
                  <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Category Confidence</span>
                  <strong className="text-white">{Math.round((complaint.aiAnalysis?.categoryConfidence || 0) * 100)}%</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
                  <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Sentiment Score</span>
                  <strong className="text-white">{complaint.sentiment}</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
                  <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Priority Score</span>
                  <strong className="text-white">{complaint.urgencyScore}%</strong>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
                  <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>Estimated SLA Time</span>
                  <strong className="text-white">{complaint.aiAnalysis?.estimatedResolutionHours || 24} hrs</strong>
                </div>
              </div>
            </div>

            <div className="mb-3 p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
              <span className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>AI Suggested Action Plan</span>
              <span className="text-white-50 small" style={{ whiteSpace: 'pre-wrap' }}>{complaint.aiAnalysis?.suggestedAction}</span>
            </div>

            <div className="p-2 bg-dark bg-opacity-20 border border-secondary border-opacity-10 rounded-3 small">
              <span className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>AI Pre-drafted Response Email</span>
              <p className="text-muted-light small mb-0 font-monospace italic" style={{ fontSize: '0.7rem', maxHeight: '100px', overflowY: 'auto' }}>{complaint.aiAnalysis?.draftResponse}</p>
            </div>
          </div>

          {/* Department Officer Actions */}
          {(user?.role === 'DEPARTMENT_OFFICER' || user?.role === 'ADMIN') && (
            <div className="glass-card p-4 mb-4">
              <h5 className="fw-bold text-white mb-3">Officer Action Panel</h5>
              {officerSuccess && <div className="alert alert-success py-2 small">{officerSuccess}</div>}
              
              <form onSubmit={handleOfficerSubmit}>
                <div className="mb-3">
                  <label className="form-label text-muted small">Update Status</label>
                  <select 
                    className="form-select glass-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="REOPENED">Reopened</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">Resolution Progress Notes</label>
                  <textarea 
                    className="form-control glass-input" 
                    rows="3" 
                    placeholder="Enter what actions were taken to inspect/resolve this ticket..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted small">Resolution Proof Image (Optional)</label>
                  <input 
                    type="file" 
                    className="form-control glass-input" 
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    key={proofFile ? 'proof-uploaded' : 'proof-empty'}
                  />
                </div>

                <button type="submit" className="btn glass-btn w-100 py-3">Submit Action Log</button>
              </form>
            </div>
          )}

          {/* Citizen Actions: Feedback Form */}
          {user?.role === 'USER' && complaint.status === 'RESOLVED' && (
            <div className="glass-card p-4">
              <h5 className="fw-bold text-white mb-3">Submit Citizen Feedback</h5>
              {feedbackSuccess && <div className="alert alert-success py-2 small">{feedbackSuccess}</div>}

              {feedback ? (
                <div className="p-3 bg-dark bg-opacity-40 rounded-3">
                  <div className="d-flex align-items-center gap-1 mb-2">
                    <span className="text-muted small me-2">Your Rating:</span>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < feedback.rating ? 'text-warning fill-warning' : 'text-muted'} />
                    ))}
                  </div>
                  <p className="small text-white-50 italic mb-0">"{feedback.comment}"</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-muted small d-block">Rate Resolution</label>
                    <div className="d-flex gap-2">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button 
                          key={stars} 
                          type="button" 
                          className="btn p-0" 
                          onClick={() => setRating(stars)}
                        >
                          <Star 
                            size={28} 
                            className={stars <= rating ? 'text-warning fill-warning' : 'text-muted'} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small">Additional Comments</label>
                    <textarea 
                      className="form-control glass-input" 
                      rows="2" 
                      placeholder="Comment on the response speed, quality, etc."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn glass-btn w-100 py-3 d-flex align-items-center justify-content-center gap-2">
                    <Send size={16} /> Send Review
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Already resolved notes (shown to citizen) */}
          {user?.role === 'USER' && complaint.status === 'RESOLVED' && complaint.resolutionNotes && !feedback && (
            <div className="glass-card p-4 mt-3">
              <h5 className="fw-bold text-white mb-2">Official Resolution Log</h5>
              <p className="small text-white-50 mb-2">{complaint.resolutionNotes}</p>
              {complaint.resolutionProofUrl && (
                <div className="mt-3">
                  <span className="text-muted small d-block mb-1">Resolution Attachment Proof</span>
                  <img 
                    src={complaint.resolutionProofUrl.startsWith('http') ? complaint.resolutionProofUrl : `${SERVER_URL}${complaint.resolutionProofUrl}`} 
                    alt="Resolution Proof" 
                    className="img-fluid rounded-3" 
                    style={{ maxHeight: '200px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.08)' }} 
                  />
                  <a 
                    href={complaint.resolutionProofUrl.startsWith('http') ? complaint.resolutionProofUrl : `${SERVER_URL}${complaint.resolutionProofUrl}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo small d-block mt-2" 
                    style={{ color: '#818cf8' }}
                  >
                    View Full Image Proof
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetail;
