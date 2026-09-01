import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token automatically if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // If FormData, let browser set multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Sanitize errors and handle 401 session expirations
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        localStorage.removeItem('token');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

const api = {
  // Complaints API
  submitComplaint: async (data) => {
    const res = await apiClient.post('/complaints', data);
    return res.data;
  },
  getMyComplaints: async () => {
    const res = await apiClient.get('/complaints/my');
    return res.data;
  },
  getOfficerComplaints: async () => {
    const res = await apiClient.get('/complaints/officer');
    return res.data;
  },
  getComplaintDetails: async (id) => {
    const res = await apiClient.get(`/complaints/${id}`);
    return res.data;
  },
  updateComplaintStatus: async (id, statusData) => {
    const res = await apiClient.put(`/complaints/${id}/status`, statusData);
    return res.data;
  },
  assignComplaint: async (id, assignData) => {
    const res = await apiClient.put(`/complaints/${id}/assign`, assignData);
    return res.data;
  },
  retryAIAnalysis: async (id) => {
    const res = await apiClient.put(`/complaints/${id}/retry-ai`);
    return res.data;
  },
  submitFeedback: async (id, feedbackData) => {
    const res = await apiClient.post(`/complaints/${id}/feedback`, feedbackData);
    return res.data;
  },
  deleteComplaint: async (id) => {
    const res = await apiClient.delete(`/complaints/${id}`);
    return res.data;
  },

  // Departments API
  getDepartments: async () => {
    const res = await apiClient.get('/departments');
    return res.data;
  },
  createDepartment: async (deptData) => {
    const res = await apiClient.post('/departments', deptData);
    return res.data;
  },
  getOfficers: async () => {
    const res = await apiClient.get('/departments/officers');
    return res.data;
  },

  // Notifications API
  getNotifications: async () => {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  markNotificationRead: async (id) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },

  // Admin API
  getAdminDashboard: async () => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data;
  },
  getAdminComplaints: async (filters = {}) => {
    const res = await apiClient.get('/admin/complaints', { params: filters });
    return res.data;
  },
  getAdminUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data;
  },
  getAdminAuditLogs: async () => {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data;
  }
};

export default api;

