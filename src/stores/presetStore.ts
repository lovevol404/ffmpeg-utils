import { create } from 'zustand';
import type { Preset } from '@/types';

const builtInPresets: Preset[] = [
  {
    id: 'wechat',
    name: '微信视频',
    description: '适合微信发送的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '720p',
    bitrate: '1M',
    isBuiltIn: true,
  },
  {
    id: 'douyin',
    name: '抖音视频',
    description: '适合抖音上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '2M',
    isBuiltIn: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: '适合 YouTube 上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '8M',
    isBuiltIn: true,
  },
  {
    id: 'bilibili',
    name: 'B站视频',
    description: '适合 Bilibili 上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '6M',
    isBuiltIn: true,
  },
];

interface PresetState {
  presets: Preset[];
  selectedPresetId: string | null;
  addPreset: (preset: Omit<Preset, 'id' | 'isBuiltIn'>) => void;
  removePreset: (id: string) => void;
  selectPreset: (id: string | null) => void;
  getPresetById: (id: string) => Preset | undefined;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: builtInPresets,
  selectedPresetId: null,
  
  addPreset: (presetData) => {
    const id = `custom-${Date.now()}`;
    const preset: Preset = {
      ...presetData,
      id,
      isBuiltIn: false,
    };
    set((state) => ({ presets: [...state.presets, preset] }));
  },
  
  removePreset: (id) => {
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id || p.isBuiltIn),
    }));
  },
  
  selectPreset: (id) => set({ selectedPresetId: id }),
  
  getPresetById: (id) => get().presets.find((p) => p.id === id),
}));