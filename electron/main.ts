import { app, BrowserWindow, ipcMain, dialog, shell, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { initFFmpeg, executeFFmpeg, getFFmpegVersion, getVideoInfo } from './services/ffmpeg';
import { detectGPU } from './services/gpuDetector';
import { pythonService } from './services/pythonService';
import Store from 'electron-store';
import { ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
const activeProcesses: Map<string, ChildProcess> = new Map();

const store = new Store();

function setupLogging() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `main-${new Date().toISOString().slice(0, 10)}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  console.log = (...args) => {
    const msg = `[${new Date().toISOString()}] [INFO] ${args.join(' ')}\n`;
    logStream.write(msg);
    originalConsoleLog.apply(console, args);
  };
  
  console.error = (...args) => {
    const msg = `[${new Date().toISOString()}] [ERROR] ${args.join(' ')}\n`;
    logStream.write(msg);
    originalConsoleError.apply(console, args);
  };
  
  process.on('uncaughtException', (error) => {
    const msg = `[${new Date().toISOString()}] [UNCAUGHT] ${error.stack || error.message}\n`;
    logStream.write(msg);
    originalConsoleError(error);
  });
  
  process.on('unhandledRejection', (reason) => {
    const msg = `[${new Date().toISOString()}] [UNHANDLED] ${reason}\n`;
    logStream.write(msg);
    originalConsoleError(reason);
  });
  
  console.log('=== Application started ===');
  console.log('App path:', app.getAppPath());
  console.log('User data path:', app.getPath('userData'));
  console.log('Log file:', logFile);
}

function createWindow() {
  console.log('Creating main window...');
  
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
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(async () => {
  setupLogging();
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

ipcMain.handle('ffmpeg:execute', async (_event, options: { 
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
}) => {
  const { taskId, ...ffmpegOptions } = options;
  
  return new Promise((resolve) => {
    const proc = executeFFmpeg({
      ...ffmpegOptions,
      args: ffmpegOptions.args || [],
      onProgress: (progress) => {
        // 发送带有 taskId 的进度事件，支持多任务并发
        mainWindow?.webContents.send('ffmpeg:progress', { taskId, progress });
      },
      onComplete: () => {
        activeProcesses.delete(taskId);
        resolve({ success: true, taskId });
      },
      onError: (error) => {
        activeProcesses.delete(taskId);
        resolve({ success: false, error, taskId });
      },
    });
    // 存储进程以支持取消
    activeProcesses.set(taskId, proc);
  });
});

ipcMain.handle('ffmpeg:cancel', async (_event, taskId?: string) => {
  if (taskId) {
    // 取消特定任务
    const proc = activeProcesses.get(taskId);
    if (proc) {
      proc.kill('SIGTERM');
      activeProcesses.delete(taskId);
      return true;
    }
    return false;
  } else {
    // 兼容旧版：取消所有任务
    activeProcesses.forEach((proc) => proc.kill('SIGTERM'));
    activeProcesses.clear();
    return true;
  }
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
    case 'audio':
      filters = [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'ape', 'opus'] },
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

ipcMain.handle('fs:openUrl', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
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

// GPU detection handler
ipcMain.handle('gpu:detect', async () => {
  try {
    return await detectGPU();
  } catch (err) {
    console.error('GPU detection failed:', err);
    return null;
  }
});

// AI IPC handlers
ipcMain.handle('ai:start', async () => {
  try {
    const result = await pythonService.start();
    return { success: true, port: result.port, baseUrl: result.baseUrl };
  } catch (err) {
    console.error('Failed to start Python service:', err);
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('ai:stop', async () => {
  try {
    pythonService.stop();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('ai:status', async () => {
  return {
    running: pythonService.isRunning(),
    baseUrl: pythonService.getUrl(),
    port: pythonService.getPort(),
  };
});

ipcMain.handle('ai:configure', async (_event, config: { apiKey: string; baseUrl: string; model: string }) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    const request = net.request({
      method: 'POST',
      url: `${pythonUrl}/api/configure`,
    });

    request.setHeader('Content-Type', 'application/json');

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.write(JSON.stringify(config));
      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('ai:chat', async (_event, message: string, videoInfo: unknown, history: unknown[]) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    const request = net.request({
      method: 'POST',
      url: `${pythonUrl}/api/chat/sync`,
    });

    request.setHeader('Content-Type', 'application/json');

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ success: true, data: JSON.parse(responseData) });
          } else {
            resolve({ success: false, error: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.write(JSON.stringify({
        message,
        video_info: videoInfo,
        history,
      }));
      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('ai:workflow', async (_event, conversation: unknown[]) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    const request = net.request({
      method: 'POST',
      url: `${pythonUrl}/api/workflow`,
    });

    request.setHeader('Content-Type', 'application/json');

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ success: true, data: JSON.parse(responseData) });
          } else {
            resolve({ success: false, error: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.write(JSON.stringify(conversation));
      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Transcribe IPC handler - handles SSE streaming from Python backend
interface TranscribeOptions {
  videoPath: string;
  outputPath?: string;
  language?: string;
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  outputFormat?: 'srt' | 'vtt' | 'ass';
  modelPath?: string;
}

ipcMain.handle('ai:transcribe', async (_event, options: TranscribeOptions) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    console.log('[Transcribe] Starting transcription:', {
      videoPath: options.videoPath,
      modelSize: options.modelSize,
      outputFormat: options.outputFormat
    });

    const request = net.request({
      method: 'POST',
      url: `${pythonUrl}/api/transcribe`,
    });

    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'text/event-stream');

    return new Promise((resolve) => {
      let buffer = '';
      let finalResult: { success: boolean; data?: unknown; error?: string } | null = null;
      
      request.on('response', (response) => {
        console.log('[Transcribe] Response status:', response.statusCode);
        
        response.on('data', (chunk) => {
          buffer += chunk.toString();
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === 'progress') {
                  mainWindow?.webContents.send('ai:transcribe:progress', eventData.data);
                } else if (eventData.type === 'result') {
                  console.log('[Transcribe] Result received:', eventData.data);
                  finalResult = { success: true, data: eventData.data };
                } else if (eventData.type === 'error') {
                  const errorMsg = eventData.data?.error || eventData.data?.message || JSON.stringify(eventData.data);
                  console.error('[Transcribe] Error from server:', errorMsg);
                  finalResult = { success: false, error: errorMsg };
                }
              } catch (parseErr) {
                console.error('[Transcribe] Failed to parse SSE event:', line, parseErr);
              }
            }
          }
        });
        
        response.on('end', () => {
          if (finalResult) {
            console.log('[Transcribe] Completed with result');
            resolve(finalResult);
          } else {
            console.error('[Transcribe] No result received, buffer:', buffer);
            resolve({ success: false, error: '转录服务未返回结果，请检查日志' });
          }
        });
      });

      request.on('error', (err) => {
        console.error('[Transcribe] Request error:', err);
        resolve({ success: false, error: `请求失败: ${err.message}` });
      });

      request.write(JSON.stringify({
        videoPath: options.videoPath,
        outputPath: options.outputPath,
        language: options.language,
        modelSize: options.modelSize || 'base',
        outputFormat: options.outputFormat || 'srt',
        modelPath: options.modelPath,
      }));
      request.end();
    });
  } catch (err) {
    console.error('[Transcribe] Exception:', err);
    return { success: false, error: (err as Error).message };
  }
});

// Get available Whisper models
ipcMain.handle('ai:getAvailableModels', async (_event, modelPath?: string) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    let url = `${pythonUrl}/api/models`;
    if (modelPath) {
      url += `?model_path=${encodeURIComponent(modelPath)}`;
    }

    const request = net.request({
      method: 'GET',
      url,
    });

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ success: true, data: JSON.parse(responseData) });
          } else {
            resolve({ success: false, error: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Download Whisper model
ipcMain.handle('ai:downloadModel', async (_event, options: { modelSize: string; modelPath?: string }) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    const request = net.request({
      method: 'POST',
      url: `${pythonUrl}/api/models/download`,
    });

    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'text/event-stream');

    return new Promise((resolve) => {
      let buffer = '';
      let finalResult: { success: boolean; data?: unknown; error?: string } | null = null;
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === 'progress') {
                  mainWindow?.webContents.send('ai:downloadModel:progress', eventData.data);
                } else if (eventData.type === 'result') {
                  finalResult = { success: true, data: eventData.data };
                } else if (eventData.type === 'error') {
                  finalResult = { success: false, error: eventData.data.error };
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        });
        
        response.on('end', () => {
          if (finalResult) {
            resolve(finalResult);
          } else {
            resolve({ success: false, error: 'No result received from download service' });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.write(JSON.stringify({
        modelSize: options.modelSize,
        modelPath: options.modelPath,
      }));
      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Get model download info (URL and instructions)
ipcMain.handle('ai:getModelDownloadInfo', async (_event, modelSize: string) => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { success: false, error: 'Python service not running' };
    }

    const request = net.request({
      method: 'GET',
      url: `${pythonUrl}/api/models/download-info/${modelSize}`,
    });

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve({ success: true, data: JSON.parse(responseData) });
          } else {
            resolve({ success: false, error: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      request.end();
    });
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Get CUDA status for Whisper GPU acceleration
ipcMain.handle('ai:getCUDAStatus', async () => {
  try {
    const pythonUrl = pythonService.getUrl();
    if (!pythonUrl) {
      return { available: false, errorMessage: 'Python service not running' };
    }

    const request = net.request({
      method: 'GET',
      url: `${pythonUrl}/api/cuda-status`,
    });

    return new Promise((resolve) => {
      let responseData = '';
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(JSON.parse(responseData));
          } else {
            resolve({ available: false, errorMessage: responseData });
          }
        });
      });

      request.on('error', (err) => {
        resolve({ available: false, errorMessage: err.message });
      });

      request.end();
    });
  } catch (err) {
    return { available: false, errorMessage: (err as Error).message };
  }
});