export * from './ffmpeg';
export * from './task';

interface FFmpegExecuteOptions {
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

declare global {
  interface Window {
    electronAPI?: {
      ping: () => Promise<string>;
      ffmpeg: {
        execute: (options: FFmpegExecuteOptions) => Promise<import('./ffmpeg').FFmpegExecutionResult>;
        cancel: () => Promise<boolean>;
        getVersion: () => Promise<string>;
        getVideoInfo: (filePath: string) => Promise<import('./ffmpeg').VideoInfo | null>;
        onProgress: (callback: (progress: number) => void) => void;
      };
      fs: {
        selectFile: (filterType?: 'video' | 'image' | 'subtitle') => Promise<string[]>;
        selectFolder: () => Promise<string | null>;
        getFileInfo: (filePath: string) => Promise<{ path: string; name: string; size: number } | null>;
        openPath: (path: string) => Promise<boolean>;
        showItemInFolder: (path: string) => Promise<boolean>;
        pathExists: (filePath: string) => Promise<boolean>;
      };
    };
  }
}