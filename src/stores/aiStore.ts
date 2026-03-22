import { create } from 'zustand';
import type { 
  AIChatMessage, 
  AIVideoInfo, 
  AIWorkflowResponse,
  AIConfig,
  AIWatermarkInfo,
} from '@/types/ai';

interface AIState {
  messages: AIChatMessage[];
  selectedVideos: AIVideoInfo[];
  watermark: AIWatermarkInfo | null;
  workflow: AIWorkflowResponse | null;
  isLoading: boolean;
  isServiceRunning: boolean;
  serviceUrl: string;
  config: AIConfig | null;
  workDirectory: string | null;
  
  addMessage: (message: AIChatMessage) => void;
  setMessages: (messages: AIChatMessage[]) => void;
  clearMessages: () => void;
  
  setSelectedVideos: (videos: AIVideoInfo[]) => void;
  addSelectedVideo: (video: AIVideoInfo) => void;
  removeSelectedVideo: (path: string) => void;
  clearSelectedVideos: () => void;
  
  setWatermark: (watermark: AIWatermarkInfo | null) => void;
  clearWatermark: () => void;
  
  setWorkflow: (workflow: AIWorkflowResponse | null) => void;
  clearWorkflow: () => void;
  
  setLoading: (loading: boolean) => void;
  setServiceStatus: (running: boolean, url: string) => void;
  setConfig: (config: AIConfig | null) => void;
  
  setWorkDirectory: (directory: string | null) => void;
  startNewSession: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  selectedVideos: [],
  watermark: null,
  workflow: null,
  isLoading: false,
  isServiceRunning: false,
  serviceUrl: '',
  config: null,
  workDirectory: null,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setMessages: (messages) => set({ messages }),
  
  clearMessages: () => set({ messages: [], workflow: null }),
  
  setSelectedVideos: (videos) => set({ selectedVideos: videos }),
  
  addSelectedVideo: (video) => set((state) => {
    const exists = state.selectedVideos.some(v => v.path === video.path);
    if (exists) return state;
    return { selectedVideos: [...state.selectedVideos, video] };
  }),
  
  removeSelectedVideo: (path) => set((state) => ({
    selectedVideos: state.selectedVideos.filter(v => v.path !== path)
  })),
  
  clearSelectedVideos: () => set({ selectedVideos: [] }),
  
  setWatermark: (watermark) => set({ watermark }),
  
  clearWatermark: () => set({ watermark: null }),
  
  setWorkflow: (workflow) => set({ workflow }),
  
  clearWorkflow: () => set({ workflow: null }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setServiceStatus: (running, url) => set({ 
    isServiceRunning: running, 
    serviceUrl: url 
  }),
  
  setConfig: (config) => set({ config }),
  
  setWorkDirectory: (directory) => set({ workDirectory: directory }),
  
  startNewSession: () => set({ 
    messages: [], 
    selectedVideos: [], 
    watermark: null,
    workflow: null 
  }),
}));