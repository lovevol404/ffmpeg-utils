import { app, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';

export async function selectVideoFile(parentWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(parentWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.filePaths[0] || null;
}

export async function selectOutputFolder(parentWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(parentWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.filePaths[0] || null;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export function getDefaultOutputPath(): string {
  return path.join(app.getPath('documents'), 'FFmpeg-Utils-Output');
}