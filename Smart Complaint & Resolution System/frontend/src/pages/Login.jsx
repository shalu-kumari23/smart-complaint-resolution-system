import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, AlertTriangle, Sparkles, User, Shield, Building2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      showToast(`Welcome back, ${result.user?.name || 'User'}!`, 'success');
      const userRole = result.user?.role;
      if (userRole === 'ADMIN') {
        navigate('/admin-dashboard');
      } else if (userRole === 'DEPARTMENT_OFFICER') {
        navigate('/officer-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      const msg = result.message || 'Invalid email or password';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    showToast(`Loaded demo credentials for ${demoEmail}`, 'info', 1500);
  };

  // Listen to user updates if already logged in
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

      <div className="glass-card p-4 p-md-5 w-100" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Welcome Back</h2>
          <p className="text-muted small">Access your civic dashboard & resolution tracking</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 border-0 rounded-3 bg-danger bg-opacity-25 text-white mb-4">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <span className="small">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted small fw-medium">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="form-control glass-input"
                placeholder="name@civic.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-muted small fw-medium">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary border-opacity-10 text-muted">
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="form-control glass-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn glass-btn w-100 py-3 mb-4 d-flex justify-content-center align-items-center gap-2" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* 1-Click Demo Logins */}
        <div className="p-3 rounded-3 bg-dark bg-opacity-40 border border-secondary border-opacity-10 mb-3">
          <span className="text-muted small d-block mb-2 fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
            ⚡ 1-CLICK DEMO ACCOUNT SELECTOR:
          </span>
          <div className="row g-2">
            <div className="col-6">
              <button 
                type="button" 
                className="btn btn-sm btn-dark w-100 border border-secondary border-opacity-10 text-start py-1 px-2 d-flex align-items-center gap-1"
                onClick={() => handleDemoFill('user1@gmail.com', 'user123')}
                style={{ fontSize: '0.74rem' }}
              >
                <User size={12} className="text-indigo" /> <span>Citizen (User 1)</span>
              </button>
            </div>
            <div className="col-6">
              <button 
                type="button" 
                className="btn btn-sm btn-dark w-100 border border-secondary border-opacity-10 text-start py-1 px-2 d-flex align-items-center gap-1"
                onClick={() => handleDemoFill('roads_officer@civic.gov', 'officer123')}
                style={{ fontSize: '0.74rem' }}
              >
                <Building2 size={12} className="text-warning" /> <span>Roads Officer</span>
              </button>
            </div>
            <div className="col-6">
              <button 
                type="button" 
                className="btn btn-sm btn-dark w-100 border border-secondary border-opacity-10 text-start py-1 px-2 d-flex align-items-center gap-1"
                onClick={() => handleDemoFill('elec_officer@civic.gov', 'officer123')}
                style={{ fontSize: '0.74rem' }}
              >
                <Building2 size={12} className="text-info" /> <span>Elec. Officer</span>
              </button>
            </div>
            <div className="col-6">
              <button 
                type="button" 
                className="btn btn-sm btn-dark w-100 border border-secondary border-opacity-10 text-start py-1 px-2 d-flex align-items-center gap-1"
                onClick={() => handleDemoFill('admin@civic.gov', 'admin123')}
                style={{ fontSize: '0.74rem' }}
              >
                <Shield size={12} className="text-success" /> <span>Super Admin</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-muted small">
          Don't have an account? <Link to="/register" className="text-indigo fw-semibold" style={{ color: '#818cf8', textDecoration: 'none' }}>Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
