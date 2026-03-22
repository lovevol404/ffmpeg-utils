import { contextBridge, ipcRenderer } from 'electron';

export interface FFmpegExecuteOptions {
  taskId: string;
  input: string;
  output: string;
  args?: string[];
  inputArgs?: string[];
  extraInputs?: string[];
  filterComplex?: string;
  filterSimple?: string;
  filterAudio?: string;
  concatFileList?: string;
}

export interface FFmpegProgressEvent {
  taskId: string;
  progress: number;
}

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VideoInfo {
  path: string;
  name: string;
  size: number;
  streams?: {
    codec?: string;
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    fps?: number;
  };
}

export interface WorkflowTask {
  id: string;
  type: string;
  description: string;
  input: string;
  output: string;
  args: string[];
  filterComplex?: string;
  depends_on: string[];
}

export interface TranscribeOptions {
  videoPath: string;
  outputPath?: string;
  language?: string;
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  outputFormat?: 'srt' | 'vtt' | 'ass';
  modelPath?: string;  // Custom model directory path
}

export interface TranscribeProgress {
  status: 'extracting_audio' | 'loading_model' | 'transcribing' | 'saving' | 'completed';
  progress: number;
  currentTime: number;
  totalTime: number;
  message: string;
}

export interface TranscribeResult {
  success: boolean;
  outputPath?: string;
  language?: string;
  languageProbability?: number;
  duration?: number;
  segmentsCount?: number;
  error?: string;
}

export interface WhisperModelInfo {
  size: string;
  path?: string;
  available: boolean;
  source: 'local' | 'cache' | 'download';
}

export interface AvailableModelsResponse {
  models: WhisperModelInfo[];
  defaultModelDir: string;
}

export interface DownloadModelOptions {
  modelSize: string;
  modelPath?: string;
}

export interface DownloadModelProgress {
  status: 'starting' | 'downloading' | 'completed';
  progress: number;
  message: string;
}

export interface DownloadModelResult {
  success: boolean;
  modelSize?: string;
  path?: string;
  error?: string;
}

export interface ModelDownloadInfo {
  modelSize: string;
  huggingfaceUrl: string;
  repoId: string;
  estimatedSize: string;
  instructions: Record<string, string>;
}

export interface CUDAStatus {
  available: boolean;
  cudaVersion?: string;
  gpuName?: string;
  errorMessage?: string;
  installInstructions?: {
    platform: string;
    steps: string[];
    pytorchCommand: string;
    downloadUrls?: Record<string, string>;
    note: string;
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  ffmpeg: {
    execute: (options: FFmpegExecuteOptions) => ipcRenderer.invoke('ffmpeg:execute', options),
    cancel: (taskId?: string) => ipcRenderer.invoke('ffmpeg:cancel', taskId),
    getVersion: () => ipcRenderer.invoke('ffmpeg:version'),
    getVideoInfo: (filePath: string) => ipcRenderer.invoke('ffmpeg:getVideoInfo', filePath),
    onProgress: (callback: (event: FFmpegProgressEvent) => void) => {
      ipcRenderer.on('ffmpeg:progress', (_event, data) => callback(data));
    },
  },
  gpu: {
    detect: () => ipcRenderer.invoke('gpu:detect'),
  },
  fs: {
    selectFile: (filterType?: 'video' | 'image' | 'subtitle' | 'audio') => ipcRenderer.invoke('fs:selectFile', filterType),
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
    getFileInfo: (filePath: string) => ipcRenderer.invoke('fs:getFileInfo', filePath),
    openPath: (path: string) => ipcRenderer.invoke('fs:openPath', path),
    openUrl: (url: string) => ipcRenderer.invoke('fs:openUrl', url),
    showItemInFolder: (path: string) => ipcRenderer.invoke('fs:showItemInFolder', path),
    pathExists: (filePath: string) => ipcRenderer.invoke('fs:pathExists', filePath),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },
  ai: {
    start: () => ipcRenderer.invoke('ai:start'),
    stop: () => ipcRenderer.invoke('ai:stop'),
    status: () => ipcRenderer.invoke('ai:status'),
    configure: (config: AIConfig) => ipcRenderer.invoke('ai:configure', config),
    chat: (message: string, videoInfo: VideoInfo | null, history: ChatMessage[]) => 
      ipcRenderer.invoke('ai:chat', message, videoInfo, history),
    workflow: (conversation: ChatMessage[]) => 
      ipcRenderer.invoke('ai:workflow', conversation),
    transcribe: (options: TranscribeOptions) => 
      ipcRenderer.invoke('ai:transcribe', options),
    onTranscribeProgress: (callback: (progress: TranscribeProgress) => void) => {
      ipcRenderer.on('ai:transcribe:progress', (_event, data) => callback(data));
    },
    removeTranscribeProgressListener: () => {
      ipcRenderer.removeAllListeners('ai:transcribe:progress');
    },
    getAvailableModels: (modelPath?: string) => 
      ipcRenderer.invoke('ai:getAvailableModels', modelPath),
    downloadModel: (options: DownloadModelOptions) => 
      ipcRenderer.invoke('ai:downloadModel', options),
    onDownloadModelProgress: (callback: (progress: DownloadModelProgress) => void) => {
      ipcRenderer.on('ai:downloadModel:progress', (_event, data) => callback(data));
    },
    removeDownloadModelProgressListener: () => {
      ipcRenderer.removeAllListeners('ai:downloadModel:progress');
    },
    getModelDownloadInfo: (modelSize: string) => 
      ipcRenderer.invoke('ai:getModelDownloadInfo', modelSize),
    getCUDAStatus: (): Promise<CUDAStatus> => 
      ipcRenderer.invoke('ai:getCUDAStatus'),
  },
});