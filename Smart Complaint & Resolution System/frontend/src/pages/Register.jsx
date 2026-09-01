import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Lock, Building, AlertTriangle, Sparkles } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [departmentName, setDepartmentName] = useState('Roads Department');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await register(name, email, password, role, role === 'DEPARTMENT_OFFICER' ? departmentName : null);
    setSubmitting(false);

    if (result.success) {
      showToast(`Welcome to CivicAI Resolver, ${name}!`, 'success');
      const userRole = result.user?.role;
      if (userRole === 'ADMIN') {
        navigate('/admin-dashboard');
      } else if (userRole === 'DEPARTMENT_OFFICER') {
        navigate('/officer-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      const msg = result.message || 'Registration failed';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin-dashboard');
      } else if (user.role === 'DEPARTMENT_OFFICER') {
        navigate('/officer-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: '90vh' }}>
      {/* Brand Header */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <div className="p-2 rounded-3 text-white" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)' }}>
          <Sparkles size={20} />
        </div>
        <span className="fw-bold fs-5 text-white">CivicAI Resolver</span>
      </div>

      <div className="glass-card p-4 p-md-5 w-100" style={{ maxWidth: '520px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Create Account</h2>
          <p className="text-muted small">Join as a citizen user or department resolution officer</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 border-0 rounded-3 bg-danger bg-opacity-25 text-white mb-4">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <span className="small">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted small fw-medium">Full Name</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <User size={16} />
              </span>
              <input
                type="text"
                className="form-control glass-input"
                placeholder="Rahul Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted small fw-medium">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="form-control glass-input"
                placeholder="rahul@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted small fw-medium">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="form-control glass-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted small fw-medium">Select System Role</label>
            <select
              className="form-select glass-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="USER">Citizen User (Grievance Filing & Tracking)</option>
              <option value="DEPARTMENT_OFFICER">Department Officer (Resolution & Review)</option>
              <option value="ADMIN">System Administrator (Full Oversight)</option>
            </select>
          </div>

          {role === 'DEPARTMENT_OFFICER' && (
            <div className="mb-4 p-3 rounded-3 bg-dark bg-opacity-40 border border-secondary border-opacity-10">
              <label className="form-label text-muted small fw-medium">Assigned Civic Department</label>
              <div className="input-group">
                <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                  <Building size={16} />
                </span>
                <select
                  className="form-select glass-input"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                >
                  <option value="Roads Department">Roads Department</option>
                  <option value="Electricity Department">Electricity Department</option>
                  <option value="Water Department">Water Department</option>
                  <option value="Sanitation Department">Sanitation Department</option>
                  <option value="Drainage Department">Drainage Department</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="btn glass-btn w-100 py-3 mb-3 d-flex justify-content-center align-items-center gap-2" disabled={submitting}>
            {submitting ? 'Registering Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-3 text-muted small">
          Already registered? <Link to="/login" className="text-indigo fw-semibold" style={{ color: '#818cf8', textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
