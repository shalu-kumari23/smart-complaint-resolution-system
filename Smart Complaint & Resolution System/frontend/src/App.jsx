import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintDetail from './pages/ComplaintDetail';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center text-muted">
        <div className="spinner-border text-indigo" role="status"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to respective dashboard if role is incorrect
    if (user?.role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
    if (user?.role === 'DEPARTMENT_OFFICER') return <Navigate to="/officer-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Officer routes */}
          <Route 
            path="/officer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['DEPARTMENT_OFFICER']}>
                <OfficerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Universal details tracking route */}
          <Route 
            path="/complaints/:id" 
            element={
              <ProtectedRoute>
                <ComplaintDetail />
              </ProtectedRoute>
            } 
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ToastProvider>
  );
};

export default App;
