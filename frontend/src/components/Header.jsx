import React from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

export default function Header({ currentView, onHelpOpen, onAuthOpen, onAddOpen }) {
  const { selectedDate, user, isOnline, isSyncing } = useStore();

  const titleMap = {
    timeline: 'Schedule',
    calendar: 'Calendar',
    tasks: 'Tasks',
  };

  return (
    <header id="app-header" className="app-header">
      <div className="header-left">
        <span id="header-date" className="header-date">
          {Utils.formatDateHeader(selectedDate)}
        </span>
        <h1 id="header-title" className="header-title">
          {titleMap[currentView] || 'Schedule'}
        </h1>
      </div>
      <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Connection status dot for premium feedback */}
        {user && (
          <div 
            className={`sync-indicator-dot ${isSyncing ? 'syncing' : isOnline ? 'online' : 'offline'}`}
            title={isSyncing ? 'Syncing...' : isOnline ? 'Connected & Synced' : 'Offline Mode'}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isSyncing ? '#448aff' : isOnline ? '#00e676' : '#ffab40',
              boxShadow: isSyncing ? '0 0 8px #448aff' : isOnline ? '0 0 8px #00e676' : '0 0 8px #ffab40',
              transition: 'background-color 0.3s'
            }}
          />
        )}

        {/* User Account / Auth Toggle */}
        <button 
          onClick={onAuthOpen} 
          className="header-btn" 
          aria-label="Profile"
          style={{ position: 'relative' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={user ? '#00e676' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {/* Help button */}
        <button onClick={onHelpOpen} className="header-btn" aria-label="Help">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Add Event/Task Button */}
        <button onClick={onAddOpen} className="header-btn header-btn-add" aria-label="Add">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
