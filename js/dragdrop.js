/* ============================================
   TimeGraph — Drag & Drop for Timeline Schedule Cards
   ============================================ */

const DragDrop = (() => {
  const HOUR_HEIGHT = 80;
  const SNAP_MINUTES = 15;

  let _dragging = null;
  let _startY = 0;
  let _startTop = 0;
  let _moved = false;

  function init() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    container.removeEventListener('pointerdown', _onPointerDown);
    document.removeEventListener('pointermove', _onPointerMove);
    document.removeEventListener('pointerup', _onPointerUp);
    document.removeEventListener('pointercancel', _onPointerUp);

    container.addEventListener('pointerdown', _onPointerDown, { passive: false });
    document.addEventListener('pointermove', _onPointerMove, { passive: false });
    document.addEventListener('pointerup', _onPointerUp);
    document.addEventListener('pointercancel', _onPointerUp);
  }

  function _onPointerDown(e) {
    const card = e.target.closest('.timeline-event');
    if (!card) return;

    _dragging = {
      card,
      scheduleId: card.dataset.scheduleId,
      pointerId: e.pointerId,
      timeout: setTimeout(() => {
        _startDrag(card);
      }, 400) // 400ms drag engagement
    };

    try {
      card.setPointerCapture(e.pointerId);
    } catch (err) { }

    _startY = e.clientY;
    _startTop = parseFloat(card.style.top);
    _moved = false;
  }

  function _startDrag(card) {
    if (!_dragging) return;
    card.classList.add('dragging');
    _dragging.active = true;
    if (navigator.vibrate) navigator.vibrate(50);
  }

  function _onPointerMove(e) {
    if (!_dragging) return;

    const dy = e.clientY - _startY;
    if (Math.abs(dy) > 5) _moved = true;

    if (!_dragging.active) {
      if (Math.abs(dy) > 10) {
        clearTimeout(_dragging.timeout);
        _dragging = null;
      }
      return;
    }

    e.preventDefault();
    const newTop = _startTop + dy;
    _dragging.card.style.top = `${Math.max(0, newTop)}px`;
  }

  function _onPointerUp() {
    if (!_dragging) return;
    clearTimeout(_dragging.timeout);

    if (_dragging.active && _moved) {
      const card = _dragging.card;
      card.classList.remove('dragging');

      const newTop = parseFloat(card.style.top);
      const newMinutes = (newTop / HOUR_HEIGHT) * 60;
      const snappedMinutes = Math.round(newMinutes / SNAP_MINUTES) * SNAP_MINUTES;

      const sched = Store.getSchedule(_dragging.scheduleId);
      if (sched) {
        const origStart = Utils.timeToMinutes(sched.startTime);
        const origEnd = Utils.timeToMinutes(sched.endTime);
        const duration = origEnd - origStart;

        const newStart = Utils.minutesToTime(Math.max(0, Math.min(snappedMinutes, 1440 - duration)));
        const newEnd = Utils.minutesToTime(Math.max(0, Math.min(snappedMinutes + duration, 1440)));

        Store.updateSchedule(sched.id, { startTime: newStart, endTime: newEnd });
        Notifications.showToast('Schedule Moved', `${sched.title} → ${Utils.formatTime12(newStart)}`, 'success');
        Notifications.scheduleReminders(Store.getSchedule(sched.id));
      }

      App.refresh();
    } else if (_dragging.active) {
      _dragging.card.classList.remove('dragging');
    }

    _dragging = null;
  }

  return { init };
})();
