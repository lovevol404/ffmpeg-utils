import type { GPUType } from './gpu';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskType = 
  | 'convert'
  | 'compress' 
  | 'extract'
  | 'extract-frames'
  | 'extract-gif'
  | 'extract-audio'
  | 'extract-screenshot'
  | 'edit-trim'
  | 'edit-merge'
  | 'edit-watermark'
  | 'edit-subtitle';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  inputPath: string;
  outputPath: string;
  command: string;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  extraInputs?: string[];
  filterComplex?: string;
  filterSimple?: string;
  filterAudio?: string;
  inputArgs?: string[];
  concatFileList?: string;
  args?: string[];
  gpuType?: GPUType | 'auto';
  codec?: 'h264' | 'hevc';
}

export interface TaskQueue {
  tasks: Task[];
  maxConcurrent: number;
  currentRunning: number;
}