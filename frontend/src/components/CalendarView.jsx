import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

export default function CalendarView({ onEditSchedule }) {
  const { schedules, tasks, selectedDate, setSelectedDate } = useStore();

  const [viewMonth, setViewMonth] = useState({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
  });

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y--;
      }
      return { year: y, month: m };
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 11) {
        m = 0;
        y++;
      }
      return { year: y, month: m };
    });
  };

  const monthName = new Date(viewMonth.year, viewMonth.month, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const daysGrid = Utils.getMonthGrid(viewMonth.year, viewMonth.month);
  const todayStr = Utils.toDateStr(new Date());
  const selectedStr = Utils.toDateStr(selectedDate);

  const gridHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Helper to query schedules for a date (respecting recurrence)
  const getSchedulesForDate = (dateStr) => {
    const targetDate = Utils.parseDate(dateStr);
    const results = [];

    schedules.forEach((schedule) => {
      const sDate = Utils.parseDate(schedule.date);

      if (schedule.date === dateStr) {
        results.push(schedule);
        return;
      }

      if (schedule.recurrence !== 'none' && sDate <= targetDate) {
        let isMatch = false;
        switch (schedule.recurrence) {
          case 'daily':
            isMatch = true;
            break;
          case 'weekly':
            isMatch = sDate.getDay() === targetDate.getDay();
            break;
          case 'monthly':
            isMatch = sDate.getDate() === targetDate.getDate();
            break;
          case 'custom':
            isMatch = schedule.recurrenceDays && schedule.recurrenceDays.includes(targetDate.getDay());
            break;
          default:
            isMatch = false;
        }
        if (isMatch) {
          results.push(schedule);
        }
      }
    });

    results.sort((a, b) => Utils.timeToMinutes(a.startTime) - Utils.timeToMinutes(b.startTime));
    return results;
  };

  const selectedDaySchedules = getSchedulesForDate(selectedStr);
  const formattedSelectedDayName = Utils.getDayName(selectedStr, 'long');
  const selectedDayNum = selectedDate.getDate();
  const selectedMonthName = selectedDate.toLocaleString('en-US', { month: 'short' });

  return (
    <div id="calendar-view" className="calendar-view">
      <div className="calendar-nav">
        <button id="cal-prev" className="cal-nav-btn" onClick={handlePrevMonth} aria-label="Previous Month">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span id="cal-month-label" className="cal-month-label">
          {monthName}
        </span>
        <button id="cal-next" className="cal-nav-btn" onClick={handleNextMonth} aria-label="Next Month">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="calendar-grid-header" id="cal-grid-header">
        {gridHeaders.map((day) => (
          <div key={day} className="cal-header-cell">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid" id="cal-grid">
        {daysGrid.map(({ date, otherMonth }, idx) => {
          const dateStr = Utils.toDateStr(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const dayScheds = getSchedulesForDate(dateStr);

          let classes = 'cal-day';
          if (otherMonth) classes += ' other-month';
          if (isToday) classes += ' today';
          if (isSelected) classes += ' selected';

          return (
            <div
              key={idx}
              className={classes}
              onClick={() => {
                setSelectedDate(date);
                setViewMonth({ year: date.getFullYear(), month: date.getMonth() });
              }}
            >
              {date.getDate()}
              <div className="cal-day-dots">
                {dayScheds.slice(0, 3).map((s) => (
                  <div key={s.id} className="cal-day-event-dot" style={{ background: s.color }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="calendar-day-events" id="cal-day-events">
        {selectedDaySchedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              No schedules on {formattedSelectedDayName}, {selectedMonthName} {selectedDayNum}
            </p>
          </div>
        ) : (
          selectedDaySchedules.map((s) => {
            const schedTasks = tasks.filter((t) => t.scheduleId === s.id);
            const taskInfo = schedTasks.length > 0 ? (
              <span className="task-count-badge">📋 {schedTasks.length}</span>
            ) : null;

            return (
              <div key={s.id} className="cal-event-item" onClick={() => onEditSchedule(s)}>
                <div className="cal-event-color" style={{ background: s.color }} />
                <div className="cal-event-info">
                  <div className="cal-event-title">{s.title}</div>
                  <div className="cal-event-time">
                    {Utils.formatTime12(s.startTime)} — {Utils.formatTime12(s.endTime)}
                  </div>
                </div>
                {taskInfo}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
