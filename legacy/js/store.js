/* ============================================
   TimeGraph — State Management Store
   Separate Schedules & Tasks
   ============================================ */

const Store = (() => {
  const SCHEDULES_KEY = 'timegraph_schedules';
  const TASKS_KEY = 'timegraph_tasks';
  const SETTINGS_KEY = 'timegraph_settings';

  let _schedules = [];
  let _tasks = [];
  let _listeners = [];
  let _selectedDate = new Date();

  /* ---- SCHEMAS ----
   * Schedule: { id, title, description, date, startTime, endTime, color,
   *   recurrence: 'none'|'daily'|'weekly'|'monthly'|'custom',
   *   recurrenceDays: number[],  // 0=Sun..6=Sat, used when recurrence='custom'
   *   reminders: number[],
   *   timezone, createdAt, updatedAt }
   *
   * Task: { id, title, description, scheduleId: string|null,
   *   dueDate, dueTime: string|null, status: 'upcoming'|'completed'|'rescheduled'|'pending',
   *   priority: 'low'|'normal'|'high',
   *   originalDueDate: string|null, createdAt, updatedAt }
   */

  function init() {
    _loadFromStorage();
    _selectedDate = new Date();
    _autoDetectPending();
  }

  function _loadFromStorage() {
    try {
      const sd = localStorage.getItem(SCHEDULES_KEY);
      _schedules = sd ? JSON.parse(sd) : [];
    } catch (e) { _schedules = []; }
    try {
      const td = localStorage.getItem(TASKS_KEY);
      _tasks = td ? JSON.parse(td) : [];
    } catch (e) { _tasks = []; }
  }

  function _saveSchedules() {
    try { localStorage.setItem(SCHEDULES_KEY, JSON.stringify(_schedules)); } catch (e) {}
  }
  function _saveTasks() {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(_tasks)); } catch (e) {}
  }

  function subscribe(listener) {
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }
  function _notify(action, payload) {
    _listeners.forEach(l => l(action, payload));
  }

  // ============ SCHEDULE CRUD ============

  function addSchedule(data) {
    const s = {
      id: Utils.generateId(),
      title: data.title || 'Untitled',
      description: data.description || '',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      color: data.color || '#00e676',
      recurrence: data.recurrence || 'none',
      recurrenceDays: data.recurrenceDays || [],
      reminders: data.reminders || [0, 5, 30],
      timezone: data.timezone || Utils.getUserTimezone(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    _schedules.push(s);
    _saveSchedules();
    _notify('scheduleAdd', s);
    return s;
  }

  function updateSchedule(id, updates) {
    const idx = _schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;
    _schedules[idx] = { ..._schedules[idx], ...updates, updatedAt: Date.now() };
    _saveSchedules();
    _notify('scheduleUpdate', _schedules[idx]);
    return _schedules[idx];
  }

  function deleteSchedule(id) {
    const s = _schedules.find(s => s.id === id);
    _schedules = _schedules.filter(s => s.id !== id);
    // Also unlink any tasks pointing to this schedule
    _tasks.forEach(t => { if (t.scheduleId === id) t.scheduleId = null; });
    _saveSchedules();
    _saveTasks();
    _notify('scheduleDelete', s);
    return s;
  }

  function getSchedule(id) {
    return _schedules.find(s => s.id === id) || null;
  }

  function getAllSchedules() { return [..._schedules]; }

  function getSchedulesForDate(dateStr) {
    const targetDate = Utils.parseDate(dateStr);
    const results = [];

    _schedules.forEach(schedule => {
      const sDate = Utils.parseDate(schedule.date);

      if (schedule.date === dateStr) {
        results.push(schedule);
        return;
      }

      if (schedule.recurrence !== 'none' && sDate <= targetDate) {
        if (_checkRecurrence(schedule, sDate, targetDate)) {
          results.push({ ...schedule, _recurInstance: dateStr });
        }
      }
    });

    results.sort((a, b) => Utils.timeToMinutes(a.startTime) - Utils.timeToMinutes(b.startTime));
    return results;
  }

  function _checkRecurrence(schedule, schedDate, targetDate) {
    switch (schedule.recurrence) {
      case 'daily': return true;
      case 'weekly': return schedDate.getDay() === targetDate.getDay();
      case 'monthly': return schedDate.getDate() === targetDate.getDate();
      case 'custom':
        return schedule.recurrenceDays && schedule.recurrenceDays.includes(targetDate.getDay());
      default: return false;
    }
  }

  function dateHasSchedules(dateStr) {
    return getSchedulesForDate(dateStr).length > 0;
  }

  // ============ TASK CRUD ============

  function addTask(data) {
    const t = {
      id: Utils.generateId(),
      title: data.title || 'Untitled Task',
      description: data.description || '',
      scheduleId: data.scheduleId || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      status: 'upcoming',
      priority: data.priority || 'normal',
      originalDueDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    _tasks.push(t);
    _saveTasks();
    _notify('taskAdd', t);
    return t;
  }

  function updateTask(id, updates) {
    const idx = _tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    _tasks[idx] = { ..._tasks[idx], ...updates, updatedAt: Date.now() };
    _saveTasks();
    _notify('taskUpdate', _tasks[idx]);
    return _tasks[idx];
  }

  function deleteTask(id) {
    const t = _tasks.find(t => t.id === id);
    _tasks = _tasks.filter(t => t.id !== id);
    _saveTasks();
    _notify('taskDelete', t);
    return t;
  }

  function getTask(id) {
    return _tasks.find(t => t.id === id) || null;
  }

  function getAllTasks() { return [..._tasks]; }

  function getTasksForSchedule(scheduleId) {
    return _tasks
      .filter(t => t.scheduleId === scheduleId)
      .sort((a, b) => {
        const pa = { high: 0, normal: 1, low: 2 };
        return (pa[a.priority] || 1) - (pa[b.priority] || 1);
      });
  }

  function getIndependentTasks() {
    return _tasks.filter(t => !t.scheduleId);
  }

  function getTasksByStatus() {
    _autoDetectPending(); // refresh missed tasks
    const groups = { upcoming: [], pending: [], rescheduled: [], completed: [] };
    _tasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        const pa = { high: 0, normal: 1, low: 2 };
        return (pa[a.priority] || 1) - (pa[b.priority] || 1);
      });
    });
    return groups;
  }

  function rescheduleTask(id, newDate, newTime) {
    const task = getTask(id);
    if (!task) return null;
    return updateTask(id, {
      originalDueDate: task.originalDueDate || task.dueDate,
      dueDate: newDate,
      dueTime: newTime || task.dueTime,
      status: 'rescheduled'
    });
  }

  function completeTask(id) {
    return updateTask(id, { status: 'completed' });
  }

  /** Auto-flip upcoming tasks past their due date to 'pending' */
  function _autoDetectPending() {
    const todayStr = Utils.toDateStr(new Date());
    let changed = false;
    _tasks.forEach(t => {
      if (t.status === 'upcoming' && t.dueDate && t.dueDate < todayStr) {
        t.status = 'pending';
        t.updatedAt = Date.now();
        changed = true;
      }
    });
    if (changed) _saveTasks();
  }

  // ============ SELECTED DATE ============

  function getSelectedDate() { return _selectedDate; }
  function setSelectedDate(date) {
    _selectedDate = new Date(date);
    _notify('dateChange', _selectedDate);
  }

  // ============ SETTINGS ============

  function getSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : { defaultTimezone: Utils.getUserTimezone() };
    } catch (e) { return { defaultTimezone: Utils.getUserTimezone() }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // ============ EXPORT / IMPORT ============

  function exportData() {
    return { version: 2, schedules: _schedules, tasks: _tasks, settings: getSettings(), exportedAt: Date.now() };
  }
  function importData(data) {
    if (data && data.schedules) { _schedules = data.schedules; _saveSchedules(); }
    if (data && data.tasks) { _tasks = data.tasks; _saveTasks(); }
    if (data && data.settings) saveSettings(data.settings);
    _notify('import', null);
  }

  return {
    init, subscribe,
    // Schedules
    addSchedule, updateSchedule, deleteSchedule, getSchedule,
    getAllSchedules, getSchedulesForDate, dateHasSchedules,
    // Tasks
    addTask, updateTask, deleteTask, getTask,
    getAllTasks, getTasksForSchedule, getIndependentTasks,
    getTasksByStatus, rescheduleTask, completeTask,
    // Date
    getSelectedDate, setSelectedDate,
    // Settings
    getSettings, saveSettings,
    // Data
    exportData, importData
  };
})();
