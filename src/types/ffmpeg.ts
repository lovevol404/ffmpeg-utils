export interface FFmpegProgress {
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  progress: number;
}

export interface FFmpegExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export interface VideoInfo {
  path: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
  format: string;
}

export interface OutputFormat {
  name: string;
  extension: string;
  codec: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  format: string;
  codec: string;
  resolution?: string;
  bitrate?: string;
  isBuiltIn: boolean;
}