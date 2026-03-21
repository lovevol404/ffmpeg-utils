import { create } from 'zustand';
import type { GPUType, GPUCapability } from '@/types/gpu';

interface AppState {
  currentModule: 'convert' | 'edit' | 'compress' | 'extract' | 'queue' | 'settings';
  showCommand: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  defaultOutputPath: string;
  gpuAcceleration: GPUType | 'auto';
  detectedGPU: GPUCapability | null;
  setCurrentModule: (module: AppState['currentModule']) => void;
  toggleShowCommand: () => void;
  setTheme: (theme: AppState['theme']) => void;
  setDefaultOutputPath: (path: string) => void;
  setGPUAcceleration: (acceleration: GPUType | 'auto') => void;
  setDetectedGPU: (gpu: GPUCapability | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'convert',
  showCommand: true,
  theme: 'light',
  language: 'zh-CN',
  defaultOutputPath: '',
  gpuAcceleration: 'auto',
  detectedGPU: null,
  setCurrentModule: (module) => set({ currentModule: module }),
  toggleShowCommand: () => set((state) => ({ showCommand: !state.showCommand })),
  setTheme: (theme) => set({ theme }),
  setDefaultOutputPath: (path) => set({ defaultOutputPath: path }),
  setGPUAcceleration: (acceleration) => set({ gpuAcceleration: acceleration }),
  setDetectedGPU: (gpu) => set({ detectedGPU: gpu }),
}));