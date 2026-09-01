import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div 
        className="toast-container position-fixed top-0 end-0 p-3" 
        style={{ zIndex: 9999, maxWidth: '380px' }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              className={`p-3 mb-2 rounded-3 text-white shadow-lg d-flex align-items-center justify-content-between gap-3`}
              style={{
                background: isSuccess 
                  ? 'rgba(16, 185, 129, 0.95)' 
                  : isError 
                  ? 'rgba(239, 68, 68, 0.95)' 
                  : 'rgba(99, 102, 241, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                fontSize: '0.85rem'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                {isSuccess && <CheckCircle size={18} className="text-white flex-shrink-0" />}
                {isError && <AlertTriangle size={18} className="text-white flex-shrink-0" />}
                {isInfo && <Info size={18} className="text-white flex-shrink-0" />}
                <span className="fw-medium">{toast.message}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm p-0 text-white opacity-75 border-0"
                onClick={() => removeToast(toast.id)}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => console.log('Toast:', msg)
    };
  }
  return context;
};
