/* ============================================
   TimeGraph — Notification System
   ============================================ */

const Notifications = (() => {
  let _timers = new Map(); // eventId -> timeout[]
  let _permission = false;

  /**
   * Initialize notification system
   */
  function init() {
    _requestPermission();
  }

  async function _requestPermission() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }
    if (Notification.permission === 'granted') {
      _permission = true;
    } else if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      _permission = result === 'granted';
    }
  }

  /**
   * Show a toast notification in-app
   */
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: '🔔'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '🔔'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => _dismissToast(toast));

    container.appendChild(toast);

    // Auto dismiss after 5s
    setTimeout(() => _dismissToast(toast), 5000);
  }

  function _dismissToast(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('exiting');
    setTimeout(() => toast.remove(), 300);
  }

  /**
   * Schedule multiple reminders for an event
   */
  function scheduleReminders(event) {
    // Clear existing timers for this event
    clearReminders(event.id);

    if (!event.reminders || event.reminders.length === 0) return;

    const eventDate = Utils.parseDate(event.date);
    const [startH, startM] = event.startTime.split(':').map(Number);
    const eventTime = new Date(eventDate);
    eventTime.setHours(startH, startM, 0, 0);

    const now = Date.now();
    const timers = [];

    event.reminders.forEach(minutesBefore => {
      const triggerTime = eventTime.getTime() - (minutesBefore * 60 * 1000);
      const delay = triggerTime - now;

      if (delay > 0) {
        const timer = setTimeout(() => {
          _fireNotification(event, minutesBefore);
        }, delay);
        timers.push(timer);
      } else if (delay > -60000 && minutesBefore === 0) {
        // Event is happening now (within last minute)
        _fireNotification(event, 0);
      }
    });

    if (timers.length > 0) {
      _timers.set(event.id, timers);
    }
  }

  /**
   * Fire a notification
   */
  function _fireNotification(event, minutesBefore) {
    let message;
    if (minutesBefore === 0) {
      message = `${event.title} is starting now!`;
    } else if (minutesBefore < 60) {
      message = `${event.title} starts in ${minutesBefore} minutes`;
    } else if (minutesBefore === 60) {
      message = `${event.title} starts in 1 hour`;
    } else {
      message = `${event.title} starts in ${Math.round(minutesBefore / 60)} hours`;
    }

    // In-app toast
    showToast(
      minutesBefore === 0 ? 'Starting Now' : 'Upcoming Event',
      message,
      minutesBefore === 0 ? 'warning' : 'info'
    );

    // Browser notification
    if (_permission) {
      try {
        new Notification('TimeGraph', {
          body: message,
          icon: '/favicon.ico',
          tag: `${event.id}_${minutesBefore}`,
          requireInteraction: minutesBefore === 0
        });
      } catch (e) {
        // Notification constructor may fail in some contexts
      }
    }
  }

  /**
   * Clear all timers for an event
   */
  function clearReminders(eventId) {
    const timers = _timers.get(eventId);
    if (timers) {
      timers.forEach(t => clearTimeout(t));
      _timers.delete(eventId);
    }
  }

  /**
   * Clear all timers
   */
  function clearAll() {
    _timers.forEach((timers) => {
      timers.forEach(t => clearTimeout(t));
    });
    _timers.clear();
  }

  /**
   * Reschedule all active event reminders
   */
  function rescheduleAll(events) {
    clearAll();
    const today = Utils.toDateStr(new Date());
    events.forEach(event => {
      if (event.date >= today) {
        scheduleReminders(event);
      }
    });
  }

  return {
    init,
    showToast,
    scheduleReminders,
    clearReminders,
    clearAll,
    rescheduleAll
  };
})();
