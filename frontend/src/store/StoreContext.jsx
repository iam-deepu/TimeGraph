import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Utils from '../utils/utils';

const StoreContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export function StoreProvider({ children }) {
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDateState] = useState(new Date());
  const [settings, setSettings] = useState({ defaultTimezone: Utils.getUserTimezone() });
  const [user, setUser] = useState(null); // { id, email, token }
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Local storage deletion logs for offline sync
  const [deletedSchedules, setDeletedSchedules] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  // Helper to trigger UI toast alerts
  const showToast = useCallback((title, message, type = 'info') => {
    const id = Utils.generateId();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set selected date
  const setSelectedDate = useCallback((date) => {
    setSelectedDateState(new Date(date));
  }, []);

  // Load initial data from LocalStorage on mount
  useEffect(() => {
    try {
      const storedSchedules = localStorage.getItem('timegraph_schedules');
      if (storedSchedules) setSchedules(JSON.parse(storedSchedules));

      const storedTasks = localStorage.getItem('timegraph_tasks');
      if (storedTasks) setTasks(JSON.parse(storedTasks));

      const storedSettings = localStorage.getItem('timegraph_settings');
      if (storedSettings) setSettings(JSON.parse(storedSettings));

      const storedUser = localStorage.getItem('timegraph_user');
      if (storedUser) setUser(JSON.parse(storedUser));

      const storedLastSync = localStorage.getItem('timegraph_last_synced_at');
      if (storedLastSync) setLastSyncedAt(Number(storedLastSync));

      const storedDelSchedules = localStorage.getItem('timegraph_deleted_schedules');
      if (storedDelSchedules) setDeletedSchedules(JSON.parse(storedDelSchedules));

      const storedDelTasks = localStorage.getItem('timegraph_deleted_tasks');
      if (storedDelTasks) setDeletedTasks(JSON.parse(storedDelTasks));
    } catch (e) {
      console.error('Error loading initial data from LocalStorage', e);
    }
  }, []);

  // Listeners for network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save active collections to LocalStorage
  const saveSchedulesToStorage = (list) => {
    localStorage.setItem('timegraph_schedules', JSON.stringify(list));
  };
  const saveTasksToStorage = (list) => {
    localStorage.setItem('timegraph_tasks', JSON.stringify(list));
  };

  // ============ AUTH ACTIONS ============
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to sign in');
      }
      const data = await res.json();
      const token = data.access_token;

      // Get user profile
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!profileRes.ok) throw new Error('Failed to retrieve user profile');
      const profile = await profileRes.json();

      const authenticatedUser = { id: profile.id, email: profile.email, token };
      setUser(authenticatedUser);
      localStorage.setItem('timegraph_user', JSON.stringify(authenticatedUser));
      
      // Reset sync tracking for the new user account (forces full merge on first sync)
      setLastSyncedAt(0);
      localStorage.setItem('timegraph_last_synced_at', '0');

      showToast('Welcome Back', `Logged in as ${email}`, 'success');
      return true;
    } catch (e) {
      showToast('Authentication Error', e.message, 'error');
      throw e;
    }
  };

  const register = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to register');
      }
      const data = await res.json();
      const token = data.access_token;

      // Get user profile
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!profileRes.ok) throw new Error('Failed to retrieve user profile');
      const profile = await profileRes.json();

      const authenticatedUser = { id: profile.id, email: profile.email, token };
      setUser(authenticatedUser);
      localStorage.setItem('timegraph_user', JSON.stringify(authenticatedUser));

      // Reset sync tracking for a fresh account
      setLastSyncedAt(0);
      localStorage.setItem('timegraph_last_synced_at', '0');

      showToast('Welcome', 'Account registered successfully!', 'success');
      return true;
    } catch (e) {
      showToast('Authentication Error', e.message, 'error');
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    setLastSyncedAt(0);
    setSchedules([]);
    setTasks([]);
    setDeletedSchedules([]);
    setDeletedTasks([]);
    localStorage.removeItem('timegraph_user');
    localStorage.removeItem('timegraph_schedules');
    localStorage.removeItem('timegraph_tasks');
    localStorage.removeItem('timegraph_last_synced_at');
    localStorage.removeItem('timegraph_deleted_schedules');
    localStorage.removeItem('timegraph_deleted_tasks');
    showToast('Signed Out', 'You have logged out.', 'info');
  };

  // ============ MUTATIONS ============

  const addSchedule = useCallback((data) => {
    const newSchedule = {
      id: Utils.generateId(),
      title: data.title || 'Untitled',
      description: data.description || '',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      color: data.color || '#00e676',
      recurrence: data.recurrence || 'none',
      recurrenceDays: data.recurrenceDays || [],
      reminders: data.reminders || [0, 5, 30],
      timezone: data.timezone || Utils.getUserTimezone(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSchedules((prev) => {
      const updated = [...prev, newSchedule];
      saveSchedulesToStorage(updated);
      return updated;
    });

    showToast('Schedule Created', newSchedule.title, 'success');
    return newSchedule;
  }, [showToast]);

  const updateSchedule = useCallback((id, updates) => {
    let updatedSched = null;
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const newList = [...prev];
      updatedSched = { ...newList[idx], ...updates, updatedAt: Date.now() };
      newList[idx] = updatedSched;
      saveSchedulesToStorage(newList);
      return newList;
    });

    if (updatedSched) {
      showToast('Schedule Updated', updatedSched.title, 'success');
    }
    return updatedSched;
  }, [showToast]);

  const deleteSchedule = useCallback((id) => {
    let deleted = null;
    setSchedules((prev) => {
      deleted = prev.find((s) => s.id === id);
      const filtered = prev.filter((s) => s.id !== id);
      saveSchedulesToStorage(filtered);
      return filtered;
    });

    // Unlink tasks pointing to this schedule
    setTasks((prev) => {
      const updated = prev.map((t) => (t.scheduleId === id ? { ...t, scheduleId: null, updatedAt: Date.now() } : t));
      saveTasksToStorage(updated);
      return updated;
    });

    if (deleted) {
      setDeletedSchedules((prev) => {
        const tombstone = { id: deleted.id, is_deleted: true, updatedAt: Date.now() };
        const list = [...prev, tombstone];
        localStorage.setItem('timegraph_deleted_schedules', JSON.stringify(list));
        return list;
      });
      showToast('Schedule Deleted', deleted.title, 'warning');
    }
    return deleted;
  }, [showToast]);

  const addTask = useCallback((data) => {
    const newTask = {
      id: Utils.generateId(),
      title: data.title || 'Untitled Task',
      description: data.description || '',
      scheduleId: data.scheduleId || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      status: 'upcoming',
      priority: data.priority || 'normal',
      originalDueDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTasks((prev) => {
      const updated = [...prev, newTask];
      saveTasksToStorage(updated);
      return updated;
    });

    showToast('Task Created', newTask.title, 'success');
    return newTask;
  }, [showToast]);

  const updateTask = useCallback((id, updates) => {
    let updatedTask = null;
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const newList = [...prev];
      updatedTask = { ...newList[idx], ...updates, updatedAt: Date.now() };
      newList[idx] = updatedTask;
      saveTasksToStorage(newList);
      return newList;
    });

    if (updatedTask) {
      showToast('Task Updated', updatedTask.title, 'success');
    }
    return updatedTask;
  }, [showToast]);

  const deleteTask = useCallback((id) => {
    let deleted = null;
    setTasks((prev) => {
      deleted = prev.find((t) => t.id === id);
      const filtered = prev.filter((t) => t.id !== id);
      saveTasksToStorage(filtered);
      return filtered;
    });

    if (deleted) {
      setDeletedTasks((prev) => {
        const tombstone = { id: deleted.id, is_deleted: true, updatedAt: Date.now() };
        const list = [...prev, tombstone];
        localStorage.setItem('timegraph_deleted_tasks', JSON.stringify(list));
        return list;
      });
      showToast('Task Deleted', deleted.title, 'warning');
    }
    return deleted;
  }, [showToast]);

  const rescheduleTask = useCallback((id, newDate, newTime) => {
    let updatedTask = null;
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const newList = [...prev];
      const task = newList[idx];
      updatedTask = {
        ...task,
        originalDueDate: task.originalDueDate || task.dueDate,
        dueDate: newDate,
        dueTime: newTime || task.dueTime,
        status: 'rescheduled',
        updatedAt: Date.now(),
      };
      newList[idx] = updatedTask;
      saveTasksToStorage(newList);
      return newList;
    });

    if (updatedTask) {
      showToast('Task Rescheduled', updatedTask.title, 'info');
    }
    return updatedTask;
  }, [showToast]);

  const completeTask = useCallback((id) => {
    let updatedTask = null;
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const newList = [...prev];
      const task = newList[idx];
      const newStatus = task.status === 'completed' ? 'upcoming' : 'completed';
      updatedTask = {
        ...task,
        status: newStatus,
        updatedAt: Date.now(),
      };
      newList[idx] = updatedTask;
      saveTasksToStorage(newList);
      return newList;
    });

    if (updatedTask) {
      showToast('Task Updated', updatedTask.title, 'success');
    }
    return updatedTask;
  }, [showToast]);

  // Sync action: Calls the backend API and reconciles differences
  const sync = useCallback(async () => {
    if (!isOnline || !user) return;
    setIsSyncing(true);

    try {
      // Find all items updated locally since lastSyncedAt
      const updatedSchedulesLocally = schedules.filter((s) => s.updatedAt > lastSyncedAt);
      const updatedTasksLocally = tasks.filter((t) => t.updatedAt > lastSyncedAt);

      // Merge local deleted logs
      const schedulesPayload = [...updatedSchedulesLocally, ...deletedSchedules];
      const tasksPayload = [...updatedTasksLocally, ...deletedTasks];

      const syncPayload = {
        last_synced_at: lastSyncedAt,
        schedules: schedulesPayload,
        tasks: tasksPayload,
      };

      const res = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(syncPayload),
      });

      if (!res.ok) {
        throw new Error('Sync endpoint failed');
      }

      const syncResult = await res.json();
      const { server_time, schedules: serverSchedules, tasks: serverTasks } = syncResult;

      // Reconcile Schedules:
      setSchedules((currentSchedules) => {
        let merged = [...currentSchedules];
        serverSchedules.forEach((serverItem) => {
          const idx = merged.findIndex((s) => s.id === serverItem.id);
          if (serverItem.is_deleted) {
            // Delete locally
            if (idx !== -1) merged.splice(idx, 1);
          } else {
            // Upsert locally
            if (idx === -1) {
              merged.push(serverItem);
            } else {
              // Only overwrite if server version is newer or equal
              if (serverItem.updatedAt >= merged[idx].updatedAt) {
                merged[idx] = serverItem;
              }
            }
          }
        });
        saveSchedulesToStorage(merged);
        return merged;
      });

      // Reconcile Tasks:
      setTasks((currentTasks) => {
        let merged = [...currentTasks];
        serverTasks.forEach((serverItem) => {
          const idx = merged.findIndex((t) => t.id === serverItem.id);
          if (serverItem.is_deleted) {
            // Delete locally
            if (idx !== -1) merged.splice(idx, 1);
          } else {
            // Upsert locally
            if (idx === -1) {
              merged.push(serverItem);
            } else {
              // Only overwrite if server version is newer or equal
              if (serverItem.updatedAt >= merged[idx].updatedAt) {
                merged[idx] = serverItem;
              }
            }
          }
        });
        saveTasksToStorage(merged);
        return merged;
      });

      // Update sync markers and purge deletion logs
      setLastSyncedAt(server_time);
      localStorage.setItem('timegraph_last_synced_at', String(server_time));

      setDeletedSchedules([]);
      localStorage.removeItem('timegraph_deleted_schedules');

      setDeletedTasks([]);
      localStorage.removeItem('timegraph_deleted_tasks');

      console.log(`Sync completed successfully at ${server_time}`);
    } catch (e) {
      console.error('Background sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, user, schedules, tasks, deletedSchedules, deletedTasks, lastSyncedAt]);

  // Periodically run background sync when online and user is active/logged in
  useEffect(() => {
    if (!user || !isOnline) return;

    // Trigger immediate sync on connection / login
    sync();

    // Setup periodic polling check (every 15 seconds)
    const interval = setInterval(() => {
      sync();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, isOnline, sync]);

  // Auto-flip missed tasks to pending (daily check)
  useEffect(() => {
    const todayStr = Utils.toDateStr(new Date());
    setTasks((currentTasks) => {
      let changed = false;
      const updated = currentTasks.map((t) => {
        if (t.status === 'upcoming' && t.dueDate && t.dueDate < todayStr) {
          changed = true;
          return { ...t, status: 'pending', updatedAt: Date.now() };
        }
        return t;
      });
      if (changed) {
        saveTasksToStorage(updated);
        return updated;
      }
      return currentTasks;
    });
  }, [schedules]); // trigger on selectedDate/schedules checks

  return (
    <StoreContext.Provider
      value={{
        schedules,
        tasks,
        selectedDate,
        setSelectedDate,
        settings,
        user,
        isOnline,
        isSyncing,
        toasts,
        showToast,
        dismissToast,
        login,
        register,
        logout,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addTask,
        updateTask,
        deleteTask,
        rescheduleTask,
        completeTask,
        sync,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
