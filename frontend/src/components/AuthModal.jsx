import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';

export default function AuthModal({ onClose }) {
  const { user, login, register, logout, sync, isOnline, isSyncing } = useStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    try {
      if (isSignUp) {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err) {
      // toast alerts handled inside store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" role="dialog" aria-labelledby="auth-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="auth-modal-title" className="modal-title">
            {user ? 'Account Settings' : isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {user ? (
          /* Profile Details (Logged In) */
          <div className="help-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)' }}>
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>SIGNED IN AS</p>
              <p style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{user.email}</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Network Status:</span>
                <span style={{ color: isOnline ? '#00e676' : '#ffab40', fontWeight: 600 }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </p>
              <p style={{ fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cloud Syncing:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isSyncing ? 'Syncing now...' : 'Up to date'}
                </span>
              </p>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              💡 All schedule changes and tasks are saved locally on your device immediately. When you are online, changes automatically sync to the server database.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={sync}
                disabled={!isOnline || isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ flex: 1 }} 
                onClick={() => {
                  if (window.confirm('Are you sure you want to sign out? Local state will be cleared.')) {
                    logout();
                    onClose();
                  }
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Authentication Form (Logged Out) */
          <form id="auth-form" className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                type="email"
                id="auth-email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                type="password"
                id="auth-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 12px' }}>
              ℹ️ Connect your email to automatically sync your schedules across multiple devices. Your data will never be lost if you reinstall.
            </p>

            <div className="form-actions" style={{ flexDirection: 'column', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: 'var(--text-sm)', color: 'var(--accent)' }}
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
