import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

const COLORS = ['#00e676', '#448aff', '#ff5252', '#ffab40', '#e040fb', '#18ffff'];
const PRESET_REMINDERS = [0, 5, 30, 60, 1440];

export default function ScheduleModal({ schedule, onClose }) {
  const { addSchedule, updateSchedule, deleteSchedule, selectedDate } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#00e676');
  const [timezone, setTimezone] = useState(Utils.getUserTimezone());
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [activeReminders, setActiveReminders] = useState([0, 5, 30]);
  const [customReminderVal, setCustomReminderVal] = useState('');

  // Populate form if editing
  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title);
      setDescription(schedule.description || '');
      setDate(schedule.date);
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setColor(schedule.color);
      setTimezone(schedule.timezone || Utils.getUserTimezone());
      setRecurrence(schedule.recurrence);
      setRecurrenceDays(schedule.recurrenceDays || []);
      setActiveReminders(schedule.reminders || []);
    } else {
      // New schedule defaults
      setTitle('');
      setDescription('');
      setDate(Utils.toDateStr(selectedDate));
      
      const now = new Date();
      const h = now.getHours() + 1;
      setStartTime(`${String(h % 24).padStart(2, '0')}:00`);
      setEndTime(`${String((h + 1) % 24).padStart(2, '0')}:00`);
      setColor('#00e676');
      setTimezone(Utils.getUserTimezone());
      setRecurrence('none');
      setRecurrenceDays([]);
      setActiveReminders([0, 5, 30]);
    }
  }, [schedule, selectedDate]);

  const handleToggleRecurrenceDay = (day) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleToggleReminder = (mins) => {
    setActiveReminders((prev) =>
      prev.includes(mins) ? prev.filter((m) => m !== mins) : [...prev, mins]
    );
  };

  const handleAddCustomReminder = () => {
    const mins = parseInt(customReminderVal);
    if (!mins || mins < 1) return;
    if (!activeReminders.includes(mins)) {
      setActiveReminders((prev) => [...prev, mins]);
    }
    setCustomReminderVal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (Utils.timeToMinutes(startTime) >= Utils.timeToMinutes(endTime)) {
      alert('End time must be after start time');
      return;
    }

    if (recurrence === 'custom' && recurrenceDays.length === 0) {
      alert('Select at least one day for custom recurrence');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      color,
      recurrence,
      recurrenceDays,
      reminders: activeReminders,
      timezone,
    };

    if (schedule) {
      updateSchedule(schedule.id, payload);
    } else {
      addSchedule(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (schedule && window.confirm('Are you sure you want to delete this schedule?')) {
      deleteSchedule(schedule.id);
      onClose();
    }
  };

  // Helper text for custom minutes
  const formatReminderText = (m) => {
    if (m === 0) return 'On time';
    if (m < 60) return `${m} min`;
    if (m === 60) return '1 hour';
    if (m === 1440) return '1 day';
    return m % 60 === 0 ? `${m / 60} hr` : `${m} min`;
  };

  const allRemindersToRender = Array.from(new Set([...PRESET_REMINDERS, ...activeReminders])).sort((a, b) => a - b);

  return (
    <div id="schedule-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="sched-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="sched-modal-title" className="modal-title">
            {schedule ? 'Edit Schedule' : 'New Schedule'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form id="schedule-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sched-title">Title</label>
            <input
              type="text"
              id="sched-title"
              placeholder="Schedule name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="sched-description">Description</label>
            <textarea
              id="sched-description"
              placeholder="Add details..."
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sched-date">Date</label>
              <input
                type="date"
                id="sched-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <div className="color-picker" id="sched-color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot ${color === c ? 'active' : ''}`}
                    onClick={() => setColor(c)}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sched-start">Start Time</label>
              <input
                type="time"
                id="sched-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="sched-end">End Time</label>
              <input
                type="time"
                id="sched-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="sched-timezone">Timezone</label>
            <select
              id="sched-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {Utils.getTimezones().map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="sched-recurrence">Recurrence</label>
            <select
              id="sched-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Days</option>
            </select>
          </div>

          {recurrence === 'custom' && (
            <div className="form-group" id="sched-custom-days-group">
              <label>Select Days</label>
              <div className="day-toggles" id="sched-day-toggles">
                {[
                  { label: 'Mon', val: 1 },
                  { label: 'Tue', val: 2 },
                  { label: 'Wed', val: 3 },
                  { label: 'Thu', val: 4 },
                  { label: 'Fri', val: 5 },
                  { label: 'Sat', val: 6 },
                  { label: 'Sun', val: 0 },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    className={`day-toggle ${recurrenceDays.includes(d.val) ? 'active' : ''}`}
                    onClick={() => handleToggleRecurrenceDay(d.val)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Reminders</label>
            <div className="reminder-row">
              <div className="reminder-chips" id="sched-reminder-chips">
                {allRemindersToRender.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`reminder-chip ${activeReminders.includes(m) ? 'active' : ''}`}
                    onClick={() => handleToggleReminder(m)}
                  >
                    {formatReminderText(m)}
                  </button>
                ))}
              </div>
              <div className="custom-reminder-row">
                <input
                  type="number"
                  id="sched-custom-reminder"
                  min="1"
                  max="10080"
                  placeholder="mins"
                  className="custom-reminder-input"
                  value={customReminderVal}
                  onChange={(e) => setCustomReminderVal(e.target.value)}
                />
                <button
                  type="button"
                  id="sched-add-reminder"
                  className="btn btn-sm btn-primary"
                  onClick={handleAddCustomReminder}
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
          <div className="form-actions">
            {schedule && (
              <button
                type="button"
                id="sched-delete-btn"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <div className="form-actions-right" style={{ marginLeft: schedule ? 'auto' : 'none' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {schedule ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
