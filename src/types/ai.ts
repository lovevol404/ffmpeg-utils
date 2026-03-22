export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AIChatRole = 'user' | 'assistant' | 'system';

export interface AIChatMessage {
  role: AIChatRole;
  content: string;
}

export interface AIVideoStreamInfo {
  codec?: string;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  fps?: number;
}

export interface AIVideoInfo {
  path: string;
  name: string;
  size: number;
  streams?: AIVideoStreamInfo;
}

export type AITaskType = 
  | 'convert'
  | 'compress'
  | 'extract_audio'
  | 'extract_frame'
  | 'cut'
  | 'merge'
  | 'add_subtitle'
  | 'add_watermark'
  | 'custom';

export interface AIWorkflowTask {
  id: string;
  type: AITaskType;
  description: string;
  input: string | string[];
  output: string;
  args: string[];
  filterComplex?: string;
  depends_on: string[];
}

export interface AIWorkflowResponse {
  tasks: AIWorkflowTask[];
  description: string;
}

export interface AIServiceStatus {
  running: boolean;
  baseUrl: string;
  port: number;
}

export interface AIWatermarkInfo {
  path: string;
  name: string;
  size: number;
}

// Transcription types for subtitle generation

export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

export type SubtitleFormat = 'srt' | 'vtt' | 'ass';

export interface TranscribeOptions {
  videoPath: string;
  outputPath?: string;
  language?: string;  // 'auto' or 'zh', 'en', 'ja', etc.
  modelSize?: WhisperModelSize;
  outputFormat?: SubtitleFormat;
  modelPath?: string;  // Custom model directory path
}

export interface TranscribeProgress {
  status: 'extracting_audio' | 'loading_model' | 'transcribing' | 'saving' | 'completed';
  progress: number;  // 0.0 - 1.0
  currentTime: number;  // Current processing time in seconds
  totalTime: number;  // Total audio duration in seconds
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

// Whisper model info

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

export interface WhisperConfig {
  modelPath?: string;  // Custom model directory path
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

export interface CUDAInstallInstructions {
  platform: string;
  steps: string[];
  pytorchCommand: string;
  downloadUrls?: Record<string, string>;
  note: string;
}

export interface CUDAStatus {
  available: boolean;
  cudaVersion?: string;
  gpuName?: string;
  errorMessage?: string;
  installInstructions?: CUDAInstallInstructions;
}