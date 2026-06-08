/* ============================================
   TimeGraph — Swipe-to-Complete for Task Cards
   ============================================ */

const SwipeGesture = (() => {
  const THRESHOLD = 100;

  function init() {
    // Attach to task cards in tasks view
    document.querySelectorAll('#tasks-view .task-card').forEach(card => {
      _attachSwipe(card);
    });
  }

  function _attachSwipe(card) {
    let startX = 0;
    let currentX = 0;
    let swiping = false;

    card.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      swiping = true;
      card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!swiping) return;
      currentX = e.touches[0].clientX;
      let dx = currentX - startX;
      if (dx < 0) dx = 0;
      // Resistance after threshold
      if (dx > THRESHOLD) dx = THRESHOLD + (dx - THRESHOLD) * 0.3;
      card.style.transform = `translateX(${dx}px)`;
      card.style.opacity = 1 - (dx / (THRESHOLD * 2));
    }, { passive: true });

    card.addEventListener('touchend', () => {
      swiping = false;
      const dx = currentX - startX;
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

      if (dx >= THRESHOLD) {
        // Complete
        card.style.transform = `translateX(${window.innerWidth}px)`;
        card.style.opacity = '0';
        const taskId = card.dataset.taskId;
        setTimeout(() => {
          const task = Store.getTask(taskId);
          if (task) {
            if (task.status === 'completed') {
              Store.updateTask(taskId, { status: 'upcoming' });
            } else {
              Store.completeTask(taskId);
            }
            Notifications.showToast('Task Updated', task.title, 'success');
            App.refresh();
          }
        }, 300);
      } else {
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';
      }
      currentX = 0;
    });
  }

  return { init };
})();
