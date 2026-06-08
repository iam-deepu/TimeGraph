import React from 'react';
import { useStore } from '../store/StoreContext';
import * as Utils from '../utils/utils';

export default function DayStrip() {
  const { selectedDate, setSelectedDate, dateHasSchedules } = useStore();

  const today = new Date();
  const baseWeekStart = Utils.getWeekStart(today);
  const selectedWeekStart = Utils.getWeekStart(selectedDate);

  // Compute active week offset automatically based on selectedDate
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const computedOffset = Math.round((selectedWeekStart.getTime() - baseWeekStart.getTime()) / oneWeekMs);
  
  // Constrain offset between -3 and 3 matching the legacy week dots range
  const weekOffset = Math.max(-3, Math.min(3, computedOffset));

  const handleWeekDotClick = (w) => {
    const targetWeekStart = Utils.addDays(baseWeekStart, w * 7);
    setSelectedDate(targetWeekStart);
  };

  const weekStart = Utils.addDays(baseWeekStart, weekOffset * 7);
  const days = Utils.getWeekDays(weekStart);

  const dots = [];
  for (let w = -3; w <= 3; w++) {
    dots.push(
      <div
        key={w}
        className={`week-dot ${w === weekOffset ? 'active' : ''}`}
        onClick={() => handleWeekDotClick(w)}
      />
    );
  }

  const todayStr = Utils.toDateStr(today);
  const selectedStr = Utils.toDateStr(selectedDate);

  return (
    <>
      <div id="day-strip" className="day-strip">
        <div className="day-strip-scroll" id="day-strip-scroll">
          {days.map((d) => {
            const dateStr = Utils.toDateStr(d);
            const isToday = dateStr === todayStr;
            const isActive = dateStr === selectedStr;
            const hasSchedules = dateHasSchedules(dateStr);

            let cls = 'day-chip';
            if (isToday) cls += ' today';
            if (isActive) cls += ' active';
            if (hasSchedules) cls += ' has-events';

            const dayName = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();

            return (
              <div
                key={dateStr}
                className={cls}
                onClick={() => setSelectedDate(Utils.parseDate(dateStr))}
              >
                <span className="day-chip-name">{dayName}</span>
                <span className="day-chip-num">{d.getDate()}</span>
                <div className="day-chip-dot" />
              </div>
            );
          })}
        </div>
      </div>
      <div id="week-dots" className="week-dots">
        {dots}
      </div>
    </>
  );
}
