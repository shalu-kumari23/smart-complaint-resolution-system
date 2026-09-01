import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Brain, Activity, MapPin, CheckCircle, ArrowRight, Zap, Sparkles, Building2, UserCheck, BarChart3, AlertCircle } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="container py-4 my-2" style={{ maxWidth: '1200px' }}>
      {/* Top Navigation Bar */}
      <div className="d-flex justify-content-between align-items-center mb-5 glass-card p-3 px-4">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h5 className="fw-bold text-white mb-0" style={{ letterSpacing: '-0.02em' }}>CivicAI Resolver</h5>
            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>Smart Complaint & Resolution System</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/login" className="btn btn-sm glass-btn-secondary px-3 py-2">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-sm glass-btn px-3 py-2">
            Register Account
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="row align-items-center py-5 mb-5 glass-card p-4 p-lg-5 position-relative overflow-hidden">
        <div className="col-lg-7 position-relative" style={{ zIndex: 2 }}>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3" style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
            <span className="badge rounded-pill bg-indigo text-white px-2 py-1 font-mono" style={{ fontSize: '0.7rem', background: '#6366f1' }}>v2.0 ACTIVE</span>
            <span className="small text-white-50" style={{ fontSize: '0.8rem' }}>Next-Gen Civic Intelligence Platform</span>
          </div>

          <h1 className="display-4 fw-extrabold mb-3 text-white" style={{ letterSpacing: '-0.03em', lineHeight: '1.12' }}>
            AI-Driven Public Grievance & <br />
            <span className="text-gradient">Instant Resolution Hub</span>
          </h1>

          <p className="text-muted mb-4 fs-5" style={{ lineHeight: '1.6', maxWidth: '580px' }}>
            Revolutionizing public administration with NLP auto-routing, real-time TF-IDF duplicate filtering, live hotspot geolocation, and department SLA tracking.
          </p>

          <div className="d-flex gap-3 flex-wrap mb-4">
            <Link to="/login" className="btn glass-btn px-4 py-3 fs-6">
              File a Grievance <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn glass-btn-secondary px-4 py-3 fs-6">
              Join as Officer / Citizen
            </Link>
          </div>

          {/* Supported Categories Pills */}
          <div className="d-flex align-items-center gap-2 flex-wrap pt-2">
            <span className="text-muted small">Auto-Routed:</span>
            {['Roads', 'Electricity', 'Street Lights', 'Water Supply', 'Sanitation', 'Drainage'].map(cat => (
              <span key={cat} className="badge bg-dark bg-opacity-50 text-white-50 border border-secondary border-opacity-10 px-2 py-1" style={{ fontSize: '0.72rem' }}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="col-lg-5 text-center mt-5 mt-lg-0 position-relative" style={{ zIndex: 2 }}>
          <div className="p-4 rounded-4 glass-card border-indigo bg-dark bg-opacity-40 animate-float" style={{ border: '1px solid rgba(129, 140, 248, 0.3)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-10">
              <span className="fw-bold text-white small d-flex align-items-center gap-2">
                <Activity size={16} className="text-success" /> Live Telemetry Matrix
              </span>
              <span className="badge bg-success bg-opacity-20 text-success font-mono" style={{ fontSize: '0.7rem' }}>ONLINE</span>
            </div>

            <div className="row g-3 text-start">
              <div className="col-6">
                <div className="p-3 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-10">
                  <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>Classification Speed</span>
                  <h3 className="fw-bold text-white mb-0 font-mono">0.4<span className="fs-6 text-muted">s</span></h3>
                  <span className="text-success small" style={{ fontSize: '0.68rem' }}>FastAPI Pipeline</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-10">
                  <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>Routing Accuracy</span>
                  <h3 className="fw-bold text-gradient-cyan mb-0 font-mono">98.4%</h3>
                  <span className="text-info small" style={{ fontSize: '0.68rem' }}>NLP + Scikit-Learn</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-10">
                  <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>Duplicate Detection</span>
                  <h3 className="fw-bold text-gradient-amber mb-0 font-mono">Cosine</h3>
                  <span className="text-warning small" style={{ fontSize: '0.68rem' }}>TF-IDF Matrix</span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-3 bg-dark bg-opacity-60 border border-secondary border-opacity-10">
                  <span className="text-muted small d-block mb-1" style={{ fontSize: '0.72rem' }}>SLA Resolution</span>
                  <h3 className="fw-bold text-success mb-0 font-mono">&lt; 24<span className="fs-6 text-muted">h</span></h3>
                  <span className="text-success small" style={{ fontSize: '0.68rem' }}>Automated Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Demo Portal Quick Access */}
      <div className="mb-5">
        <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
          <Zap size={20} className="text-indigo" style={{ color: '#818cf8' }} /> Explore System Portals (1-Click Login Shortcuts)
        </h4>
        <div className="row g-3">
          <div className="col-md-4">
            <Link to="/login" className="glass-card p-4 d-block text-decoration-none glass-card-interactive h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="p-3 rounded-3 bg-indigo bg-opacity-20 text-indigo" style={{ color: '#818cf8' }}>
                  <UserCheck size={24} />
                </div>
                <span className="badge bg-indigo bg-opacity-20 text-indigo" style={{ color: '#818cf8' }}>Citizen Role</span>
              </div>
              <h5 className="fw-bold text-white mb-2">Citizen Portal</h5>
              <p className="text-muted small mb-3">
                File complaints with photos & locations, receive real-time AI assessments, track 5-stage progress, and submit ratings.
              </p>
              <span className="text-indigo small fw-bold d-flex align-items-center gap-1" style={{ color: '#818cf8' }}>
                Open Portal <ArrowRight size={14} />
              </span>
            </Link>
          </div>

          <div className="col-md-4">
            <Link to="/login" className="glass-card p-4 d-block text-decoration-none glass-card-interactive h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="p-3 rounded-3 bg-warning bg-opacity-20 text-warning">
                  <Building2 size={24} />
                </div>
                <span className="badge bg-warning bg-opacity-20 text-warning">Officer Role</span>
              </div>
              <h5 className="fw-bold text-white mb-2">Department Officer Portal</h5>
              <p className="text-muted small mb-3">
                Access assigned department queues (Roads, Electricity, Sanitation), manage ticket status, and upload resolution proof.
              </p>
              <span className="text-warning small fw-bold d-flex align-items-center gap-1">
                Open Portal <ArrowRight size={14} />
              </span>
            </Link>
          </div>

          <div className="col-md-4">
            <Link to="/login" className="glass-card p-4 d-block text-decoration-none glass-card-interactive h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="p-3 rounded-3 bg-success bg-opacity-20 text-success">
                  <BarChart3 size={24} />
                </div>
                <span className="badge bg-success bg-opacity-20 text-success">Super Admin</span>
              </div>
              <h5 className="fw-bold text-white mb-2">Executive Admin Hub</h5>
              <p className="text-muted small mb-3">
                Full analytics charts, Leaflet grievance hotspot map, department creation, AI reliability insights, and audit trails.
              </p>
              <span className="text-success small fw-bold d-flex align-items-center gap-1">
                Open Portal <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Advanced Capabilities Grid */}
      <h4 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
        <Sparkles size={20} className="text-indigo" style={{ color: '#818cf8' }} /> Core Architectural Modules
      </h4>
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="p-4 glass-card h-100">
            <div className="p-3 rounded-3 bg-indigo bg-opacity-10 text-indigo mb-3 d-inline-block" style={{ color: '#818cf8' }}>
              <Brain size={26} />
            </div>
            <h5 className="fw-bold text-white mb-2">Predictive AI Dispatch</h5>
            <p className="text-muted small">
              Deep NLP model classifies grievance category, computes urgency priority, evaluates sentiment polarity, and predicts SLA time.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-4 glass-card h-100">
            <div className="p-3 rounded-3 bg-success bg-opacity-10 text-success mb-3 d-inline-block">
              <Shield size={26} />
            </div>
            <h5 className="fw-bold text-white mb-2">TF-IDF Duplicate Filtering</h5>
            <p className="text-muted small">
              Scans incoming grievance text against database records using pure-Python vector cosine similarity to eliminate duplicate dispatches.
            </p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-4 glass-card h-100">
            <div className="p-3 rounded-3 bg-warning bg-opacity-10 text-warning mb-3 d-inline-block">
              <MapPin size={26} />
            </div>
            <h5 className="fw-bold text-white mb-2">Interactive Hotspot Maps</h5>
            <p className="text-muted small">
              Geolocates municipal tickets with glowing category-coded pins to pinpoint infrastructure breakdown zones across city zones.
            </p>
          </div>
        </div>
      </div>

      {/* Modern Footer */}
      <div className="glass-card p-4 text-center text-muted small">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>AI-Powered Smart Complaint & Resolution System © 2026.</span>
          <span className="d-flex align-items-center gap-2 text-white-50">
            <span className="p-1 rounded-circle bg-success"></span> All Services Operational (Port 5173 / 5000 / 8000)
          </span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
