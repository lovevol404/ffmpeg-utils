export * from './ffmpeg';
export * from './task';
export * from './gpu';
export * from './ai';

interface FFmpegExecuteOptions {
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

interface FFmpegProgressEvent {
  taskId: string;
  progress: number;
}

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>;
      ffmpeg: {
        execute: (options: FFmpegExecuteOptions) => Promise<import('./ffmpeg').FFmpegExecutionResult & { taskId?: string }>;
        cancel: (taskId?: string) => Promise<boolean>;
        getVersion: () => Promise<string>;
        getVideoInfo: (filePath: string) => Promise<import('./ffmpeg').VideoInfo | null>;
        onProgress: (callback: (event: FFmpegProgressEvent) => void) => void;
      };
      gpu: {
        detect: () => Promise<import('./gpu').GPUCapability | null>;
      };
      fs: {
        selectFile: (filterType?: 'video' | 'image' | 'subtitle' | 'audio') => Promise<string[]>;
        selectFolder: () => Promise<string | null>;
        getFileInfo: (filePath: string) => Promise<{ path: string; name: string; size: number } | null>;
        openPath: (path: string) => Promise<boolean>;
        openUrl: (url: string) => Promise<boolean>;
        showItemInFolder: (path: string) => Promise<boolean>;
        pathExists: (filePath: string) => Promise<boolean>;
      };
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      ai: {
        start: () => Promise<{ success: boolean; port?: number; baseUrl?: string; error?: string }>;
        stop: () => Promise<{ success: boolean; error?: string }>;
        status: () => Promise<{ running: boolean; baseUrl: string; port: number }>;
        configure: (config: import('./ai').AIConfig) => Promise<{ success: boolean; error?: string }>;
        chat: (message: string, videoInfo: import('./ai').AIVideoInfo | null, history: import('./ai').AIChatMessage[]) => Promise<{ success: boolean; data?: import('./ai').AIChatMessage; error?: string }>;
        workflow: (conversation: import('./ai').AIChatMessage[]) => Promise<{ success: boolean; data?: import('./ai').AIWorkflowResponse; error?: string }>;
        transcribe: (options: import('./ai').TranscribeOptions) => Promise<{ success: boolean; data?: import('./ai').TranscribeResult; error?: string }>;
        onTranscribeProgress: (callback: (progress: import('./ai').TranscribeProgress) => void) => void;
        removeTranscribeProgressListener: () => void;
        getAvailableModels: (modelPath?: string) => Promise<{ success: boolean; data?: import('./ai').AvailableModelsResponse; error?: string }>;
        downloadModel: (options: import('./ai').DownloadModelOptions) => Promise<{ success: boolean; data?: import('./ai').DownloadModelResult; error?: string }>;
        onDownloadModelProgress: (callback: (progress: import('./ai').DownloadModelProgress) => void) => void;
        removeDownloadModelProgressListener: () => void;
        getModelDownloadInfo: (modelSize: string) => Promise<{ success: boolean; data?: import('./ai').ModelDownloadInfo; error?: string }>;
        getCUDAStatus: () => Promise<import('./ai').CUDAStatus>;
      };
    };
  }
}