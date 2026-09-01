import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Plus, List, Bell, LogOut, CheckCircle, Clock, AlertCircle, Play, Star, ChevronRight, X, Search, Filter, Copy, Check, MapPin, Sparkles, Upload, FileText, Compass, ShieldCheck, RefreshCw, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace('/api', '');

const CATEGORY_OPTIONS = [
  { label: 'Auto-Detect (AI)', value: '' },
  { label: 'Roads', value: 'Roads' },
  { label: 'Electricity', value: 'Electricity' },
  { label: 'Street Light', value: 'Street Light' },
  { label: 'Water Supply', value: 'Water Supply' },
  { label: 'Sanitation', value: 'Sanitation' },
  { label: 'Drainage', value: 'Drainage' },
  { label: 'Other', value: 'Other' },
];

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  
  // Data States
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [justSubmittedComplaint, setJustSubmittedComplaint] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Search & Filter state for complaints list
  const [searchQuery, setSearchQuery] = useState('');
  const [listCategoryFilter, setListCategoryFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Fetch data
  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const compData = await api.getMyComplaints();
      setComplaints(compData);
      
      const notifData = await api.getNotifications();
      setNotifications(notifData);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      if (isManualRefresh) {
        showToast('Complaints data refreshed', 'info', 1500);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (isManualRefresh) {
        showToast('Network error while refreshing data', 'error');
      }
    } finally {
      if (isManualRefresh) setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live "X seconds ago" ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // GPS Location Detection Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setDetectingLocation(true);
    showToast('Requesting GPS location permission...', 'info', 2000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        // Attempt Reverse Geocode via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road || data.address?.neighbourhood || data.address?.suburb || '';
            const city = data.address?.city || data.address?.town || data.address?.state_district || '';
            const state = data.address?.state || '';
            const readableLoc = [road, city, state].filter(Boolean).join(', ');
            
            if (readableLoc && !location) {
              setLocation(readableLoc);
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding unavailable, using raw GPS coordinates:', e);
        }

        setDetectingLocation(false);
        showToast(`GPS coordinates locked: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`, 'success');
      },
      (geoError) => {
        setDetectingLocation(false);
        let errorMsg = 'Could not acquire GPS position.';
        if (geoError.code === 1) {
          errorMsg = 'Location permission denied. Please allow access in browser settings.';
        } else if (geoError.code === 2) {
          errorMsg = 'GPS location is currently unavailable.';
        } else if (geoError.code === 3) {
          errorMsg = 'GPS location request timed out.';
        }
        showToast(errorMsg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearGPS = () => {
    setLatitude(null);
    setLongitude(null);
    showToast('Cleared GPS coordinates', 'info', 1500);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size exceeds 5MB limit. Please choose a smaller photo.', 'error');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Submit Handler with Client-Side Validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setJustSubmittedComplaint(null);

    // Validations
    if (!title.trim() || title.trim().length < 5) {
      setError('Title must be at least 5 characters long.');
      showToast('Title must be at least 5 characters long.', 'error');
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setError('Description must be at least 15 characters to allow AI analysis.');
      showToast('Description must be at least 15 characters long.', 'error');
      return;
    }

    if (!location.trim() && !latitude) {
      setError('Please provide an area or detect your GPS location.');
      showToast('Please provide an area or detect your GPS location.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('location', location.trim() || (latitude ? `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` : 'Urban Area'));
      formData.append('category', category || 'Other');
      if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const newComplaint = await api.submitComplaint(formData);
      
      setSuccessMsg(`Complaint ${newComplaint.complaintId} submitted successfully!`);
      setJustSubmittedComplaint(newComplaint);
      showToast(`Complaint ${newComplaint.complaintId} submitted & AI dispatched!`, 'success');
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setLatitude(null);
      setLongitude(null);
      setCategory('');
      setImageFile(null);
      setImagePreview(null);

      // Refresh list
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting complaint. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkNotifRead = async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      const notifData = await api.getNotifications();
      setNotifications(notifData);
      showToast('Notification marked as read', 'info');
    } catch (err) {
      console.error(err);
      showToast('Could not mark notification as read', 'error');
    }
  };

  const handleCopyId = (e, idText) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    showToast(`Copied tracking ID: ${idText}`, 'info', 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLocation = (e, locText) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(locText);
    showToast(`Copied location: ${locText}`, 'info', 2000);
  };

  // KPIs
  const total = complaints.length;
  const pending = complaints.filter(c => ['SUBMITTED', 'AI_ANALYZED'].includes(c.status)).length;
  const progress = complaints.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length;
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = !listCategoryFilter || c.category === listCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container py-4" style={{ maxWidth: '1240px' }}>
      {/* Topbar Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 glass-card p-3 px-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-white" style={{ letterSpacing: '-0.02em' }}>Citizen Portal</h5>
              <span className="badge bg-indigo bg-opacity-20 text-indigo border border-indigo border-opacity-30 small" style={{ color: '#818cf8', fontSize: '0.7rem' }}>
                CITIZEN
              </span>
            </div>
            <span className="text-muted small">Welcome back, <strong className="text-white">{user?.name}</strong></span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Live Refresh Control */}
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small font-mono d-none d-sm-inline" style={{ fontSize: '0.72rem' }}>
              Updated {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </span>
            <button 
              className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-1"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Fetch latest grievance updates"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo' : ''} />
              <span className="small">Refresh</span>
            </button>
          </div>

          {/* Notifications Trigger */}
          <div className="position-relative">
            <button 
              className="btn btn-dark btn-sm rounded-circle p-2 position-relative" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', width: '38px', height: '38px' }}
              title="Notifications"
            >
              <Bell size={18} className="text-white" />
              {unreadNotifs > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.62rem' }}>
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="position-absolute end-0 mt-2 glass-card p-3 shadow-lg" style={{ width: '340px', zIndex: 1000, maxHeight: '420px', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-10">
                  <span className="fw-bold text-white small d-flex align-items-center gap-1">
                    <Bell size={14} className="text-indigo" /> Live Resolution Alerts
                  </span>
                  <button className="btn btn-sm text-muted p-0" onClick={() => setShowNotifications(false)}><X size={16} /></button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-muted text-center small py-3 my-0">No notifications yet</p>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n._id} 
                      className={`p-2 rounded-3 mb-2 small d-flex justify-content-between align-items-start gap-2 ${n.isRead ? 'bg-dark bg-opacity-25' : 'bg-indigo bg-opacity-15 border border-indigo border-opacity-30'}`}
                    >
                      <span className="text-white-50" style={{ fontSize: '0.8rem' }}>{n.message}</span>
                      {!n.isRead && (
                        <button 
                          className="btn btn-sm text-indigo p-0 small font-mono fw-bold flex-shrink-0" 
                          onClick={() => handleMarkNotifRead(n._id)}
                          style={{ color: '#818cf8', fontSize: '0.7rem' }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-2" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Total Filed</span>
              <FileText size={18} className="text-muted opacity-50" />
            </div>
            <h3 className="fw-bold text-white mb-1 font-mono">{total}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>All-time grievances</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Pending AI Review</span>
              <Clock size={18} className="text-info opacity-75" />
            </div>
            <h3 className="fw-bold text-info mb-1 font-mono">{pending}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>In automated triage</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">In Progress</span>
              <Play size={18} className="text-warning opacity-75" />
            </div>
            <h3 className="fw-bold text-warning mb-1 font-mono">{progress}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Assigned to field officers</span>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Resolved</span>
              <CheckCircle size={18} className="text-success opacity-75" />
            </div>
            <h3 className="fw-bold text-success mb-1 font-mono">{resolved}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Completed & verified</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Submit Complaint Column */}
        <div className="col-lg-5">
          <div className="glass-card p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-10">
              <Plus size={20} className="text-indigo" style={{ color: '#818cf8' }} />
              <h5 className="fw-bold text-white mb-0">File New Grievance</h5>
            </div>
            
            {error && <div className="alert alert-danger py-2 border-0 bg-danger bg-opacity-25 text-white small rounded-3 mb-3">{error}</div>}
            {successMsg && <div className="alert alert-success py-2 border-0 bg-success bg-opacity-25 text-white small rounded-3 mb-3">{successMsg}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted small fw-medium mb-0">Complaint Title *</label>
                  <span className={`small ${title.length < 5 ? 'text-muted' : 'text-success'}`} style={{ fontSize: '0.68rem' }}>
                    {title.length}/100 chars
                  </span>
                </div>
                <input 
                  type="text" 
                  className="form-control glass-input" 
                  placeholder="E.g. Main road pothole near Metro Station"
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted small fw-medium mb-0">Detailed Description *</label>
                  <span className={`small ${description.length < 15 ? 'text-muted' : 'text-indigo'}`} style={{ fontSize: '0.68rem' }}>
                    {description.length}/1000 chars (Min 15)
                  </span>
                </div>
                <textarea 
                  className="form-control glass-input" 
                  rows="4" 
                  placeholder="Explain the issue in detail. The AI engine will analyze this text to determine department routing, priority level, and duplicate tickets."
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Location Input with GPS Detection */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted small fw-medium mb-0">Location (Area / Landmark) *</label>
                  
                  {/* Task 1: Detect My Location Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-dark d-flex align-items-center gap-1 border-secondary border-opacity-20 py-0 px-2 text-indigo"
                    style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)' }}
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Acquire exact GPS coordinates from browser"
                  >
                    <Crosshair size={12} className={detectingLocation ? 'animate-spin' : ''} />
                    <span>{detectingLocation ? 'Detecting GPS...' : '📍 Detect My Location'}</span>
                  </button>
                </div>

                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                    <MapPin size={16} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control glass-input" 
                    placeholder="E.g. Mumbai, Bandra West, Near St. Joseph Church"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                {/* GPS Coordinates Badge if detected */}
                {latitude && longitude && (
                  <div className="d-flex align-items-center justify-content-between mt-2 p-2 rounded-2 bg-indigo bg-opacity-10 border border-indigo border-opacity-30 small">
                    <span className="text-indigo font-mono" style={{ fontSize: '0.72rem', color: '#818cf8' }}>
                      📍 GPS Locked: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                    </span>
                    <button 
                      type="button" 
                      className="btn btn-link p-0 text-muted small text-decoration-none" 
                      onClick={handleClearGPS} 
                      title="Clear GPS"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Category selector chips */}
              <div className="mb-3">
                <label className="form-label text-muted small fw-medium d-block mb-1">
                  Category <span className="text-muted fw-normal">(Optional — AI auto-detects)</span>
                </label>
                <div className="d-flex flex-wrap gap-1">
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`btn btn-sm py-1 px-2 rounded-2 ${category === opt.value ? 'btn-indigo text-white fw-bold' : 'btn-dark bg-opacity-40 text-muted border-secondary border-opacity-10'}`}
                      style={{
                        fontSize: '0.72rem',
                        background: category === opt.value ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid ' + (category === opt.value ? '#818cf8' : 'rgba(255,255,255,0.08)')
                      }}
                      onClick={() => setCategory(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload Area with Preview */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted small fw-medium mb-0">Evidence Photo (Optional)</label>
                  <span className="text-muted small" style={{ fontSize: '0.68rem' }}>Max 5MB (JPG/PNG)</span>
                </div>

                {imagePreview ? (
                  <div className="position-relative d-inline-block rounded-3 overflow-hidden border border-secondary border-opacity-20 mb-2 w-100">
                    <img src={imagePreview} alt="Upload preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 p-1 rounded-circle shadow"
                      onClick={handleRemoveImage}
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    className="form-control glass-input" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                )}
              </div>

              <button type="submit" className="btn glass-btn w-100 py-3 d-flex justify-content-center align-items-center gap-2" disabled={submitting}>
                <Sparkles size={18} />
                {submitting ? 'Analyzing & Routing with AI...' : 'Submit to AI Dispatch'}
              </button>
            </form>
          </div>
        </div>

        {/* Complaints List Column */}
        <div className="col-lg-7">
          {/* Real-time AI Analysis feedback modal panel if a complaint was just filed */}
          {justSubmittedComplaint && (
            <div className="glass-card p-4 mb-4 border-indigo bg-dark bg-opacity-40 animate-fade-in" style={{ border: '1px solid #818cf8', boxShadow: '0 0 25px rgba(99, 102, 241, 0.25)' }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 rounded-2 bg-indigo bg-opacity-20 text-indigo" style={{ color: '#818cf8' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h5 className="fw-bold text-white mb-0">Live AI Assessment Complete</h5>
                    <span className="text-muted small font-mono">Ticket: {justSubmittedComplaint.complaintId}</span>
                  </div>
                </div>
                <button className="btn btn-sm text-muted p-0" onClick={() => setJustSubmittedComplaint(null)}><X size={16} /></button>
              </div>
              
              <div className="row g-2 my-2">
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-dark bg-opacity-60 rounded-3 border border-secondary border-opacity-10">
                    <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>Category</span>
                    <strong className="text-white small">{justSubmittedComplaint.category}</strong>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-dark bg-opacity-60 rounded-3 border border-secondary border-opacity-10">
                    <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>Department Route</span>
                    <strong className="text-white small text-truncate d-block">{justSubmittedComplaint.department?.name || 'Assigned'}</strong>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-dark bg-opacity-60 rounded-3 border border-secondary border-opacity-10">
                    <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>Priority Level</span>
                    <span className={`badge-priority priority-${justSubmittedComplaint.priority}`}>{justSubmittedComplaint.priority}</span>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 bg-dark bg-opacity-60 rounded-3 border border-secondary border-opacity-10">
                    <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>Sentiment Index</span>
                    <strong className="text-white small">{justSubmittedComplaint.sentiment}</strong>
                  </div>
                </div>
              </div>

              {justSubmittedComplaint.possibleDuplicates?.length > 0 && (
                <div className="alert alert-warning py-2 border-0 bg-warning bg-opacity-25 text-warning-light small rounded-3 my-2 d-flex align-items-center gap-2">
                  <AlertCircle size={16} className="text-warning flex-shrink-0" />
                  <span><strong>Possible duplicate ticket detected ({justSubmittedComplaint.possibleDuplicates.length} matches).</strong> Admin review queued.</span>
                </div>
              )}
            </div>
          )}

          <div className="glass-card p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-10">
              <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                <List size={20} className="text-indigo" style={{ color: '#818cf8' }} /> Your Filed Grievances ({filteredComplaints.length})
              </h5>
            </div>

            {/* Search & Filter Toolbar */}
            {complaints.length > 0 && (
              <div className="row g-2 mb-3">
                <div className="col-sm-7">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                      <Search size={14} />
                    </span>
                    <input 
                      type="text" 
                      className="form-control glass-input py-1" 
                      placeholder="Search title, ID, area, keywords..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-sm-5">
                  <select 
                    className="form-select form-select-sm glass-input py-1"
                    value={listCategoryFilter}
                    onChange={(e) => setListCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Roads">Roads</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Street Light">Street Light</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {filteredComplaints.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <AlertCircle size={40} className="mb-2 opacity-50" />
                <p className="small mb-0">{complaints.length === 0 ? 'No complaints filed yet. Fill out the form to test the flow.' : 'No grievances match your search / filter criteria.'}</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {filteredComplaints.map(c => (
                  <div key={c._id} className="p-3 glass-card bg-dark bg-opacity-30 border border-secondary border-opacity-10 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                    <div className="d-flex align-items-center gap-3">
                      {c.imageUrl && (
                        <img 
                          src={c.imageUrl.startsWith('http') ? c.imageUrl : `${SERVER_URL}${c.imageUrl}`} 
                          alt="Grievance evidence" 
                          className="rounded-3" 
                          style={{ width: '60px', height: '60px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} 
                        />
                      )}
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <button 
                            className="btn btn-sm p-0 font-mono small text-white-50 d-flex align-items-center gap-1 border-0" 
                            onClick={(e) => handleCopyId(e, c.complaintId)}
                            title="Click to copy Tracking ID"
                          >
                            <span>{c.complaintId}</span>
                            {copiedId === c.complaintId ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-muted" />}
                          </button>
                          <span className={`badge-status badge-${c.status}`}>{c.status}</span>
                        </div>
                        <h6 className="fw-bold text-white mb-1">{c.title}</h6>
                        <div className="d-flex gap-3 flex-wrap small text-muted" style={{ fontSize: '0.78rem' }}>
                          <span>Category: <strong className="text-white-50">{c.category}</strong></span>
                          <span>Priority: <span className={`badge-priority priority-${c.priority}`}>{c.priority}</span></span>
                          <span>
                            Location: <button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={(e) => handleCopyLocation(e, c.location)} title="Click to copy location"><strong>{c.location}</strong></button>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-between flex-shrink-0">
                      <Link to={`/complaints/${c._id}`} className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-1 py-2 px-3 text-white">
                        Track Progress <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
