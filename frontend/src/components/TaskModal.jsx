import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

export default function TaskModal({ task, presetScheduleId, onClose, onOpenReschedule }) {
  const { addTask, updateTask, deleteTask, schedules, selectedDate } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('upcoming');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setScheduleId(task.scheduleId || '');
      setDueDate(task.dueDate || '');
      setDueTime(task.dueTime || '');
      setPriority(task.priority || 'normal');
      setStatus(task.status || 'upcoming');
    } else {
      setTitle('');
      setDescription('');
      setScheduleId(presetScheduleId || '');
      setDueDate(Utils.toDateStr(selectedDate));
      setDueTime('');
      setPriority('normal');
      setStatus('upcoming');
    }
  }, [task, presetScheduleId, selectedDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      scheduleId: scheduleId || null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
    };

    if (task) {
      // If status changed to rescheduled, open reschedule modal
      if (status === 'rescheduled' && status !== task.status) {
        onClose();
        onOpenReschedule(task.id);
        return;
      }
      updateTask(task.id, { ...payload, status });
    } else {
      addTask(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <div id="task-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="task-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="task-modal-title" className="modal-title">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form id="task-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-title">Title</label>
            <input
              type="text"
              id="task-title"
              placeholder="Task name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              placeholder="Add details..."
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-schedule-link">Link to Schedule</label>
            <select
              id="task-schedule-link"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
            >
              <option value="">Independent Task</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-due-date">Due Date</label>
              <input
                type="date"
                id="task-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-due-time">Due Time</label>
              <input
                type="time"
                id="task-due-time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <div className="priority-chips" id="task-priority-chips">
              {['low', 'normal', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`priority-chip ${priority === p ? 'active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {task && (
            <div className="form-group" id="task-status-group">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}

          <div className="form-actions">
            {task && (
              <button
                type="button"
                id="task-delete-btn"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <div className="form-actions-right" style={{ marginLeft: task ? 'auto' : 'none' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {task ? 'Update Task' : 'Save Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
