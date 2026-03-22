import { create } from 'zustand';
import type { Task, TaskStatus } from '@/types';

interface TaskState {
  tasks: Task[];
  maxConcurrent: number;
  loaded: boolean;
  addTask: (task: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  canStartTask: (taskId: string) => boolean;
  getDependentTasks: (taskId: string) => Task[];
  loadTasks: () => Promise<void>;
  saveTasks: () => Promise<void>;
}

const TASKS_STORAGE_KEY = 'tasks';

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  maxConcurrent: 2,
  loaded: false,
  
  addTask: (taskData) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      ...taskData,
      id,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };
    // 设置 loaded: true 防止 loadTasks 被错误调用
    set((state) => ({ tasks: [...state.tasks, task], loaded: true }));
    get().saveTasks();
    return id;
  },
  
  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
    get().saveTasks();
  },
  
  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
    get().saveTasks();
  },
  
cancelTask: (id) => {
      if (window.electronAPI?.ffmpeg?.cancel) {
        window.electronAPI.ffmpeg.cancel(id);  // 取消特定任务
      }
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, status: 'failed' as TaskStatus, error: '用户取消' } : task
        ),
      }));
      get().saveTasks();
    },
  
  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed'),
    }));
    get().saveTasks();
  },
  
  clearAll: () => {
    set({ tasks: [] });
    get().saveTasks();
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },
  
  canStartTask: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task || !task.dependsOn || task.dependsOn.length === 0) {
      return true;
    }
    return task.dependsOn.every((depId) => {
      const depTask = get().tasks.find((t) => t.id === depId);
      return depTask?.status === 'completed';
    });
  },
  
  getDependentTasks: (taskId) => {
    return get().tasks.filter((task) => task.dependsOn?.includes(taskId));
  },
  
  loadTasks: async () => {
    // 防止重复加载
    if (get().loaded) {
      return;
    }
    
    if (!window.electronAPI?.store?.get) {
      set({ loaded: true });
      return;
    }
    
    try {
      const stored = await window.electronAPI.store.get(TASKS_STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        const tasks = stored.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        }));
        const pendingToFailed = tasks.map((t: Task) => 
          t.status === 'pending' || t.status === 'processing'
            ? { ...t, status: 'failed' as TaskStatus, error: '应用重启，任务中断' }
            : t
        );
        set({ tasks: pendingToFailed, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      set({ loaded: true });
    }
  },
  
  saveTasks: async () => {
    if (!window.electronAPI?.store?.set) return;
    
    try {
      const { tasks } = get();
      await window.electronAPI.store.set(TASKS_STORAGE_KEY, tasks);
    } catch (err) {
      console.error('Failed to save tasks:', err);
    }
  },
}));