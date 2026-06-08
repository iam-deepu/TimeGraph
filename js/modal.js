/* ============================================
   TimeGraph — Schedule & Task Modal Controllers
   ============================================ */

// ---- SCHEDULE MODAL ----
const ScheduleModal = (() => {
  let _current = null;

  function init() {
    // Timezone
    const tzSel = document.getElementById('sched-timezone');
    if (tzSel) {
      const userTz = Utils.getUserTimezone();
      Utils.getTimezones().forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz; opt.textContent = tz.replace(/_/g, ' ');
        if (tz === userTz) opt.selected = true;
        tzSel.appendChild(opt);
      });
    }

    // Color picker
    document.getElementById('sched-color-picker')?.addEventListener('click', e => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      document.querySelectorAll('#sched-color-picker .color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });

    // Reminder chips
    document.getElementById('sched-reminder-chips')?.addEventListener('click', e => {
      const chip = e.target.closest('.reminder-chip');
      if (!chip) return;
      chip.classList.toggle('active');
    });

    // Custom reminder add
    document.getElementById('sched-add-reminder')?.addEventListener('click', () => {
      const input = document.getElementById('sched-custom-reminder');
      const mins = parseInt(input.value);
      if (!mins || mins < 1) return;
      // Check duplicate
      const existing = document.querySelector(`#sched-reminder-chips .reminder-chip[data-minutes="${mins}"]`);
      if (existing) { existing.classList.add('active'); input.value = ''; return; }
      // Add chip
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'reminder-chip active';
      chip.dataset.minutes = mins;
      chip.textContent = mins < 60 ? `${mins} min` : mins === 60 ? '1 hr' : `${Math.round(mins/60)} hr`;
      chip.addEventListener('click', () => chip.classList.toggle('active'));
      document.getElementById('sched-reminder-chips').appendChild(chip);
      input.value = '';
    });

    // Recurrence change — show/hide custom days
    document.getElementById('sched-recurrence')?.addEventListener('change', e => {
      document.getElementById('sched-custom-days-group').classList.toggle('hidden', e.target.value !== 'custom');
    });

    // Day toggles
    document.getElementById('sched-day-toggles')?.addEventListener('click', e => {
      const btn = e.target.closest('.day-toggle');
      if (!btn) return;
      btn.classList.toggle('active');
    });

    // Form submit
    document.getElementById('schedule-form')?.addEventListener('submit', _onSubmit);
    document.getElementById('sched-modal-close')?.addEventListener('click', close);
    document.getElementById('sched-cancel-btn')?.addEventListener('click', close);
    document.getElementById('sched-delete-btn')?.addEventListener('click', _onDelete);
    document.getElementById('schedule-modal')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) close();
    });

    // Help modal
    document.getElementById('btn-help')?.addEventListener('click', () => {
      document.getElementById('help-modal')?.classList.remove('hidden');
    });
    document.getElementById('help-close')?.addEventListener('click', () => {
      document.getElementById('help-modal')?.classList.add('hidden');
    });
    document.getElementById('help-modal')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay'))
        document.getElementById('help-modal')?.classList.add('hidden');
    });
  }

  function open(schedule = null) {
    _current = schedule;
    const modal = document.getElementById('schedule-modal');
    const title = document.getElementById('sched-modal-title');
    const deleteBtn = document.getElementById('sched-delete-btn');
    const saveBtn = document.getElementById('sched-save-btn');
    if (!modal) return;

    if (schedule) {
      title.textContent = 'Edit Schedule';
      deleteBtn.style.display = 'block';
      saveBtn.textContent = 'Update';
      document.getElementById('sched-id').value = schedule.id;
      document.getElementById('sched-title').value = schedule.title;
      document.getElementById('sched-description').value = schedule.description || '';
      document.getElementById('sched-date').value = schedule.date;
      document.getElementById('sched-start').value = schedule.startTime;
      document.getElementById('sched-end').value = schedule.endTime;
      document.getElementById('sched-timezone').value = schedule.timezone;
      document.getElementById('sched-recurrence').value = schedule.recurrence;

      // Color
      document.querySelectorAll('#sched-color-picker .color-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.color === schedule.color);
      });
      // Reminders
      _resetReminderChips(schedule.reminders);
      // Custom days
      const isCustom = schedule.recurrence === 'custom';
      document.getElementById('sched-custom-days-group').classList.toggle('hidden', !isCustom);
      document.querySelectorAll('#sched-day-toggles .day-toggle').forEach(btn => {
        btn.classList.toggle('active', schedule.recurrenceDays?.includes(parseInt(btn.dataset.day)));
      });
    } else {
      title.textContent = 'New Schedule';
      deleteBtn.style.display = 'none';
      saveBtn.textContent = 'Save';
      document.getElementById('schedule-form').reset();
      document.getElementById('sched-id').value = '';
      document.getElementById('sched-date').value = Utils.toDateStr(Store.getSelectedDate());
      const now = new Date();
      const h = now.getHours() + 1;
      document.getElementById('sched-start').value = `${String(h % 24).padStart(2,'0')}:00`;
      document.getElementById('sched-end').value = `${String((h+1) % 24).padStart(2,'0')}:00`;
      document.querySelectorAll('#sched-color-picker .color-dot').forEach((d,i) => d.classList.toggle('active', i===0));
      _resetReminderChips([0, 5, 30]);
      document.getElementById('sched-custom-days-group').classList.add('hidden');
      document.querySelectorAll('#sched-day-toggles .day-toggle').forEach(b => b.classList.remove('active'));
      document.getElementById('sched-timezone').value = Utils.getUserTimezone();
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('sched-title')?.focus());
  }

  function _resetReminderChips(activeMinutes) {
    // Remove custom chips first
    document.querySelectorAll('#sched-reminder-chips .reminder-chip').forEach(c => {
      const m = parseInt(c.dataset.minutes);
      if (![0,5,30,60,1440].includes(m)) c.remove();
    });
    // Toggle preset chips
    document.querySelectorAll('#sched-reminder-chips .reminder-chip').forEach(c => {
      c.classList.toggle('active', activeMinutes.includes(parseInt(c.dataset.minutes)));
    });
    // Add custom minute chips
    activeMinutes.forEach(m => {
      if (![0,5,30,60,1440].includes(m)) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'reminder-chip active';
        chip.dataset.minutes = m;
        chip.textContent = m < 60 ? `${m} min` : `${Math.round(m/60)} hr`;
        chip.addEventListener('click', () => chip.classList.toggle('active'));
        document.getElementById('sched-reminder-chips').appendChild(chip);
      }
    });
  }

  function close() {
    document.getElementById('schedule-modal')?.classList.add('hidden');
    _current = null;
  }

  function _onSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('sched-id').value;
    const color = document.querySelector('#sched-color-picker .color-dot.active');
    const reminders = [];
    document.querySelectorAll('#sched-reminder-chips .reminder-chip.active').forEach(c => {
      reminders.push(parseInt(c.dataset.minutes));
    });
    const recurrence = document.getElementById('sched-recurrence').value;
    const recurrenceDays = [];
    if (recurrence === 'custom') {
      document.querySelectorAll('#sched-day-toggles .day-toggle.active').forEach(b => {
        recurrenceDays.push(parseInt(b.dataset.day));
      });
    }

    const data = {
      title: document.getElementById('sched-title').value.trim(),
      description: document.getElementById('sched-description').value.trim(),
      date: document.getElementById('sched-date').value,
      startTime: document.getElementById('sched-start').value,
      endTime: document.getElementById('sched-end').value,
      color: color ? color.dataset.color : '#00e676',
      recurrence,
      recurrenceDays,
      reminders,
      timezone: document.getElementById('sched-timezone').value
    };

    if (!data.title) { Notifications.showToast('Missing Title', 'Please enter a name', 'error'); return; }
    if (Utils.timeToMinutes(data.startTime) >= Utils.timeToMinutes(data.endTime)) {
      Notifications.showToast('Invalid Time', 'End time must be after start time', 'error'); return;
    }
    if (recurrence === 'custom' && recurrenceDays.length === 0) {
      Notifications.showToast('No Days Selected', 'Pick at least one day for custom recurrence', 'error'); return;
    }

    if (id) {
      const updated = Store.updateSchedule(id, data);
      if (updated) { Notifications.showToast('Schedule Updated', updated.title, 'success'); Notifications.scheduleReminders(updated); }
    } else {
      const created = Store.addSchedule(data);
      Notifications.showToast('Schedule Created', created.title, 'success');
      Notifications.scheduleReminders(created);
    }
    close();
    App.refresh();
  }

  function _onDelete() {
    if (!_current) return;
    Store.deleteSchedule(_current.id);
    Notifications.clearReminders(_current.id);
    Notifications.showToast('Schedule Deleted', _current.title, 'warning');
    close();
    App.refresh();
  }

  return { init, open, close };
})();


// ---- TASK MODAL ----
const TaskModal = (() => {
  let _current = null;

  function init() {
    // Priority chips
    document.getElementById('task-priority-chips')?.addEventListener('click', e => {
      const chip = e.target.closest('.priority-chip');
      if (!chip) return;
      document.querySelectorAll('#task-priority-chips .priority-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });

    document.getElementById('task-form')?.addEventListener('submit', _onSubmit);
    document.getElementById('task-modal-close')?.addEventListener('click', close);
    document.getElementById('task-cancel-btn')?.addEventListener('click', close);
    document.getElementById('task-delete-btn')?.addEventListener('click', _onDelete);
    document.getElementById('task-modal')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) close();
    });

    // Reschedule modal
    document.getElementById('reschedule-form')?.addEventListener('submit', _onRescheduleSubmit);
    document.getElementById('reschedule-close')?.addEventListener('click', closeReschedule);
    document.getElementById('reschedule-cancel')?.addEventListener('click', closeReschedule);
    document.getElementById('reschedule-modal')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-overlay')) closeReschedule();
    });
  }

  function open(task = null, presetScheduleId = null) {
    _current = task;
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('task-modal-title');
    const deleteBtn = document.getElementById('task-delete-btn');
    const statusGrp = document.getElementById('task-status-group');
    const saveBtn = document.getElementById('task-save-btn');
    if (!modal) return;

    // Populate schedule dropdown
    const schedSel = document.getElementById('task-schedule-link');
    schedSel.innerHTML = '<option value="">Independent Task</option>';
    Store.getAllSchedules().forEach(s => {
      schedSel.innerHTML += `<option value="${s.id}">${s.title}</option>`;
    });

    if (task) {
      title.textContent = 'Edit Task';
      deleteBtn.style.display = 'block';
      statusGrp.classList.remove('hidden');
      saveBtn.textContent = 'Update Task';
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-description').value = task.description || '';
      document.getElementById('task-schedule-link').value = task.scheduleId || '';
      document.getElementById('task-due-date').value = task.dueDate || '';
      document.getElementById('task-due-time').value = task.dueTime || '';
      document.getElementById('task-status').value = task.status;
      document.querySelectorAll('#task-priority-chips .priority-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.priority === task.priority);
      });
    } else {
      title.textContent = 'New Task';
      deleteBtn.style.display = 'none';
      statusGrp.classList.add('hidden');
      saveBtn.textContent = 'Save Task';
      document.getElementById('task-form').reset();
      document.getElementById('task-id').value = '';
      document.getElementById('task-due-date').value = Utils.toDateStr(Store.getSelectedDate());
      if (presetScheduleId) {
        document.getElementById('task-schedule-link').value = presetScheduleId;
      }
      document.querySelectorAll('#task-priority-chips .priority-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.priority === 'normal');
      });
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('task-title')?.focus());
  }

  function close() {
    document.getElementById('task-modal')?.classList.add('hidden');
    _current = null;
  }

  function _onSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const activePriority = document.querySelector('#task-priority-chips .priority-chip.active');

    const data = {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-description').value.trim(),
      scheduleId: document.getElementById('task-schedule-link').value || null,
      dueDate: document.getElementById('task-due-date').value || null,
      dueTime: document.getElementById('task-due-time').value || null,
      priority: activePriority ? activePriority.dataset.priority : 'normal'
    };

    if (!data.title) { Notifications.showToast('Missing Title', 'Please enter a task name', 'error'); return; }

    if (id) {
      data.status = document.getElementById('task-status').value;
      if (data.status === 'rescheduled' && _current) {
        close();
        openReschedule(_current.id);
        return;
      }
      const updated = Store.updateTask(id, data);
      if (updated) Notifications.showToast('Task Updated', updated.title, 'success');
    } else {
      Store.addTask(data);
      Notifications.showToast('Task Created', data.title, 'success');
    }
    close();
    App.refresh();
  }

  function _onDelete() {
    if (!_current) return;
    Store.deleteTask(_current.id);
    Notifications.showToast('Task Deleted', _current.title, 'warning');
    close();
    App.refresh();
  }

  function openReschedule(taskId) {
    const task = Store.getTask(taskId);
    if (!task) return;
    document.getElementById('reschedule-task-id').value = taskId;
    document.getElementById('reschedule-date').value = task.dueDate || Utils.toDateStr(new Date());
    document.getElementById('reschedule-time').value = task.dueTime || '';
    document.getElementById('reschedule-modal')?.classList.remove('hidden');
  }

  function closeReschedule() {
    document.getElementById('reschedule-modal')?.classList.add('hidden');
  }

  function _onRescheduleSubmit(e) {
    e.preventDefault();
    const taskId = document.getElementById('reschedule-task-id').value;
    const newDate = document.getElementById('reschedule-date').value;
    const newTime = document.getElementById('reschedule-time').value || null;

    const updated = Store.rescheduleTask(taskId, newDate, newTime);
    if (updated) Notifications.showToast('Task Rescheduled', updated.title, 'info');
    closeReschedule();
    App.refresh();
  }

  return { init, open, close, openReschedule, closeReschedule };
})();

// Combined init alias
const EventModal = {
  init() { ScheduleModal.init(); TaskModal.init(); },
  open: ScheduleModal.open,
  close: ScheduleModal.close,
  openReschedule: TaskModal.openReschedule,
  closeReschedule: TaskModal.closeReschedule
};
