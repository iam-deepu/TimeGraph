/* ============================================
   TimeGraph — Timeline Renderer (Schedules)
   ============================================ */

const Timeline = (() => {
  const HOUR_H = 80;
  let _expandedScheduleId = null;

  function init() {
    refresh();
    setTimeout(_scrollToNow, 100);
  }

  function refresh() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    const dateStr = Utils.toDateStr(Store.getSelectedDate());
    const schedules = Store.getSchedulesForDate(dateStr);

    let html = '';

    // Hour rows 0-23
    for (let h = 0; h < 24; h++) {
      const label = _hourLabel(h);
      html += `<div class="timeline-hour" style="height:${HOUR_H}px">
        <span class="timeline-hour-label">${label}</span>
        <div class="timeline-hour-line"></div>
      </div>`;
    }

    // Current time indicator
    const now = new Date();
    const sel = Store.getSelectedDate();
    if (Utils.isSameDay(now, sel)) {
      const mins = now.getHours() * 60 + now.getMinutes();
      const top = (mins / 60) * HOUR_H;
      const hStr = now.getHours().toString().padStart(2, '0');
      const mStr = now.getMinutes().toString().padStart(2, '0');
      const timeStr = Utils.formatTime12(`${hStr}:${mStr}`);
      html += `<div class="timeline-now" style="top:${top}px">
        <div class="timeline-now-dot"></div>
        <div class="timeline-now-text">${timeStr}</div>
        <div class="timeline-now-line"></div>
      </div>`;
    }

    // Compute overlaps
    const groups = Utils.computeOverlapGroups(schedules);

    // Render schedule cards
    schedules.forEach((sched, idx) => {
      const startMin = Utils.timeToMinutes(sched.startTime);
      const endMin = Utils.timeToMinutes(sched.endTime);
      const top = (startMin / 60) * HOUR_H;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_H, 28);

      const group = groups[idx];
      const colCount = group ? group.total : 1;
      const colIdx = group ? group.index : 0;
      const widthPct = 100 / colCount;
      const leftPct = widthPct * colIdx;

      // Task count
      const tasks = Store.getTasksForSchedule(sched.id);
      const taskBadge = tasks.length > 0
        ? `<div class="task-count-badge">📋 ${tasks.length} task${tasks.length > 1 ? 's' : ''}</div>`
        : '';

      // Removed recurrence indicator per user request

      const isExpanded = _expandedScheduleId === sched.id;

      html += `<div class="timeline-event ${isExpanded ? 'expanded' : ''}" data-schedule-id="${sched.id}"
        style="top:${top}px;height:${height}px;left:calc(60px + ${leftPct}% * 0.88);width:calc(${widthPct}% * 0.88 - 8px);
        border-left:3px solid ${sched.color};background:${sched.color}12;">
        <div class="event-title" style="color:${sched.color}">${sched.title}</div>
        ${height > 40 ? `<div class="event-time">${Utils.formatTime12(sched.startTime)} — ${Utils.formatTime12(sched.endTime)}</div>` : ''}
        ${height > 60 && sched.description ? `<div class="event-desc">${sched.description}</div>` : ''}
        <div style="display:flex;align-items:center;gap:6px;">
          ${taskBadge}
        </div>
        ${isExpanded ? _renderInlineTasks(sched.id, tasks) : ''}
      </div>`;
    });

    container.innerHTML = html;
    container.style.height = `${24 * HOUR_H}px`;

    // Click → expand tasks inline; Long-press → context menu
    container.querySelectorAll('.timeline-event').forEach(el => {
      const schedId = el.dataset.scheduleId;

      // Single click to toggle task expansion
      el.addEventListener('click', (e) => {
        if (e.target.closest('.inline-task-check')) return; // handled separately
        _expandedScheduleId = _expandedScheduleId === schedId ? null : schedId;
        refresh();
      });

      // Long-press for context menu
      ContextMenu.attachLongPress(el, 'schedule', schedId);
    });

    // Inline task check toggles
    container.querySelectorAll('.inline-task-check').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = el.dataset.taskId;
        const task = Store.getTask(taskId);
        if (task) {
          if (task.status === 'completed') {
            Store.updateTask(taskId, { status: 'upcoming' });
          } else {
            Store.completeTask(taskId);
          }
          refresh();
        }
      });
    });
  }

  function _renderInlineTasks(schedId, tasks) {
    if (tasks.length === 0) {
      return `<div class="inline-tasks"><div style="color:var(--text-muted);font-size:11px;padding:4px 0;">No tasks linked</div></div>`;
    }
    let html = '<div class="inline-tasks">';
    tasks.forEach(t => {
      const done = t.status === 'completed';
      const checkSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      html += `<div class="inline-task-item">
        <div class="inline-task-check ${done ? 'done' : ''}" data-task-id="${t.id}">${done ? checkSvg : ''}</div>
        <span class="inline-task-title ${done ? 'done' : ''}">${t.title}</span>
        <div class="priority-dot ${t.priority}"></div>
      </div>`;
    });
    html += '</div>';
    return html;
  }

  function _hourLabel(h) {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  }

  function _scrollToNow() {
    const scroller = document.getElementById('main-content');
    if (!scroller) return;
    setTimeout(() => {
      const now = new Date();
      const sel = Store.getSelectedDate();
      if (Utils.isSameDay(now, sel)) {
        const mins = now.getHours() * 60 + now.getMinutes();
        const top = (mins / 60) * HOUR_H;
        scroller.scrollTop = Math.max(0, top - 150);
      } else {
        // Scroll to first schedule
        const schedules = Store.getSchedulesForDate(Utils.toDateStr(sel));
        if (schedules.length > 0) {
          const mins = Utils.timeToMinutes(schedules[0].startTime);
          scroller.scrollTop = Math.max(0, (mins / 60) * HOUR_H - 50);
        } else {
          scroller.scrollTop = 8 * HOUR_H;
        }
      }
    }, 10);
  }

  return { init, refresh, scrollToNow: () => _scrollToNow(document.getElementById('timeline-container')) };
})();
