import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

export default function RescheduleModal({ taskId, onClose }) {
  const { rescheduleTask, tasks } = useStore();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setDate(task.dueDate || Utils.toDateStr(new Date()));
      setTime(task.dueTime || '');
    }
  }, [taskId, tasks]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;

    rescheduleTask(taskId, date, time || null);
    onClose();
  };

  return (
    <div id="reschedule-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" role="dialog" aria-labelledby="reschedule-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="reschedule-title" className="modal-title">Reschedule Task</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form id="reschedule-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reschedule-date">New Date</label>
            <input
              type="date"
              id="reschedule-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reschedule-time">New Time</label>
            <input
              type="time"
              id="reschedule-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Reschedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
