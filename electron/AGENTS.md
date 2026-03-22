# Electron Main Process

Electron main process with IPC handlers, FFmpeg integration, and Python service management.

## Overview

- Entry: `main.ts` — BrowserWindow creation, IPC registration, app lifecycle
- Preload: `preload.ts` — Context bridge exposing safe IPC API to renderer
- Services: `services/` — FFmpeg, GPU detection, Python process, file system

## Structure

```
electron/
├── main.ts           # App entry, window creation, ~20 IPC handlers
├── preload.ts        # Context bridge, type definitions
└── services/
    ├── ffmpeg.ts       # FFmpeg execution, progress, cancellation
    ├── gpuDetector.ts  # Hardware acceleration detection (NVENC/QSV/AMF)
    ├── pythonService.ts # Python backend lifecycle management
    └── fileSystem.ts   # File operations (unused, merged into main.ts)
```

## Where to Look

| Task | Location |
|------|----------|
| Add IPC handler | `main.ts` → `ipcMain.handle('namespace:action', ...)` |
| Expose to renderer | `preload.ts` → `contextBridge.exposeInMainWorld` |
| Modify FFmpeg execution | `services/ffmpeg.ts` |
| GPU detection logic | `services/gpuDetector.ts` |
| Python service control | `services/pythonService.ts` |

## IPC Pattern

### Handler (main.ts)
```typescript
ipcMain.handle('namespace:action', async (_event, arg: Type) => {
  try {
    return { success: true, data: result };
  } catch {
    return { success: false, error: 'message' };
  }
});
```

### Exposure (preload.ts)
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  namespace: {
    action: (arg: Type) => ipcRenderer.invoke('namespace:action', arg),
  },
});
```

### Type Definition (preload.ts)
```typescript
export interface ActionType {
  // props
}
```

## IPC Namespace Reference

| Namespace | Actions | Purpose |
|-----------|---------|---------|
| `ffmpeg` | execute, cancel, getVersion, getVideoInfo | Video processing |
| `gpu` | detect | Hardware acceleration |
| `fs` | selectFile, selectFolder, getFileInfo, openPath, showItemInFolder, pathExists | File operations |
| `store` | get, set, delete | Persistent storage (electron-store) |
| `ai` | start, stop, status, configure, chat, workflow | Python backend |

## Conventions

### Error Handling
- Return `{ success: false, error: string }` on failure
- Return `{ success: true, data?: T }` on success
- **NEVER** throw in IPC handlers — renderer won't catch

### Progress Events
```typescript
// Main process
mainWindow?.webContents.send('ffmpeg:progress', progress);

// Preload
onProgress: (callback) => {
  ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
}
```

### Process Management
- `pythonService.start()` — Spawns uvicorn, waits for health check
- `pythonService.stop()` — Kills process on app quit
- Development: Manual start via `npm run dev:python`

## Anti-Patterns

- **NEVER** access `mainWindow` without null check
- **NEVER** use `nodeIntegration: true` — use preload + contextBridge
- **NEVER** block main process — use async handlers
- **NEVER** import renderer code into main process

## Window Config

```typescript
new BrowserWindow({
  width: 1280,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

## FFmpeg Binary Resolution

1. System FFmpeg (`where` / `which`)
2. Bundled: `resources/ffmpeg/{platform}/bin/ffmpeg.exe`