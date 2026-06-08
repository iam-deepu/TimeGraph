/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format date to display string
 */
export function formatDateHeader(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format time from "HH:MM" to "h:mm A"
 */
export function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get day name from date
 */
export function getDayName(date, format = 'long') {
  return new Date(date).toLocaleString('en-US', { weekday: format }).toUpperCase();
}

/**
 * Get date string YYYY-MM-DD
 */
export function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parse date string to Date
 */
export function parseDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Check if two dates are same day
 */
export function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/**
 * Get the start of week (Monday) for a given date
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Generate array of dates for a week
 */
export function getWeekDays(weekStart) {
  const days = [];
  const start = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Get all days in a month grid (inc padding from prev/next months)
 */
export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() || 7; // Monday = 1
  const days = [];

  // Previous month padding
  for (let i = startDay - 1; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    days.push({ date: d, otherMonth: true });
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), otherMonth: false });
  }

  // Next month padding
  const remaining = 42 - days.length; // 6 rows max
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), otherMonth: true });
  }

  return days;
}

/**
 * Time string "HH:MM" to minutes from midnight
 */
export function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Minutes from midnight to "HH:MM"
 */
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 */
export function timesOverlap(s1, e1, s2, e2) {
  const start1 = timeToMinutes(s1), end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2), end2 = timeToMinutes(e2);
  return start1 < end2 && start2 < end1;
}

/**
 * Get popular timezone list
 */
export function getTimezones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch (e) {
    return [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
      'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
      'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
      'UTC'
    ];
  }
}

/**
 * Get user's timezone
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Debounce function
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Add days to a date
 */
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add months to a date
 */
export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Compute overlap groups for timeline cards
 */
export function computeOverlapGroups(items) {
  const groups = new Array(items.length);
  const columns = [];

  items.forEach((item, i) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);

    // Find a column where this item doesn't overlap
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const lastEnd = columns[c];
      if (start >= lastEnd) {
        columns[c] = end;
        groups[i] = { index: c, total: columns.length };
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups[i] = { index: columns.length, total: columns.length + 1 };
      columns.push(end);
    }
  });

  // Update total for all items in overlapping groups
  const totalCols = columns.length;
  groups.forEach(g => { if (g) g.total = totalCols; });

  return groups;
}
