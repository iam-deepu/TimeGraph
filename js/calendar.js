/* ============================================
   TimeGraph — Calendar (Month) View
   ============================================ */

const CalendarView = (() => {
  let _viewMonth = null;
  let _selectedCalDate = null;

  function init() {
    const now = new Date();
    _viewMonth = { year: now.getFullYear(), month: now.getMonth() };
    _selectedCalDate = Utils.toDateStr(now);

    document.getElementById('cal-prev')?.addEventListener('click', () => {
      _viewMonth.month--;
      if (_viewMonth.month < 0) { _viewMonth.month = 11; _viewMonth.year--; }
      render();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      _viewMonth.month++;
      if (_viewMonth.month > 11) { _viewMonth.month = 0; _viewMonth.year++; }
      render();
    });
    _renderHeader();
  }

  function _renderHeader() {
    const header = document.getElementById('cal-grid-header');
    if (!header) return;
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    header.innerHTML = days.map(d => `<div class="cal-header-cell">${d}</div>`).join('');
  }

  function render() {
    const label = document.getElementById('cal-month-label');
    const grid = document.getElementById('cal-grid');
    if (!label || !grid) return;

    const monthName = new Date(_viewMonth.year, _viewMonth.month, 1)
      .toLocaleString('en-US', { month: 'long', year: 'numeric' });
    label.textContent = monthName;

    const days = Utils.getMonthGrid(_viewMonth.year, _viewMonth.month);
    const todayStr = Utils.toDateStr(new Date());

    grid.innerHTML = days.map(({ date, otherMonth }) => {
      const dateStr = Utils.toDateStr(date);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === _selectedCalDate;
      const schedules = Store.getSchedulesForDate(dateStr);

      let classes = 'cal-day';
      if (otherMonth) classes += ' other-month';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';

      const dots = schedules.slice(0, 3).map(s =>
        `<div class="cal-day-event-dot" style="background:${s.color}"></div>`
      ).join('');

      return `<div class="${classes}" data-date="${dateStr}">
        ${date.getDate()}
        <div class="cal-day-dots">${dots}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        _selectedCalDate = el.dataset.date;
        Store.setSelectedDate(Utils.parseDate(_selectedCalDate));
        render();
        _renderDaySchedules();
      });
    });

    _renderDaySchedules();
  }

  function _renderDaySchedules() {
    const container = document.getElementById('cal-day-events');
    if (!container) return;

    const schedules = Store.getSchedulesForDate(_selectedCalDate);
    const dayName = Utils.getDayName(_selectedCalDate, 'long');
    const dateNum = Utils.parseDate(_selectedCalDate).getDate();
    const month = Utils.parseDate(_selectedCalDate).toLocaleString('en-US', { month: 'short' });

    if (schedules.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">
        <p style="font-size:var(--text-sm);">No schedules on ${dayName}, ${month} ${dateNum}</p>
      </div>`;
      return;
    }

    container.innerHTML = schedules.map(s => {
      const tasks = Store.getTasksForSchedule(s.id);
      const taskInfo = tasks.length > 0 ? `<span class="task-count-badge">📋 ${tasks.length}</span>` : '';
      return `<div class="cal-event-item" data-schedule-id="${s.id}">
        <div class="cal-event-color" style="background:${s.color}"></div>
        <div class="cal-event-info">
          <div class="cal-event-title">${s.title}</div>
          <div class="cal-event-time">${Utils.formatTime12(s.startTime)} — ${Utils.formatTime12(s.endTime)}</div>
        </div>
        ${taskInfo}
      </div>`;
    }).join('');

    container.querySelectorAll('.cal-event-item').forEach(el => {
      el.addEventListener('click', () => {
        const s = Store.getSchedule(el.dataset.scheduleId);
        if (s) ScheduleModal.open(s);
      });
    });
  }

  function refresh() { render(); }
  return { init, render, refresh };
})();
