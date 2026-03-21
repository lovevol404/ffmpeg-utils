import { create } from 'zustand';
import type { Task, TaskStatus } from '@/types';

interface TaskState {
  tasks: Task[];
  maxConcurrent: number;
  addTask: (task: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearCompleted: () => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  maxConcurrent: 2,
  
  addTask: (taskData) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      ...taskData,
      id,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };
    set((state) => ({ tasks: [...state.tasks, task] }));
    return id;
  },
  
  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  },
  
  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },
  
  cancelTask: (id) => {
    if (window.electronAPI?.ffmpeg?.cancel) {
      window.electronAPI.ffmpeg.cancel();
    }
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: 'failed' as TaskStatus, error: '用户取消' } : task
      ),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed'),
    }));
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },
}));