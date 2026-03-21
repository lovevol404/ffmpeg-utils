import { create } from 'zustand';

interface AppState {
  currentModule: 'convert' | 'edit' | 'compress' | 'extract' | 'queue';
  showCommand: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  defaultOutputPath: string;
  setCurrentModule: (module: AppState['currentModule']) => void;
  toggleShowCommand: () => void;
  setTheme: (theme: AppState['theme']) => void;
  setDefaultOutputPath: (path: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'convert',
  showCommand: true,
  theme: 'light',
  language: 'zh-CN',
  defaultOutputPath: '',
  setCurrentModule: (module) => set({ currentModule: module }),
  toggleShowCommand: () => set((state) => ({ showCommand: !state.showCommand })),
  setTheme: (theme) => set({ theme }),
  setDefaultOutputPath: (path) => set({ defaultOutputPath: path }),
}));