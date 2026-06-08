/* ============================================
   TimeGraph — Context Menu (Long-press)
   ============================================ */

const ContextMenu = (() => {
  let _target = null; // { type: 'schedule'|'task', id: string }
  let _longPressTimer = null;
  let _backdrop = null;
  let _lastOpened = 0;
  const LONG_PRESS_MS = 500;

  function init() {
    // Actions
    document.querySelectorAll('#context-menu .context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        _handleAction(action);
      });
    });

    // Dismiss on outside click
    document.addEventListener('click', (e) => {
      if (Date.now() - _lastOpened < 600) return; // Prevent early dismissal from touchend click
      if (!e.target.closest('#context-menu')) {
        hide();
      }
    });
  }

  /**
   * Attach long-press listener to an element
   */
  function attachLongPress(element, type, id) {
    let timer = null;
    let moved = false;
    let startX = 0, startY = 0;
    let menuTriggered = false;

    const onStart = (e) => {
      // Ignore if clicking a button inside it
      if (e.target.closest('button') || e.target.closest('.inline-task-check') || e.target.closest('.task-card-check')) {
        return;
      }
      moved = false;
      menuTriggered = false;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      timer = setTimeout(() => {
        if (!moved && !e.target.closest('.dragging')) {
          menuTriggered = true;
          if (navigator.vibrate) navigator.vibrate(30);
          show(type, id, startX, startY);
        }
      }, LONG_PRESS_MS);
    };

    const onMove = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
        moved = true;
        clearTimeout(timer);
      }
    };

    const onEnd = (e) => {
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

    element.addEventListener('touchstart', onStart, { passive: false });
    element.addEventListener('touchmove', onMove, { passive: true });
    element.addEventListener('touchend', onEnd, { passive: false });
    element.addEventListener('mousedown', onStart);
    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseup', onEnd);
  }

  function show(type, id, x, y) {
    _target = { type, id };
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    // Show/hide reschedule based on type
    const rescheduleItem = menu.querySelector('[data-action="reschedule"]');
    if (rescheduleItem) {
      rescheduleItem.style.display = type === 'task' ? 'flex' : 'none';
    }

    menu.classList.remove('hidden');
    _lastOpened = Date.now();

    // Position near finger
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x - 85;
    let top = y - 10;

    // Keep on screen
    if (left + 170 > vw) left = vw - 180;
    if (left < 10) left = 10;
    if (top + 130 > vh) top = y - 140;
    if (top < 10) top = 10;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function hide() {
    document.getElementById('context-menu')?.classList.add('hidden');
    _target = null;
  }

  function _handleAction(action) {
    if (Date.now() - _lastOpened < 600) return; // Prevent accidental click from long-press release
    if (!_target) return;
    const { type, id } = _target;
    hide();

    if (action === 'edit') {
      if (type === 'schedule') {
        const s = Store.getSchedule(id);
        if (s) ScheduleModal.open(s);
      } else {
        const t = Store.getTask(id);
        if (t) TaskModal.open(t);
      }
    } else if (action === 'reschedule') {
      if (type === 'task') {
        TaskModal.openReschedule(id);
      }
    } else if (action === 'delete') {
      if (type === 'schedule') {
        const s = Store.getSchedule(id);
        if (s) {
          Store.deleteSchedule(id);
          Notifications.showToast('Schedule Deleted', s.title, 'warning');
        }
      } else {
        const t = Store.getTask(id);
        if (t) {
          Store.deleteTask(id);
          Notifications.showToast('Task Deleted', t.title, 'warning');
        }
      }
      App.refresh();
    }
  }

  return { init, attachLongPress, show, hide };
})();
