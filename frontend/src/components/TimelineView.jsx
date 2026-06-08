import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

const HOUR_H = 80;
const SNAP_MINUTES = 15;

export default function TimelineView({ onEditSchedule, onContextMenu }) {
  const {
    schedules,
    tasks,
    selectedDate,
    updateSchedule,
    completeTask,
    updateTask,
    showToast
  } = useStore();

  const [expandedScheduleId, setExpandedScheduleId] = useState(null);
  const [nowTime, setNowTime] = useState(new Date());

  const dragRef = useRef(null); // stores active drag data

  // Keep nowTime accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = Utils.toDateStr(selectedDate);
  
  // Filter schedules for target day
  // (Note: Store.getSchedulesForDate already filters recurrence; we will replicate that logic)
  const daySchedules = schedules.filter(schedule => {
    const sDate = Utils.parseDate(schedule.date);
    const targetDate = Utils.parseDate(dateStr);

    if (schedule.date === dateStr) return true;

    if (schedule.recurrence !== 'none' && sDate <= targetDate) {
      switch (schedule.recurrence) {
        case 'daily': return true;
        case 'weekly': return sDate.getDay() === targetDate.getDay();
        case 'monthly': return sDate.getDate() === targetDate.getDate();
        case 'custom':
          return schedule.recurrenceDays && schedule.recurrenceDays.includes(targetDate.getDay());
        default: return false;
      }
    }
    return false;
  });

  // Sort by start time
  daySchedules.sort((a, b) => Utils.timeToMinutes(a.startTime) - Utils.timeToMinutes(b.startTime));

  // Compute overlaps
  const groups = Utils.computeOverlapGroups(daySchedules);

  // Hour label formatter
  const formatHourLabel = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  // Scroll to current time or first schedule on mount/date change
  useEffect(() => {
    const scroller = document.getElementById('main-content');
    if (!scroller) return;

    const timeout = setTimeout(() => {
      const now = new Date();
      if (Utils.isSameDay(now, selectedDate)) {
        const mins = now.getHours() * 60 + now.getMinutes();
        const top = (mins / 60) * HOUR_H;
        scroller.scrollTop = Math.max(0, top - 150);
      } else {
        if (daySchedules.length > 0) {
          const mins = Utils.timeToMinutes(daySchedules[0].startTime);
          scroller.scrollTop = Math.max(0, (mins / 60) * HOUR_H - 50);
        } else {
          scroller.scrollTop = 8 * HOUR_H; // scroll to 8 AM by default
        }
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [dateStr]);

  // Pointer events for Drag and Drop
  const handlePointerDown = (e, scheduleId, cardEl) => {
    // Ignore click on interactive buttons or inline checklists
    if (
      e.target.closest('button') || 
      e.target.closest('.inline-task-check') || 
      e.target.closest('.task-card-check')
    ) {
      return;
    }

    const startTop = parseFloat(cardEl.style.top);
    const startY = e.clientY;

    const timeout = setTimeout(() => {
      startDrag(cardEl);
    }, 400); // 400ms drag engagement

    dragRef.current = {
      cardEl,
      scheduleId,
      pointerId: e.pointerId,
      startY,
      startTop,
      moved: false,
      active: false,
      timeout,
    };

    try {
      cardEl.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const startDrag = (cardEl) => {
    if (!dragRef.current) return;
    cardEl.classList.add('dragging');
    dragRef.current.active = true;
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 5) drag.moved = true;

    if (!drag.active) {
      // Cancel drag engagement if mouse moves too much before 400ms
      if (Math.abs(dy) > 10) {
        clearTimeout(drag.timeout);
        dragRef.current = null;
      }
      return;
    }

    e.preventDefault();
    const newTop = drag.startTop + dy;
    drag.cardEl.style.top = `${Math.max(0, newTop)}px`;
  };

  const handlePointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag) return;

    clearTimeout(drag.timeout);

    if (drag.active && drag.moved) {
      drag.cardEl.classList.remove('dragging');

      const finalTop = parseFloat(drag.cardEl.style.top);
      const newMinutes = (finalTop / HOUR_H) * 60;
      const snappedMinutes = Math.round(newMinutes / SNAP_MINUTES) * SNAP_MINUTES;

      const sched = schedules.find(s => s.id === drag.scheduleId);
      if (sched) {
        const origStart = Utils.timeToMinutes(sched.startTime);
        const origEnd = Utils.timeToMinutes(sched.endTime);
        const duration = origEnd - origStart;

        const newStart = Utils.minutesToTime(Math.max(0, Math.min(snappedMinutes, 1440 - duration)));
        const newEnd = Utils.minutesToTime(Math.max(0, Math.min(snappedMinutes + duration, 1440)));

        updateSchedule(sched.id, { startTime: newStart, endTime: newEnd });
        showToast('Schedule Moved', `${sched.title} → ${Utils.formatTime12(newStart)}`, 'success');
      }
    } else if (drag.active) {
      drag.cardEl.classList.remove('dragging');
    }

    dragRef.current = null;
  };

  const handlePointerCancel = () => {
    const drag = dragRef.current;
    if (!drag) return;
    clearTimeout(drag.timeout);
    drag.cardEl.classList.remove('dragging');
    dragRef.current = null;
  };

  // Render current time indicator
  const renderNowIndicator = () => {
    if (!Utils.isSameDay(nowTime, selectedDate)) return null;

    const mins = nowTime.getHours() * 60 + nowTime.getMinutes();
    const top = (mins / 60) * HOUR_H;
    const hStr = nowTime.getHours().toString().padStart(2, '0');
    const mStr = nowTime.getMinutes().toString().padStart(2, '0');
    const timeStr = Utils.formatTime12(`${hStr}:${mStr}`);

    return (
      <div className="timeline-now" style={{ top: `${top}px` }}>
        <div className="timeline-now-dot" />
        <div className="timeline-now-text">{timeStr}</div>
        <div className="timeline-now-line" />
      </div>
    );
  };

  // Render inline checklist inside expanded card
  const renderInlineTasks = (schedId, schedTasks) => {
    if (schedTasks.length === 0) {
      return (
        <div className="inline-tasks">
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '4px 0' }}>
            No tasks linked
          </div>
        </div>
      );
    }

    return (
      <div className="inline-tasks">
        {schedTasks.map((t) => {
          const isDone = t.status === 'completed';
          const checkSvg = (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          );

          return (
            <div key={t.id} className="inline-task-item">
              <div
                className={`inline-task-check ${isDone ? 'done' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDone) {
                    updateTask(t.id, { status: 'upcoming' });
                  } else {
                    completeTask(t.id);
                  }
                }}
              >
                {isDone && checkSvg}
              </div>
              <span className={`inline-task-title ${isDone ? 'done' : ''}`}>{t.title}</span>
              <div className={`priority-dot ${t.priority}`} />
            </div>
          );
        })}
      </div>
    );
  };

  // Render 24 hour rows
  const hourRows = [];
  for (let h = 0; h < 24; h++) {
    hourRows.push(
      <div key={h} className="timeline-hour" style={{ height: `${HOUR_H}px` }}>
        <span className="timeline-hour-label">{formatHourLabel(h)}</span>
        <div className="timeline-hour-line" />
      </div>
    );
  }

  // Long press / click triggers context menu
  const attachLongPressRef = (el, type, id) => {
    if (!el) return;

    let timer = null;
    let moved = false;
    let startX = 0, startY = 0;
    let menuTriggered = false;

    const onStart = (e) => {
      if (
        e.target.closest('button') || 
        e.target.closest('.inline-task-check') || 
        e.target.closest('.task-card-check')
      ) {
        return;
      }
      moved = false;
      menuTriggered = false;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      timer = setTimeout(() => {
        if (!moved && !el.classList.contains('dragging')) {
          menuTriggered = true;
          if (navigator.vibrate) navigator.vibrate(30);
          onContextMenu(type, id, startX, startY);
        }
      }, 500); // 500ms long press
    };

    const onMove = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
        moved = true;
        clearTimeout(timer);
      }
    };

    const onEnd = () => {
      clearTimeout(timer);
      if (menuTriggered) {
        const preventClick = (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
          window.removeEventListener('click', preventClick, true);
        };
        window.addEventListener('click', preventClick, true);
        setTimeout(() => window.removeEventListener('click', preventClick, true), 300);
      }
      menuTriggered = false;
    };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: false });
    el.addEventListener('mousedown', onStart);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onEnd);
  };

  return (
    <div id="timeline-view" className="timeline-view">
      <div 
        id="timeline-container" 
        className="timeline-container"
        style={{ height: `${24 * HOUR_H}px` }}
        onPointerMove={handlePointerMove}
      >
        {hourRows}
        {renderNowIndicator()}

        {daySchedules.map((sched, idx) => {
          const startMin = Utils.timeToMinutes(sched.startTime);
          const endMin = Utils.timeToMinutes(sched.endTime);
          const top = (startMin / 60) * HOUR_H;
          const height = Math.max(((endMin - startMin) / 60) * HOUR_H, 28);

          const group = groups[idx];
          const colCount = group ? group.total : 1;
          const colIdx = group ? group.index : 0;
          const widthPct = 100 / colCount;
          const leftPct = widthPct * colIdx;

          const schedTasks = tasks.filter(t => t.scheduleId === sched.id);
          const taskBadge = schedTasks.length > 0 ? (
            <div className="task-count-badge">📋 {schedTasks.length} task{schedTasks.length > 1 ? 's' : ''}</div>
          ) : null;

          const isExpanded = expandedScheduleId === sched.id;

          return (
            <div
              key={sched.id}
              ref={(el) => {
                if (el) attachLongPressRef(el, 'schedule', sched.id);
              }}
              className={`timeline-event ${isExpanded ? 'expanded' : ''}`}
              data-schedule-id={sched.id}
              onPointerDown={(e) => handlePointerDown(e, sched.id, e.currentTarget)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onClick={(e) => {
                // Ignore if clicking inline checks
                if (e.target.closest('.inline-task-check')) return;
                setExpandedScheduleId(prev => prev === sched.id ? null : sched.id);
              }}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(60px + ${leftPct}% * 0.88)`,
                width: `calc(${widthPct}% * 0.88 - 8px)`,
                borderLeft: `3px solid ${sched.color}`,
                background: `${sched.color}12`,
              }}
            >
              <div className="event-title" style={{ color: sched.color }}>{sched.title}</div>
              {height > 40 && (
                <div className="event-time">
                  {Utils.formatTime12(sched.startTime)} — {Utils.formatTime12(sched.endTime)}
                </div>
              )}
              {height > 60 && sched.description && (
                <div className="event-desc">{sched.description}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {taskBadge}
              </div>
              {isExpanded && renderInlineTasks(sched.id, schedTasks)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
