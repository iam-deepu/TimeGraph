import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

const SWIPE_THRESHOLD = 100;

function TaskCard({ task, onToggleCheck, onContextMenu }) {
  const { schedules } = useStore();
  const cardRef = useRef(null);

  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const isCompleted = task.status === 'completed';
  const sched = task.scheduleId ? schedules.find((s) => s.id === task.scheduleId) : null;

  const checkSvg = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const priorityColors = { high: '#ff5252', normal: 'var(--accent)', low: '#448aff' };
  const priorityLabel =
    task.priority !== 'normal' ? (
      <span className="priority-indicator" style={{ color: priorityColors[task.priority] }}>
        {task.priority === 'high' ? '🔴' : '🔵'} {task.priority}
      </span>
    ) : null;

  const dueMeta = task.dueDate
    ? `${task.dueDate}${task.dueTime ? ' • ' + Utils.formatTime12(task.dueTime) : ''}`
    : 'No due date';

  // Swipe gesture listeners
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    swiping.current = true;
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (!swiping.current || !cardRef.current) return;
    currentX.current = e.touches[0].clientX;
    let dx = currentX.current - startX.current;
    if (dx < 0) dx = 0; // only swipe right to complete

    if (dx > SWIPE_THRESHOLD) {
      dx = SWIPE_THRESHOLD + (dx - SWIPE_THRESHOLD) * 0.3; // add spring resistance
    }

    cardRef.current.style.transform = `translateX(${dx}px)`;
    cardRef.current.style.opacity = `${1 - dx / (SWIPE_THRESHOLD * 2)}`;
  };

  const handleTouchEnd = () => {
    if (!swiping.current || !cardRef.current) return;
    swiping.current = false;
    const dx = currentX.current - startX.current;

    cardRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    if (dx >= SWIPE_THRESHOLD) {
      cardRef.current.style.transform = `translateX(${window.innerWidth}px)`;
      cardRef.current.style.opacity = '0';
      setTimeout(() => {
        onToggleCheck();
      }, 300);
    } else {
      cardRef.current.style.transform = 'translateX(0)';
      cardRef.current.style.opacity = '1';
    }
    currentX.current = 0;
  };

  // Attach long press handler
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let timer = null;
    let moved = false;
    let clickX = 0, clickY = 0;
    let menuTriggered = false;

    const onStart = (e) => {
      if (e.target.closest('button') || e.target.closest('.task-card-check')) {
        return;
      }
      moved = false;
      menuTriggered = false;
      const touch = e.touches ? e.touches[0] : e;
      clickX = touch.clientX;
      clickY = touch.clientY;

      timer = setTimeout(() => {
        if (!moved) {
          menuTriggered = true;
          if (navigator.vibrate) navigator.vibrate(30);
          onContextMenu(e, clickX, clickY);
        }
      }, 500); // 500ms long press
    };

    const onMove = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      if (Math.abs(touch.clientX - clickX) > 10 || Math.abs(touch.clientY - clickY) > 10) {
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

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('mousedown', onStart);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('mousedown', onStart);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onEnd);
    };
  }, [onContextMenu]);

  return (
    <div
      ref={cardRef}
      className="task-card"
      data-task-id={task.id}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`task-card-check ${isCompleted ? 'checked' : ''}`}
        style={{ borderColor: sched ? sched.color : 'var(--accent)' }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheck();
        }}
      >
        {isCompleted && checkSvg}
      </div>
      <div className="task-card-body">
        <div className={`task-card-title ${isCompleted ? 'completed-text' : ''}`}>{task.title}</div>
        <div className="task-card-meta">
          <span>{dueMeta}</span>
          {priorityLabel}
        </div>
      </div>
      <span className={`status-badge ${task.status}`}>{task.status}</span>
    </div>
  );
}

export default function TasksView({ onEditTask, onContextMenu }) {
  const { tasks, schedules, completeTask, updateTask } = useStore();
  const [sortBy, setSortBy] = useState('time'); // 'time' or 'priority'

  // Task lists categorizations
  const allTasks = [...tasks];

  // Group by status
  const groups = { upcoming: [], pending: [], rescheduled: [], completed: [] };
  allTasks.forEach((t) => {
    if (groups[t.status]) groups[t.status].push(t);
  });

  // Sorting helper
  const sortTasksList = (list) => {
    return list.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = a.dueDate ? a.dueDate + (a.dueTime || '23:59') : '9999-12-31';
        const timeB = b.dueDate ? b.dueDate + (b.dueTime || '23:59') : '9999-12-31';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        const pa = { high: 0, normal: 1, low: 2 };
        return (pa[a.priority] || 1) - (pa[b.priority] || 1);
      } else {
        const pa = { high: 0, normal: 1, low: 2 };
        const pDiff = (pa[a.priority] || 1) - (pa[b.priority] || 1);
        if (pDiff !== 0) return pDiff;
        const timeA = a.dueDate ? a.dueDate + (a.dueTime || '23:59') : '9999-12-31';
        const timeB = b.dueDate ? b.dueDate + (b.dueTime || '23:59') : '9999-12-31';
        return timeA.localeCompare(timeB);
      }
    });
  };

  const handleToggleTask = (task) => {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'upcoming' });
    } else {
      completeTask(task.id);
    }
  };

  // Filter linked vs independent tasks
  const schedulesWithTasks = schedules.filter(
    (s) => allTasks.filter((t) => t.scheduleId === s.id).length > 0
  );
  const independentTasks = allTasks.filter((t) => !t.scheduleId);

  // Group stats
  const totalCount = allTasks.length;
  const completedCount = groups.completed.length;
  const pendingCount = groups.pending.length;
  const upcomingCount = groups.upcoming.length;

  return (
    <div id="tasks-view" className="calendar-view">
      <div className="tasks-view-inner">
        {/* Header */}
        <div className="tasks-view-header">
          <h2 className="tasks-view-title">Tasks</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              id="tasks-sort-select"
              className="btn btn-ghost"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid var(--border-medium)',
                borderRadius: '4px',
                marginRight: '4px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="time">Sort by Time</option>
              <option value="priority">Sort by Priority</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="tasks-stats">
          <span className="stat-pill">{totalCount} total</span>
          <span className="stat-pill upcoming">{upcomingCount} upcoming</span>
          {pendingCount > 0 && <span className="stat-pill pending">{pendingCount} missed</span>}
          <span className="stat-pill completed">{completedCount} done</span>
        </div>

        {/* Schedule-linked tasks section */}
        {schedulesWithTasks.length > 0 && (
          <>
            <div className="tasks-section-title">📅 By Schedule</div>
            {schedulesWithTasks.map((sched) => {
              const schedTasks = sortTasksList(allTasks.filter((t) => t.scheduleId === sched.id));
              const doneCount = schedTasks.filter((t) => t.status === 'completed').length;

              return (
                <div key={sched.id} className="task-schedule-group">
                  <div
                    className="task-schedule-header"
                    style={{ borderLeft: `3px solid ${sched.color}`, paddingLeft: '10px' }}
                  >
                    <div className="task-schedule-name" style={{ color: sched.color }}>
                      {sched.title}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {doneCount}/{schedTasks.length} done
                    </span>
                  </div>
                  {schedTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onToggleCheck={() => handleToggleTask(t)}
                      onContextMenu={(e, x, y) => onContextMenu('task', t.id, x, y)}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* Independent tasks section */}
        {independentTasks.length > 0 && (
          <>
            <div className="tasks-section-title">📌 Independent Tasks</div>
            {sortTasksList(independentTasks).map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleCheck={() => handleToggleTask(t)}
                onContextMenu={(e, x, y) => onContextMenu('task', t.id, x, y)}
              />
            ))}
          </>
        )}

        {/* Empty placeholder if no active tasks */}
        {schedulesWithTasks.length === 0 && independentTasks.length === 0 && (
          <div className="tasks-empty">
            <div className="tasks-empty-icon">✅</div>
            <p>No tasks yet</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Tap + to create your first task
            </p>
          </div>
        )}

        {/* Missed / Pending Section */}
        {groups.pending.length > 0 && (
          <>
            <div className="tasks-section-title" style={{ color: '#ffab40' }}>
              ⚠️ Missed / Pending
            </div>
            {sortTasksList(groups.pending).map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleCheck={() => handleToggleTask(t)}
                onContextMenu={(e, x, y) => onContextMenu('task', t.id, x, y)}
              />
            ))}
          </>
        )}

        {/* Rescheduled Section */}
        {groups.rescheduled.length > 0 && (
          <>
            <div className="tasks-section-title" style={{ color: '#448aff' }}>
              🔄 Rescheduled
            </div>
            {sortTasksList(groups.rescheduled).map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleCheck={() => handleToggleTask(t)}
                onContextMenu={(e, x, y) => onContextMenu('task', t.id, x, y)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
