/* ============================================
   TimeGraph — Main Application Controller
   ============================================ */

const App = (() => {
  let _currentView = 'timeline';
  let _weekOffset = 0;
  let _tasksSortBy = 'time'; // 'time' or 'priority'

  function init() {
    Store.init();
    Notifications.init();
    EventModal.init();
    ContextMenu.init();
    CalendarView.init();

    _setupNavigation();
    _setupDayStrip();
    _setupAddButton();

    Store.subscribe((action) => {
      if (action === 'dateChange') {
        _updateHeader();
        _updateDayStrip();
        if (_currentView === 'timeline') Timeline.refresh();
        if (_currentView === 'calendar') CalendarView.refresh();
      }
    });

    _updateHeader();
    _renderDayStrip();
    Timeline.init();
    DragDrop.init();

    // Schedule reminders
    Notifications.rescheduleAll(Store.getAllSchedules());

    if (Store.getAllSchedules().length === 0) {
      _addSampleData();
    }
  }

  function _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => _switchView(btn.dataset.view));
    });
  }

  function _switchView(view) {
    _currentView = view;
    document.querySelectorAll('.nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.view === view)
    );

    const timelineView = document.getElementById('timeline-view');
    const calendarView = document.getElementById('calendar-view');
    const tasksView = document.getElementById('tasks-view');

    timelineView.classList.add('hidden');
    calendarView.classList.add('hidden');
    tasksView.classList.add('hidden');

    if (view === 'timeline') {
      timelineView.classList.remove('hidden');
      Timeline.refresh();
      Timeline.scrollToNow();
      DragDrop.init();
    } else if (view === 'calendar') {
      calendarView.classList.remove('hidden');
      CalendarView.render();
    } else if (view === 'tasks') {
      tasksView.classList.remove('hidden');
      _renderTasksView();
    }
  }

  function _sortTasks(tasks) {
    if (!tasks) return [];
    return tasks.sort((a, b) => {
      if (_tasksSortBy === 'time') {
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
  }

  // ======== TASKS VIEW ========
  function _renderTasksView() {
    const container = document.getElementById('tasks-view');
    const statusGroups = Store.getTasksByStatus();
    const allSchedules = Store.getAllSchedules();

    let html = '<div class="tasks-view-inner">';

    // Header
    html += `<div class="tasks-view-header">
      <h2 class="tasks-view-title">Tasks</h2>
      <div style="display:flex; gap:8px;">
        <select id="tasks-sort-select" class="btn btn-ghost" style="padding:4px 8px; font-size:12px; border:1px solid var(--border-medium); border-radius:4px; margin-right:4px;">
          <option value="time" ${_tasksSortBy === 'time' ? 'selected' : ''}>Sort by Time</option>
          <option value="priority" ${_tasksSortBy === 'priority' ? 'selected' : ''}>Sort by Priority</option>
        </select>
      </div>
    </div>`;

    // Stats bar
    const total = Store.getAllTasks().length;
    const completed = statusGroups.completed.length;
    const pending = statusGroups.pending.length;
    html += `<div class="tasks-stats">
      <span class="stat-pill">${total} total</span>
      <span class="stat-pill upcoming">${statusGroups.upcoming.length} upcoming</span>
      ${pending > 0 ? `<span class="stat-pill pending">${pending} missed</span>` : ''}
      <span class="stat-pill completed">${completed} done</span>
    </div>`;

    // ---------- SCHEDULE-LINKED TASKS ----------
    const schedulesWithTasks = allSchedules.filter(s => Store.getTasksForSchedule(s.id).length > 0);

    if (schedulesWithTasks.length > 0) {
      html += '<div class="tasks-section-title">📅 By Schedule</div>';
      schedulesWithTasks.forEach(sched => {
        const tasks = _sortTasks(Store.getTasksForSchedule(sched.id));
        const doneCount = tasks.filter(t => t.status === 'completed').length;
        html += `<div class="task-schedule-group">
          <div class="task-schedule-header" style="border-left:3px solid ${sched.color};padding-left:10px;">
            <div class="task-schedule-name" style="color:${sched.color}">${sched.title}</div>
            <span style="font-size:11px;color:var(--text-muted);">${doneCount}/${tasks.length} done</span>
          </div>
          ${tasks.map(t => _taskCard(t)).join('')}
        </div>`;
      });
    }

    // ---------- INDEPENDENT TASKS ----------
    const independent = _sortTasks(Store.getIndependentTasks());
    if (independent.length > 0) {
      html += '<div class="tasks-section-title">📌 Independent Tasks</div>';
      independent.forEach(t => { html += _taskCard(t); });
    }

    // ---------- STATUS SECTIONS (if empty above) ----------
    if (schedulesWithTasks.length === 0 && independent.length === 0) {
      html += `<div class="tasks-empty">
        <div class="tasks-empty-icon">✅</div>
        <p>No tasks yet</p>
        <p style="font-size:var(--text-xs);color:var(--text-muted)">Tap + to create your first task</p>
      </div>`;
    }

    // --- Pending (missed) ---
    if (statusGroups.pending.length > 0) {
      html += '<div class="tasks-section-title" style="color:#ffab40;">⚠️ Missed / Pending</div>';
      _sortTasks(statusGroups.pending).forEach(t => { html += _taskCard(t); });
    }

    // --- Rescheduled ---
    if (statusGroups.rescheduled.length > 0) {
      html += '<div class="tasks-section-title" style="color:#448aff;">🔄 Rescheduled</div>';
      _sortTasks(statusGroups.rescheduled).forEach(t => { html += _taskCard(t); });
    }

    html += '</div>';
    container.innerHTML = html;

    // Add task and sort controls
    container.querySelector('#tasks-sort-select')?.addEventListener('change', (e) => {
      _tasksSortBy = e.target.value;
      _renderTasksView();
    });
    container.querySelector('#tasks-add-btn')?.addEventListener('click', () => TaskModal.open());

    // Attach long-press + check handlers
    container.querySelectorAll('.task-card').forEach(el => {
      const taskId = el.dataset.taskId;

      // Long-press → context menu
      ContextMenu.attachLongPress(el, 'task', taskId);

      // Check button
      el.querySelector('.task-card-check')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const task = Store.getTask(taskId);
        if (task) {
          if (task.status === 'completed') {
            Store.updateTask(taskId, { status: 'upcoming' });
          } else {
            Store.completeTask(taskId);
          }
          _renderTasksView();
        }
      });
    });
  }

  function _taskCard(task) {
    const isCompleted = task.status === 'completed';
    const sched = task.scheduleId ? Store.getSchedule(task.scheduleId) : null;
    const checkSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';

    const priorityColors = { high: '#ff5252', normal: 'var(--accent)', low: '#448aff' };
    const priorityLabel = task.priority !== 'normal'
      ? `<span class="priority-indicator" style="color:${priorityColors[task.priority]}">${task.priority === 'high' ? '🔴' : '🔵'} ${task.priority}</span>` : '';

    const dueMeta = task.dueDate
      ? `${task.dueDate}${task.dueTime ? ' • ' + Utils.formatTime12(task.dueTime) : ''}`
      : 'No due date';

    return `<div class="task-card" data-task-id="${task.id}">
      <div class="task-card-check ${isCompleted ? 'checked' : ''}" style="border-color:${sched ? sched.color : 'var(--accent)'}">
        ${isCompleted ? checkSvg : ''}
      </div>
      <div class="task-card-body">
        <div class="task-card-title ${isCompleted ? 'completed-text' : ''}">${task.title}</div>
        <div class="task-card-meta">
          <span>${dueMeta}</span>
          ${priorityLabel}
        </div>
      </div>
      <span class="status-badge ${task.status}">${task.status}</span>
    </div>`;
  }

  // ======== ADD BUTTON ========
  function _setupAddButton() {
    document.getElementById('btn-add')?.addEventListener('click', () => {
      if (_currentView === 'tasks') {
        TaskModal.open();
      } else {
        ScheduleModal.open(null);
      }
    });
  }

  // ======== HEADER ========
  function _updateHeader() {
    const dateEl = document.getElementById('header-date');
    if (dateEl) dateEl.textContent = Utils.formatDateHeader(Store.getSelectedDate());
  }

  // ======== DAY STRIP ========
  function _setupDayStrip() {
    document.getElementById('week-dots')?.addEventListener('click', e => {
      const dot = e.target.closest('.week-dot');
      if (!dot) return;
      _weekOffset = parseInt(dot.dataset.week);
      _renderDayStrip();
      const weekStart = Utils.addDays(Utils.getWeekStart(new Date()), _weekOffset * 7);
      Store.setSelectedDate(weekStart);
    });
  }

  function _renderDayStrip() {
    const scroll = document.getElementById('day-strip-scroll');
    const dotsContainer = document.getElementById('week-dots');
    if (!scroll || !dotsContainer) return;

    const today = new Date();
    const selectedDate = Store.getSelectedDate();
    const baseWeekStart = Utils.getWeekStart(today);

    let dotsHtml = '';
    for (let w = -3; w <= 3; w++) {
      dotsHtml += `<div class="week-dot ${w === _weekOffset ? 'active' : ''}" data-week="${w}"></div>`;
    }
    dotsContainer.innerHTML = dotsHtml;

    const weekStart = Utils.addDays(baseWeekStart, _weekOffset * 7);
    const days = Utils.getWeekDays(weekStart);

    scroll.innerHTML = days.map(d => {
      const dateStr = Utils.toDateStr(d);
      const isToday = Utils.isSameDay(d, today);
      const isActive = Utils.isSameDay(d, selectedDate);
      const hasSchedules = Store.dateHasSchedules(dateStr);

      let cls = 'day-chip';
      if (isToday) cls += ' today';
      if (isActive) cls += ' active';
      if (hasSchedules) cls += ' has-events';

      const dayName = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
      return `<div class="${cls}" data-date="${dateStr}">
        <span class="day-chip-name">${dayName}</span>
        <span class="day-chip-num">${d.getDate()}</span>
        <div class="day-chip-dot"></div>
      </div>`;
    }).join('');

    scroll.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        Store.setSelectedDate(Utils.parseDate(chip.dataset.date));
        _updateDayStrip();
        if (_currentView === 'timeline') {
          Timeline.refresh();
          DragDrop.init();
        }
      });
    });
  }

  function _updateDayStrip() { _renderDayStrip(); }

  function refresh() {
    _updateHeader();
    _updateDayStrip();
    if (_currentView === 'timeline') {
      Timeline.refresh();
      DragDrop.init();
    } else if (_currentView === 'calendar') {
      CalendarView.refresh();
    } else if (_currentView === 'tasks') {
      _renderTasksView();
    }
  }

  // ======== SAMPLE DATA ========
  function _addSampleData() {
    const today = Utils.toDateStr(new Date());
    const tomorrow = Utils.toDateStr(Utils.addDays(new Date(), 1));
    const yesterday = Utils.toDateStr(Utils.addDays(new Date(), -1));

    // Schedules
    const selfStudy = Store.addSchedule({
      title: 'Self Study',
      description: 'Personal study time — focus on coursework',
      date: today,
      startTime: '09:00',
      endTime: '11:00',
      color: '#00e676',
      recurrence: 'custom',
      recurrenceDays: [1, 3, 5], // Mon, Wed, Fri
      reminders: [0, 5]
    });

    const dsLecture = Store.addSchedule({
      title: 'Data Structures Lecture',
      description: 'Chapter 8: Graph Algorithms — BFS & DFS',
      date: today,
      startTime: '11:30',
      endTime: '13:00',
      color: '#448aff',
      recurrence: 'weekly',
      reminders: [0, 5, 30]
    });

    Store.addSchedule({
      title: 'Lunch Break',
      description: 'Cafeteria — Level 2',
      date: today,
      startTime: '13:00',
      endTime: '14:00',
      color: '#ffab40',
      recurrence: 'daily',
      reminders: [0]
    });

    const projectReview = Store.addSchedule({
      title: 'Project Review',
      description: 'Present sprint deliverables to Prof. Kumar',
      date: today,
      startTime: '14:30',
      endTime: '15:30',
      color: '#e040fb',
      recurrence: 'none',
      reminders: [0, 5, 30]
    });

    Store.addSchedule({
      title: 'Gym / Workout',
      description: 'Cardio + strength training',
      date: today,
      startTime: '17:00',
      endTime: '18:00',
      color: '#ff5252',
      recurrence: 'custom',
      recurrenceDays: [1, 2, 4, 6], // Mon, Tue, Thu, Sat
      reminders: [30]
    });

    Store.addSchedule({
      title: 'Physics Lab',
      description: 'Electromagnetism experiment — Lab B12',
      date: tomorrow,
      startTime: '09:00',
      endTime: '11:00',
      color: '#18ffff',
      recurrence: 'weekly',
      reminders: [0, 30]
    });

    // Tasks — linked to schedules
    Store.addTask({
      title: 'Complete Chapter 5 — Trees',
      description: 'Binary trees, AVL trees, Red-Black trees',
      scheduleId: selfStudy.id,
      dueDate: today,
      dueTime: '11:00',
      priority: 'high'
    });

    Store.addTask({
      title: 'Complete Chapter 6 — Heaps',
      description: 'Min-heap, Max-heap, Priority Queue',
      scheduleId: selfStudy.id,
      dueDate: tomorrow,
      priority: 'normal'
    });

    Store.addTask({
      title: 'Practice BFS problems on LeetCode',
      scheduleId: dsLecture.id,
      dueDate: today,
      priority: 'normal'
    });

    Store.addTask({
      title: 'Prepare slide deck for review',
      scheduleId: projectReview.id,
      dueDate: today,
      dueTime: '14:00',
      priority: 'high'
    });

    // Independent task
    Store.addTask({
      title: 'Buy groceries',
      description: 'Milk, eggs, bread, fruits',
      dueDate: today,
      priority: 'low'
    });

    // Missed task from yesterday
    Store.addTask({
      title: 'Submit assignment draft',
      dueDate: yesterday,
      dueTime: '23:59',
      priority: 'high'
    });

    // Re-detect pending after adding sample data
    Store.init();
    refresh();
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
