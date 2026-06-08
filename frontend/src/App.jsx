import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import * as Utils from './utils/utils';

// UI Components
import Header from './components/Header';
import DayStrip from './components/DayStrip';
import BottomNav from './components/BottomNav';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import TasksView from './components/TasksView';
import ToastContainer from './components/ToastContainer';

// Modals
import HelpModal from './components/HelpModal';
import AuthModal from './components/AuthModal';
import ScheduleModal from './components/ScheduleModal';
import TaskModal from './components/TaskModal';
import RescheduleModal from './components/RescheduleModal';
import ContextMenu from './components/ContextMenu';

function AppContent() {
  const { 
    schedules, 
    addSchedule, 
    addTask, 
    deleteSchedule, 
    deleteTask,
    updateTask,
    completeTask,
    showToast
  } = useStore();

  const [currentView, setCurrentView] = useState('timeline');

  // Modal Open/Close States
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [presetScheduleId, setPresetScheduleId] = useState(null);

  const [reschedulingTaskId, setReschedulingTaskId] = useState(null);

  // Context Menu State
  const [contextMenuTarget, setContextMenuTarget] = useState(null); // { type, id }
  const [contextMenuPos, setContextMenuPos] = useState(null); // { x, y }

  // Seed sample data on first launch
  useEffect(() => {
    // If store already has user or schedules, do not overwrite/seed
    const storedSchedules = localStorage.getItem('timegraph_schedules');
    if (storedSchedules && JSON.parse(storedSchedules).length > 0) return;
    if (schedules.length > 0) return;

    const todayStr = Utils.toDateStr(new Date());
    const tomorrowStr = Utils.toDateStr(Utils.addDays(new Date(), 1));
    const yesterdayStr = Utils.toDateStr(Utils.addDays(new Date(), -1));

    // Seed Schedules
    const selfStudy = addSchedule({
      title: 'Self Study',
      description: 'Personal study time — focus on coursework',
      date: todayStr,
      startTime: '09:00',
      endTime: '11:00',
      color: '#00e676',
      recurrence: 'custom',
      recurrenceDays: [1, 3, 5], // Mon, Wed, Fri
      reminders: [0, 5],
    });

    const dsLecture = addSchedule({
      title: 'Data Structures Lecture',
      description: 'Chapter 8: Graph Algorithms — BFS & DFS',
      date: todayStr,
      startTime: '11:30',
      endTime: '13:00',
      color: '#448aff',
      recurrence: 'weekly',
      reminders: [0, 5, 30],
    });

    addSchedule({
      title: 'Lunch Break',
      description: 'Cafeteria — Level 2',
      date: todayStr,
      startTime: '13:00',
      endTime: '14:00',
      color: '#ffab40',
      recurrence: 'daily',
      reminders: [0],
    });

    const projectReview = addSchedule({
      title: 'Project Review',
      description: 'Present sprint deliverables to Prof. Kumar',
      date: todayStr,
      startTime: '14:30',
      endTime: '15:30',
      color: '#e040fb',
      recurrence: 'none',
      reminders: [0, 5, 30],
    });

    addSchedule({
      title: 'Gym / Workout',
      description: 'Cardio + strength training',
      date: todayStr,
      startTime: '17:00',
      endTime: '18:00',
      color: '#ff5252',
      recurrence: 'custom',
      recurrenceDays: [1, 2, 4, 6], // Mon, Tue, Thu, Sat
      reminders: [30],
    });

    addSchedule({
      title: 'Physics Lab',
      description: 'Electromagnetism experiment — Lab B12',
      date: tomorrowStr,
      startTime: '09:00',
      endTime: '11:00',
      color: '#18ffff',
      recurrence: 'weekly',
      reminders: [0, 30],
    });

    // Seed Tasks (linked to schedules)
    addTask({
      title: 'Complete Chapter 5 — Trees',
      description: 'Binary trees, AVL trees, Red-Black trees',
      scheduleId: selfStudy.id,
      dueDate: todayStr,
      dueTime: '11:00',
      priority: 'high',
    });

    addTask({
      title: 'Complete Chapter 6 — Heaps',
      description: 'Min-heap, Max-heap, Priority Queue',
      scheduleId: selfStudy.id,
      dueDate: tomorrowStr,
      priority: 'normal',
    });

    addTask({
      title: 'Practice BFS problems on LeetCode',
      scheduleId: dsLecture.id,
      dueDate: todayStr,
      priority: 'normal',
    });

    addTask({
      title: 'Prepare slide deck for review',
      scheduleId: projectReview.id,
      dueDate: todayStr,
      dueTime: '14:00',
      priority: 'high',
    });

    // Independent task
    addTask({
      title: 'Buy groceries',
      description: 'Milk, eggs, bread, fruits',
      dueDate: todayStr,
      priority: 'low',
    });

    // Missed task from yesterday
    addTask({
      title: 'Submit assignment draft',
      dueDate: yesterdayStr,
      dueTime: '23:59',
      priority: 'high',
    });

  }, [addSchedule, addTask, schedules]);

  // Context Menu Actions Broker
  const handleContextMenuAction = (action, type, id) => {
    setContextMenuTarget(null);
    setContextMenuPos(null);

    if (action === 'edit') {
      if (type === 'schedule') {
        const s = schedules.find((item) => item.id === id);
        if (s) {
          setSelectedSchedule(s);
          setIsScheduleOpen(true);
        }
      } else {
        const t = useStore().tasks.find((item) => item.id === id);
        if (t) {
          setSelectedTask(t);
          setIsTaskOpen(true);
        }
      }
    } else if (action === 'reschedule') {
      if (type === 'task') {
        setReschedulingTaskId(id);
      }
    } else if (action === 'delete') {
      if (type === 'schedule') {
        deleteSchedule(id);
      } else {
        deleteTask(id);
      }
    }
  };

  const handleOpenAdd = () => {
    if (currentView === 'tasks') {
      setSelectedTask(null);
      setPresetScheduleId(null);
      setIsTaskOpen(true);
    } else {
      setSelectedSchedule(null);
      setIsScheduleOpen(true);
    }
  };

  const handleEditSchedule = (sched) => {
    setSelectedSchedule(sched);
    setIsScheduleOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsTaskOpen(true);
  };

  const handleContextMenuTrigger = (type, id, x, y) => {
    setContextMenuTarget({ type, id });
    setContextMenuPos({ x, y });
  };

  return (
    <div id="app" className="app">
      <ToastContainer />

      <Header
        currentView={currentView}
        onHelpOpen={() => setIsHelpOpen(true)}
        onAuthOpen={() => setIsAuthOpen(true)}
        onAddOpen={handleOpenAdd}
      />

      <DayStrip />

      <main id="main-content" className="main-content">
        {currentView === 'timeline' && (
          <TimelineView
            onEditSchedule={handleEditSchedule}
            onContextMenu={handleContextMenuTrigger}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView onEditSchedule={handleEditSchedule} />
        )}

        {currentView === 'tasks' && (
          <TasksView
            onEditTask={handleEditTask}
            onContextMenu={handleContextMenuTrigger}
          />
        )}
      </main>

      <BottomNav currentView={currentView} onViewChange={setCurrentView} />

      {/* Modals */}
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
      
      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      {isScheduleOpen && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setIsScheduleOpen(false);
            setSelectedSchedule(null);
          }}
        />
      )}

      {isTaskOpen && (
        <TaskModal
          task={selectedTask}
          presetScheduleId={presetScheduleId}
          onClose={() => {
            setIsTaskOpen(false);
            setSelectedTask(null);
            setPresetScheduleId(null);
          }}
          onOpenReschedule={(id) => setReschedulingTaskId(id)}
        />
      )}

      {reschedulingTaskId && (
        <RescheduleModal
          taskId={reschedulingTaskId}
          onClose={() => setReschedulingTaskId(null)}
        />
      )}

      {contextMenuTarget && contextMenuPos && (
        <ContextMenu
          target={contextMenuTarget}
          position={contextMenuPos}
          onClose={() => {
            setContextMenuTarget(null);
            setContextMenuPos(null);
          }}
          onAction={handleContextMenuAction}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
