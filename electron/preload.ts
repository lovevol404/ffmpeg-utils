import { contextBridge, ipcRenderer } from 'electron';

export interface FFmpegExecuteOptions {
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

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  ffmpeg: {
    execute: (options: FFmpegExecuteOptions) => ipcRenderer.invoke('ffmpeg:execute', options),
    cancel: () => ipcRenderer.invoke('ffmpeg:cancel'),
    getVersion: () => ipcRenderer.invoke('ffmpeg:version'),
    getVideoInfo: (filePath: string) => ipcRenderer.invoke('ffmpeg:getVideoInfo', filePath),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
    },
  },
  gpu: {
    detect: () => ipcRenderer.invoke('gpu:detect'),
  },
  fs: {
    selectFile: (filterType?: 'video' | 'image' | 'subtitle') => ipcRenderer.invoke('fs:selectFile', filterType),
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
    getFileInfo: (filePath: string) => ipcRenderer.invoke('fs:getFileInfo', filePath),
    openPath: (path: string) => ipcRenderer.invoke('fs:openPath', path),
    showItemInFolder: (path: string) => ipcRenderer.invoke('fs:showItemInFolder', path),
    pathExists: (filePath: string) => ipcRenderer.invoke('fs:pathExists', filePath),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },
});