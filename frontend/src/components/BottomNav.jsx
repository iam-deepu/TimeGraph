import React from 'react';

export default function BottomNav({ currentView, onViewChange }) {
  return (
    <nav id="bottom-nav" className="bottom-nav">
      <button
        className={`nav-item ${currentView === 'timeline' ? 'active' : ''}`}
        onClick={() => onViewChange('timeline')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Timetable</span>
      </button>

      <button
        className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
        onClick={() => onViewChange('calendar')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
        </svg>
        <span>Calendar</span>
      </button>

      <button
        className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
        onClick={() => onViewChange('tasks')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>Tasks</span>
      </button>
    </nav>
  );
}
