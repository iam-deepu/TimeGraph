import React, { useEffect, useRef } from 'react';

export default function ContextMenu({ target, position, onClose, onAction }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [onClose]);

  if (!target || !position) return null;

  const { type, id } = target;
  const { x, y } = position;

  // Calculate position constraints matching legacy code
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x - 85;
  let top = y - 10;

  if (left + 170 > vw) left = vw - 180;
  if (left < 10) left = 10;
  if (top + 130 > vh) top = y - 140;
  if (top < 10) top = 10;

  return (
    <div
      ref={menuRef}
      id="context-menu"
      className="context-menu"
      style={{
        display: 'block',
        left: `${left}px`,
        top: `${top}px`,
        position: 'fixed',
        zIndex: 1500,
      }}
    >
      <button className="context-menu-item" onClick={() => onAction('edit', type, id)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </button>

      {type === 'task' && (
        <button className="context-menu-item" onClick={() => onAction('reschedule', type, id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Reschedule
        </button>
      )}

      <button className="context-menu-item context-menu-danger" onClick={() => onAction('delete', type, id)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  );
}
