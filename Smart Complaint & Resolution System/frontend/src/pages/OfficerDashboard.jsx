import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { LogOut, List, Filter, Play, CheckCircle, AlertCircle, FileText, ChevronRight, Copy, Check, Building2, Shield, Search, ArrowRight, Clock, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportComplaintsToCSV } from '../utils/exportUtils';

const OfficerDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyId = (e, idText) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    showToast(`Copied complaint ID: ${idText}`, 'info', 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyLocation = (e, locText) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(locText);
    showToast(`Copied location: ${locText}`, 'info', 2000);
  };

  const fetchOfficerComplaints = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const data = await api.getOfficerComplaints();
      setComplaints(data);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      if (isManualRefresh) {
        showToast('Department queue refreshed', 'info', 1500);
      }
    } catch (err) {
      console.error('Error fetching officer complaints:', err);
      showToast('Error loading department records', 'error');
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOfficerComplaints();

    // Auto-refresh queue every 30 seconds for field officers
    const autoRefreshTimer = setInterval(() => {
      fetchOfficerComplaints(false);
    }, 30000);

    return () => clearInterval(autoRefreshTimer);
  }, [fetchOfficerComplaints]);

  // Live "X seconds ago" ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastUpdated]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const deptPrefix = (user?.department?.name || 'department-officer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = exportComplaintsToCSV(filteredComplaints, `${deptPrefix}-report`);
    if (result.success) {
      showToast(`Exported ${result.count} department records to CSV`, 'success');
    } else {
      showToast(result.message || 'No records to export', 'error');
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = !statusFilter || c.status === statusFilter;
    const matchesSearch = !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Counts
  const total = complaints.length;
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length;

  return (
    <div className="container py-4" style={{ maxWidth: '1240px' }}>
      {/* Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 glass-card p-3 px-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 rounded-3 text-white d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 0 16px rgba(245, 158, 11, 0.4)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-white" style={{ letterSpacing: '-0.02em' }}>Officer Resolution Hub</h5>
              <span className="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30 small" style={{ fontSize: '0.7rem' }}>
                {user?.department?.name || 'Assigned Department'}
              </span>
            </div>
            <span className="text-muted small">Officer: <strong className="text-white">{user?.name}</strong></span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Live Refresh Control */}
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small font-mono d-none d-sm-inline" style={{ fontSize: '0.72rem' }}>
              Auto-syncs every 30s • {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </span>
            <button 
              className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-1" 
              onClick={() => fetchOfficerComplaints(true)}
              disabled={refreshing}
              title="Refresh department queue"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-warning' : ''} />
              <span className="small">Refresh</span>
            </button>
          </div>

          <button className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-2" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="row g-3 mb-4">
        <div className="col-4">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Queue Total</span>
              <FileText size={18} className="text-muted opacity-50" />
            </div>
            <h3 className="fw-bold text-white mb-0 font-mono">{total}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Department tickets</span>
          </div>
        </div>
        <div className="col-4">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Active In-Progress</span>
              <Play size={18} className="text-warning opacity-75" />
            </div>
            <h3 className="fw-bold text-warning mb-0 font-mono">{inProgress}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Action underway</span>
          </div>
        </div>
        <div className="col-4">
          <div className="glass-card p-3 position-relative overflow-hidden">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted small fw-semibold">Resolved</span>
              <CheckCircle size={18} className="text-success opacity-75" />
            </div>
            <h3 className="fw-bold text-success mb-0 font-mono">{resolved}</h3>
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>SLA Completed</span>
          </div>
        </div>
      </div>

      {/* Main content table card */}
      <div className="glass-card p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-10">
          <div>
            <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <List size={20} className="text-warning" /> Department Assigned Queue ({filteredComplaints.length})
            </h5>
            <span className="text-muted small">Review evidence, update status, and record resolution notes</span>
          </div>
          
          {/* Search, Filter & CSV Export Toolbar */}
          <div className="d-flex align-items-center gap-2 flex-wrap w-100 w-md-auto">
            <button 
              className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-1 text-white py-1 px-3"
              onClick={handleExportCSV}
              disabled={filteredComplaints.length === 0}
              title="Download filtered records as CSV"
            >
              <Download size={14} className="text-warning" />
              <span>Export CSV</span>
            </button>

            <div className="input-group input-group-sm" style={{ minWidth: '180px' }}>
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <Search size={14} />
              </span>
              <input 
                type="text" 
                className="form-control glass-input py-1" 
                placeholder="Search ticket, ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-select form-select-sm glass-input py-1 px-3" 
              style={{ width: '140px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm mb-2 text-warning" role="status"></div>
            <p className="small">Loading department records...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <AlertCircle size={40} className="mb-2 opacity-50" />
            <p className="small mb-0">No complaints found matching this filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle border-secondary border-opacity-10 mb-0" style={{ background: 'transparent' }}>
              <thead>
                <tr className="text-muted small border-bottom border-secondary border-opacity-20" style={{ fontSize: '0.74rem' }}>
                  <th>TICKET ID</th>
                  <th>GRIEVANCE & DESCRIPTION</th>
                  <th>LOCATION</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map(c => (
                  <tr key={c._id} className="border-bottom border-secondary border-opacity-10">
                    <td>
                      <button 
                        className="btn btn-sm p-0 font-mono small text-white-50 d-flex align-items-center gap-1 border-0" 
                        onClick={(e) => handleCopyId(e, c.complaintId)}
                        title="Click to copy Complaint ID"
                      >
                        <span>{c.complaintId}</span>
                        {copiedId === c.complaintId ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-muted" />}
                      </button>
                    </td>
                    <td>
                      <span className="fw-bold text-white d-block mb-1">{c.title}</span>
                      <span className="text-muted small d-inline-block text-truncate" style={{ maxWidth: '320px', fontSize: '0.78rem' }}>{c.description}</span>
                    </td>
                    <td className="small text-muted">
                      <button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={(e) => handleCopyLocation(e, c.location)} title="Click to copy location">
                        {c.location}
                      </button>
                    </td>
                    <td>
                      <span className={`badge-priority priority-${c.priority}`}>{c.priority}</span>
                    </td>
                    <td>
                      <span className={`badge-status badge-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      <Link to={`/complaints/${c._id}`} className="btn btn-sm glass-btn-secondary d-flex align-items-center gap-1 w-fit py-1 px-3 text-white">
                        Review & Resolve <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;
