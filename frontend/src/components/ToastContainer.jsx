import React from 'react';
import { useStore } from '../store/StoreContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useStore();

  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: '🔔',
  };

  return (
    <div id="toast-container" className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">{icons[toast.type] || '🔔'}</span>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
