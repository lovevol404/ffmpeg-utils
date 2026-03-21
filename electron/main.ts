import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initFFmpeg, executeFFmpeg, getFFmpegVersion, getVideoInfo } from './services/ffmpeg';
import Store from 'electron-store';
import { ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let currentProcess: ChildProcess | null = null;

const store = new Store();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F0FDFA',
  });

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initFFmpeg();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('ping', () => 'pong');

ipcMain.handle('ffmpeg:execute', async (_event, options: { input: string; output: string; args?: string[]; inputArgs?: string[]; extraInputs?: string[]; filterComplex?: string; filterSimple?: string; filterAudio?: string; concatFileList?: string }) => {
  return new Promise((resolve) => {
    const proc = executeFFmpeg({
      input: options.input,
      output: options.output,
      args: options.args || [],
      inputArgs: options.inputArgs,
      extraInputs: options.extraInputs,
      filterComplex: options.filterComplex,
      filterSimple: options.filterSimple,
      filterAudio: options.filterAudio,
      concatFileList: options.concatFileList,
      onProgress: (progress) => {
        mainWindow?.webContents.send('ffmpeg:progress', progress);
      },
      onComplete: () => {
        currentProcess = null;
        resolve({ success: true });
      },
      onError: (error) => {
        currentProcess = null;
        resolve({ success: false, error });
      },
    });
    currentProcess = proc;
  });
});

ipcMain.handle('ffmpeg:cancel', async () => {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
    return true;
  }
  return false;
});

ipcMain.handle('ffmpeg:version', async () => {
  try {
    return await getFFmpegVersion();
  } catch {
    return 'not found';
  }
});

ipcMain.handle('fs:selectFile', async (_event, filterType?: string) => {
  let filters: { name: string; extensions: string[] }[] = [];
  
  switch (filterType) {
    case 'image':
      filters = [
        { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
        { name: 'All Files', extensions: ['*'] },
      ];
      break;
    case 'video':
      filters = [
        { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ];
      break;
    case 'subtitle':
      filters = [
        { name: 'Subtitle Files', extensions: ['srt', 'ass', 'ssa', 'vtt', 'sub'] },
        { name: 'All Files', extensions: ['*'] },
      ];
      break;
    default:
      filters = [
        { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'] },
        { name: 'All Files', extensions: ['*'] },
      ];
  }
  
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters,
  });
  return result.filePaths;
});

ipcMain.handle('fs:getFileInfo', async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
    };
  } catch (err) {
    return null;
  }
});

ipcMain.handle('ffmpeg:getVideoInfo', async (_event, filePath: string) => {
  try {
    return await getVideoInfo(filePath);
  } catch (err) {
    return null;
  }
});

ipcMain.handle('fs:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('fs:openPath', async (_event, filePath: string) => {
  try {
    await shell.openPath(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:showItemInFolder', async (_event, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:pathExists', async (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

// Store IPC handlers
ipcMain.handle('store:get', (_event, key: string) => store.get(key));
ipcMain.handle('store:set', (_event, key: string, value: unknown) => store.set(key, value));
ipcMain.handle('store:delete', (_event, key: string) => store.delete(key));