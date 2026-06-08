import React from 'react';

export default function HelpModal({ onClose }) {
  return (
    <div id="help-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="help-title" className="modal-title">How to Use TimeGraph</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="help-content">
          <div className="help-item">
            <div className="help-icon">📅</div>
            <div>
              <h3>Schedules</h3>
              <p>Time blocks on your timeline — lectures, study sessions, breaks. They represent your timetable.</p>
            </div>
          </div>
          <div className="help-item">
            <div className="help-icon">✅</div>
            <div>
              <h3>Tasks</h3>
              <p>Actionable items. Can be independent or linked to a schedule (e.g., "Complete Ch.1" under "Self Study").</p>
            </div>
          </div>
          <div className="help-item">
            <div className="help-icon">🔁</div>
            <div>
              <h3>Custom Recurrence</h3>
              <p>Set schedules to repeat on specific days like Mon/Wed/Fri.</p>
            </div>
          </div>
          <div className="help-item">
            <div className="help-icon">🔔</div>
            <div>
              <h3>Custom Reminders</h3>
              <p>Use presets or enter any custom minute value for reminders.</p>
            </div>
          </div>
          <div className="help-item">
            <div className="help-icon">👆</div>
            <div>
              <h3>Long-press</h3>
              <p>Long-press a task or schedule card for options: Edit, Reschedule, or Delete.</p>
            </div>
          </div>
          <div className="help-item">
            <div className="help-icon">↕️</div>
            <div>
              <h3>Drag & Drop</h3>
              <p>Long-press and drag schedule cards on the timeline to move/reschedule them.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
