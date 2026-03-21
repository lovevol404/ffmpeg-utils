# FFmpeg 工具箱实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可视化的 FFmpeg 桌面工具箱应用，支持格式转换、视频编辑、压缩优化、媒体提取四大核心功能。

**Architecture:** Electron 主进程负责 FFmpeg 执行和文件系统操作，React 渲染进程负责 UI 和状态管理，通过 IPC 通信。使用 Zustand 管理应用状态，Ant Design 作为 UI 组件库。

**Tech Stack:** Electron 28+, React 18, TypeScript 5, Ant Design 5, Zustand, Vite 5, electron-store, Lucide React

**Spec Document:** `docs/superpowers/specs/2026-03-21-ffmpeg-utils-design.md`

**Design System:** `design-system/ffmpeg-utils/MASTER.md`

---

## Phase 1: 项目初始化与基础架构

### Task 1: 初始化 Electron + React + Vite 项目

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 package.json**

```bash
cd D:/code/ffmpeg-utils
npm init -y
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install react react-dom antd zustand lucide-react electron-store
npm install -D electron @types/react @types/react-dom typescript vite @vitejs/plugin-react vite-plugin-electron vite-plugin-electron-renderer concurrently
```

- [ ] **Step 3: 创建 package.json 配置**

```json
{
  "name": "ffmpeg-utils",
  "version": "0.1.0",
  "description": "A visual FFmpeg toolbox for video processing",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"vite\" \"electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.300.0",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0",
    "concurrently": "^8.2.0",
    "electron-builder": "^24.9.0"
  }
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
    ]),
    renderer(),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
```

- [ ] **Step 5: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "electron/**/*.ts"]
}
```

- [ ] **Step 7: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;">
    <title>FFmpeg 工具箱</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: 创建 .gitignore**

```
node_modules/
dist/
dist-electron/
*.log
.DS_Store
Thumbs.db
.env
.env.local
resources/ffmpeg/
.superpowers/
```

- [ ] **Step 9: 验证项目初始化**

```bash
npm install
```

Expected: 依赖安装成功，无错误

---

### Task 2: 创建 Electron 主进程

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F0FDFA',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

// IPC handlers will be added here
ipcMain.handle('ping', () => 'pong');
```

- [ ] **Step 2: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  // FFmpeg APIs will be added here
  ffmpeg: {
    execute: (args: string[]) => ipcRenderer.invoke('ffmpeg:execute', args),
    getVersion: () => ipcRenderer.invoke('ffmpeg:version'),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
    },
  },
  // File system APIs
  fs: {
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
  },
});
```

- [ ] **Step 3: 验证 Electron 配置**

vite.config.ts 已包含完整的 Electron 插件配置，会自动编译 electron/main.ts 和 electron/preload.ts 到 dist-electron 目录。

- [ ] **Step 4: 验证 Electron 启动**

```bash
npm run electron:dev
```

Expected: Electron 窗口打开，显示空白页面（React 还未初始化）

---

### Task 3: 创建 React 应用入口与根组件

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`

- [ ] **Step 1: 创建 src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/global.css';

const theme = {
  token: {
    colorPrimary: '#0D9488',
    colorSuccess: '#22C55E',
    colorWarning: '#F97316',
    colorError: '#EF4444',
    colorInfo: '#0D9488',
    borderRadius: 8,
    fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: 创建 src/App.tsx**

```typescript
import { Layout, Typography } from 'antd';
import { Video } from 'lucide-react';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={180}
        style={{
          background: '#fff',
          borderRight: '1px solid #E2E8F0',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Video size={24} color="#0D9488" />
            <Title level={5} style={{ margin: 0, color: '#134E4A' }}>
              FFmpeg 工具箱
            </Title>
          </div>
        </div>
      </Sider>
      <Layout>
        <Content style={{ padding: 24, background: '#F0FDFA' }}>
          <div style={{ textAlign: 'center', marginTop: 100 }}>
            <Title level={2} style={{ color: '#134E4A' }}>
              欢迎使用 FFmpeg 工具箱
            </Title>
            <p style={{ color: '#64748B' }}>
              选择左侧功能模块开始处理视频
            </p>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
```

- [ ] **Step 3: 创建 src/styles/global.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #F0FDFA;
  color: #134E4A;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Poppins', sans-serif;
}

code, pre {
  font-family: 'JetBrains Mono', monospace;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #F0FDFA;
}

::-webkit-scrollbar-thumb {
  background: #14B8A6;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0D9488;
}
```

- [ ] **Step 4: 验证 React 应用启动**

```bash
npm run dev
```

Expected: 浏览器打开 http://localhost:3000，显示欢迎页面

- [ ] **Step 5: 验证 Electron + React 集成**

```bash
npm run electron:dev
```

Expected: Electron 窗口显示 React 应用

---

### Task 4: 创建 TypeScript 类型定义

**Files:**
- Create: `src/types/index.ts`
- Create: `src/types/ffmpeg.ts`
- Create: `src/types/task.ts`

- [ ] **Step 1: 创建 src/types/ffmpeg.ts**

```typescript
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
```

- [ ] **Step 2: 创建 src/types/task.ts**

```typescript
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskType = 'convert' | 'edit' | 'compress' | 'extract';

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
}

export interface TaskQueue {
  tasks: Task[];
  maxConcurrent: number;
  currentRunning: number;
}
```

- [ ] **Step 3: 创建 src/types/index.ts**

```typescript
export * from './ffmpeg';
export * from './task';

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      ffmpeg: {
        execute: (args: string[]) => Promise<import('./ffmpeg').FFmpegExecutionResult>;
        getVersion: () => Promise<string>;
        onProgress: (callback: (progress: number) => void) => void;
      };
      fs: {
        selectFile: () => Promise<string | null>;
        selectFolder: () => Promise<string | null>;
      };
    };
  }
}
```

- [ ] **Step 4: 验证类型定义**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

---

### Task 5: 创建 Zustand 状态管理

**Files:**
- Create: `src/stores/appStore.ts`
- Create: `src/stores/taskStore.ts`
- Create: `src/stores/presetStore.ts`

- [ ] **Step 1: 创建 src/stores/appStore.ts**

```typescript
import { create } from 'zustand';

interface AppState {
  currentModule: 'convert' | 'edit' | 'compress' | 'extract' | 'queue';
  showCommand: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  defaultOutputPath: string;
  setCurrentModule: (module: AppState['currentModule']) => void;
  toggleShowCommand: () => void;
  setTheme: (theme: AppState['theme']) => void;
  setDefaultOutputPath: (path: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'convert',
  showCommand: false,
  theme: 'light',
  language: 'zh-CN',
  defaultOutputPath: '',
  setCurrentModule: (module) => set({ currentModule: module }),
  toggleShowCommand: () => set((state) => ({ showCommand: !state.showCommand })),
  setTheme: (theme) => set({ theme }),
  setDefaultOutputPath: (path) => set({ defaultOutputPath: path }),
}));
```

- [ ] **Step 2: 创建 src/stores/taskStore.ts**

```typescript
import { create } from 'zustand';
import type { Task, TaskStatus } from '@/types';

interface TaskState {
  tasks: Task[];
  maxConcurrent: number;
  addTask: (task: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  maxConcurrent: 2,
  
  addTask: (taskData) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task: Task = {
      ...taskData,
      id,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };
    set((state) => ({ tasks: [...state.tasks, task] }));
    return id;
  },
  
  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  },
  
  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed'),
    }));
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },
}));
```

- [ ] **Step 3: 创建 src/stores/presetStore.ts**

```typescript
import { create } from 'zustand';
import type { Preset } from '@/types';

const builtInPresets: Preset[] = [
  {
    id: 'wechat',
    name: '微信视频',
    description: '适合微信发送的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '720p',
    bitrate: '1M',
    isBuiltIn: true,
  },
  {
    id: 'douyin',
    name: '抖音视频',
    description: '适合抖音上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '2M',
    isBuiltIn: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: '适合 YouTube 上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '8M',
    isBuiltIn: true,
  },
  {
    id: 'bilibili',
    name: 'B站视频',
    description: '适合 Bilibili 上传的视频',
    format: 'mp4',
    codec: 'libx264',
    resolution: '1080p',
    bitrate: '6M',
    isBuiltIn: true,
  },
];

interface PresetState {
  presets: Preset[];
  selectedPresetId: string | null;
  addPreset: (preset: Omit<Preset, 'id' | 'isBuiltIn'>) => void;
  removePreset: (id: string) => void;
  selectPreset: (id: string | null) => void;
  getPresetById: (id: string) => Preset | undefined;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: builtInPresets,
  selectedPresetId: null,
  
  addPreset: (presetData) => {
    const id = `custom-${Date.now()}`;
    const preset: Preset = {
      ...presetData,
      id,
      isBuiltIn: false,
    };
    set((state) => ({ presets: [...state.presets, preset] }));
  },
  
  removePreset: (id) => {
    set((state) => ({
      presets: state.presets.filter((p) => p.id !== id || p.isBuiltIn),
    }));
  },
  
  selectPreset: (id) => set({ selectedPresetId: id }),
  
  getPresetById: (id) => get().presets.find((p) => p.id === id),
}));
```

- [ ] **Step 4: 验证 Store 编译**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

---

## Phase 2: 通用组件开发

### Task 6: 创建布局组件

**Files:**
- Create: `src/components/Layout/MainLayout.tsx`
- Create: `src/components/Layout/Sidebar.tsx`
- Create: `src/components/Layout/index.ts`

- [ ] **Step 1: 创建 src/components/Layout/Sidebar.tsx**

```typescript
import { Menu } from 'antd';
import {
  Film,
  Scissors,
  FileVideo,
  Image,
  ListOrdered,
  Settings,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const menuItems = [
  { key: 'convert', icon: <Film size={18} />, label: '格式转换' },
  { key: 'edit', icon: <Scissors size={18} />, label: '视频编辑' },
  { key: 'compress', icon: <FileVideo size={18} />, label: '压缩优化' },
  { key: 'extract', icon: <Image size={18} />, label: '媒体提取' },
  { key: 'queue', icon: <ListOrdered size={18} />, label: '任务队列' },
];

export function Sidebar() {
  const { currentModule, setCurrentModule } = useAppStore();

  return (
    <Menu
      mode="inline"
      selectedKeys={[currentModule]}
      style={{
        height: 'calc(100% - 65px)',
        borderRight: 0,
      }}
      items={menuItems.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        style: {
          margin: '4px 8px',
          borderRadius: 8,
        },
      }))}
      onClick={({ key }) => setCurrentModule(key as typeof currentModule)}
    />
  );
}
```

- [ ] **Step 2: 创建 src/components/Layout/MainLayout.tsx**

```typescript
import { Layout } from 'antd';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/appStore';
import ConvertModule from '@/modules/Convert';
import EditModule from '@/modules/Edit';
import CompressModule from '@/modules/Compress';
import ExtractModule from '@/modules/Extract';
import QueueModule from '@/modules/Queue';

const { Sider, Content } = Layout;

const moduleMap = {
  convert: ConvertModule,
  edit: EditModule,
  compress: CompressModule,
  extract: ExtractModule,
  queue: QueueModule,
};

export function MainLayout() {
  const { currentModule } = useAppStore();
  const ModuleComponent = moduleMap[currentModule];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={180}
        style={{
          background: '#fff',
          borderRight: '1px solid #E2E8F0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: '#134E4A' }}>
            FFmpeg 工具箱
          </span>
        </div>
        <Sidebar />
      </Sider>
      <Layout>
        <Content
          style={{
            padding: 24,
            background: '#F0FDFA',
            overflow: 'auto',
          }}
        >
          <ModuleComponent />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 3: 创建 src/components/Layout/index.ts**

```typescript
export { MainLayout } from './MainLayout';
export { Sidebar } from './Sidebar';
```

- [ ] **Step 4: 更新 src/App.tsx 使用 MainLayout**

```typescript
import { MainLayout } from '@/components/Layout';

function App() {
  return <MainLayout />;
}

export default App;
```

- [ ] **Step 5: 验证布局组件**

注意：此时验证会失败，因为模块组件还未创建。完成 Task 10-11 后再次验证。

```bash
npm run dev
```

Expected: 显示侧边栏导航（完成 Task 10-11 后可切换菜单项）

---

### Task 7: 创建文件拖拽上传组件

**Files:**
- Create: `src/components/FileDrop/FileDrop.tsx`
- Create: `src/components/FileDrop/index.ts`

- [ ] **Step 1: 创建 src/components/FileDrop/FileDrop.tsx**

```typescript
import { useState, useCallback } from 'react';
import { Upload, message } from 'antd';
import { Inbox } from 'lucide-react';

interface FileDropProps {
  accept?: string[];
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  maxFileSize?: number;
}

export function FileDrop({
  accept = ['video/*'],
  multiple = false,
  onFilesSelected,
  maxFileSize = 500 * 1024 * 1024,
}: FileDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => {
        const isValidType = accept.some((type) =>
          type.endsWith('/*')
            ? file.type.startsWith(type.replace('/*', ''))
            : file.type === type
        );
        const isValidSize = file.size <= maxFileSize;

        if (!isValidType) {
          message.error(`不支持的文件格式: ${file.name}`);
        }
        if (!isValidSize) {
          message.error(`文件过大: ${file.name}`);
        }

        return isValidType && isValidSize;
      });

      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [accept, multiple, maxFileSize, onFilesSelected]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      onFilesSelected([file]);
      return false;
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#0D9488' : '#E2E8F0'}`,
        borderRadius: 12,
        padding: 40,
        textAlign: 'center',
        background: isDragging ? '#E6FFFA' : '#FFFFFF',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Upload
        accept={accept.join(',')}
        beforeUpload={handleFileSelect}
        showUploadList={false}
        multiple={multiple}
      >
        <Inbox size={48} color={isDragging ? '#0D9488' : '#94A3B8'} />
        <p style={{ marginTop: 16, color: '#64748B', fontSize: 14 }}>
          拖拽文件到这里，或点击选择
        </p>
        <p style={{ marginTop: 8, color: '#94A3B8', fontSize: 12 }}>
          支持格式: {accept.join(', ').replace(/\*\//g, '')}
        </p>
      </Upload>
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/components/FileDrop/index.ts**

```typescript
export { FileDrop } from './FileDrop';
```

- [ ] **Step 3: 验证 FileDrop 组件**

在任意模块中导入使用，测试拖拽功能。

---

### Task 8: 创建命令预览组件

**Files:**
- Create: `src/components/CommandPreview/CommandPreview.tsx`
- Create: `src/components/CommandPreview/index.ts`

- [ ] **Step 1: 创建 src/components/CommandPreview/CommandPreview.tsx**

```typescript
import { useState } from 'react';
import { Collapse, Button, message } from 'antd';
import { Copy, Check, Terminal } from 'lucide-react';

interface CommandPreviewProps {
  command: string;
  visible?: boolean;
}

export function CommandPreview({ command, visible = true }: CommandPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      message.success('命令已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  const highlightCommand = (cmd: string) => {
    const parts = cmd.split(' ');
    return parts.map((part, index) => {
      let color = '#134E4A';
      if (part.startsWith('-')) {
        color = '#F97316';
      } else if (part.includes(':') || /^\d+$/.test(part)) {
        color = '#22C55E';
      } else if (part.endsWith('.mp4') || part.endsWith('.avi') || part.endsWith('.mkv')) {
        color = '#0D9488';
      }
      return (
        <span key={index} style={{ color }}>
          {part}{' '}
        </span>
      );
    });
  };

  return (
    <Collapse
      ghost
      items={[
        {
          key: '1',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={16} />
              <span>FFmpeg 命令</span>
            </div>
          ),
          children: (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: 12,
                position: 'relative',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {highlightCommand(command)}
              </pre>
              <Button
                type="text"
                size="small"
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={handleCopy}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: copied ? '#22C55E' : '#64748B',
                }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 2: 创建 src/components/CommandPreview/index.ts**

```typescript
export { CommandPreview } from './CommandPreview';
```

---

### Task 9: 创建任务队列组件

**Files:**
- Create: `src/components/TaskQueue/TaskItem.tsx`
- Create: `src/components/TaskQueue/TaskQueue.tsx`
- Create: `src/components/TaskQueue/index.ts`

- [ ] **Step 1: 创建 src/components/TaskQueue/TaskItem.tsx**

```typescript
import { Progress, Tag, Button, Tooltip } from 'antd';
import { Trash2, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const statusConfig = {
  pending: { color: 'default', icon: <Clock size={14} />, text: '等待中' },
  processing: { color: 'processing', icon: null, text: '处理中' },
  completed: { color: 'success', icon: <CheckCircle size={14} />, text: '已完成' },
  failed: { color: 'error', icon: <XCircle size={14} />, text: '失败' },
};

export function TaskItem({ task, onCancel, onRetry, onRemove }: TaskItemProps) {
  const config = statusConfig[task.status];

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 500, color: '#134E4A' }}>{task.inputPath.split('/').pop()}</span>
          <Tag color={config.color} style={{ marginLeft: 8 }}>
            {config.icon && <span style={{ marginRight: 4 }}>{config.icon}</span>}
            {config.text}
          </Tag>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {task.status === 'processing' && (
            <Tooltip title="取消">
              <Button type="text" size="small" icon={<XCircle size={14} />} onClick={() => onCancel(task.id)} />
            </Tooltip>
          )}
          {task.status === 'failed' && (
            <Tooltip title="重试">
              <Button type="text" size="small" icon={<RotateCcw size={14} />} onClick={() => onRetry(task.id)} />
            </Tooltip>
          )}
          {(task.status === 'completed' || task.status === 'failed') && (
            <Tooltip title="移除">
              <Button type="text" size="small" icon={<Trash2 size={14} />} onClick={() => onRemove(task.id)} />
            </Tooltip>
          )}
        </div>
      </div>
      {task.status === 'processing' && (
        <Progress percent={Math.round(task.progress)} size="small" strokeColor="#0D9488" />
      )}
      {task.error && (
        <p style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{task.error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/components/TaskQueue/TaskQueue.tsx**

```typescript
import { useMemo } from 'react';
import { Button, Empty } from 'antd';
import { Trash2 } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { useTaskStore } from '@/stores/taskStore';

export function TaskQueue() {
  const { tasks, removeTask, clearCompleted } = useTaskStore();

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);

  if (tasks.length === 0) {
    return <Empty description="暂无任务" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: '#64748B' }}>
          共 {tasks.length} 个任务，{pendingCount} 个等待中，{completedCount} 个已完成
        </span>
        {completedCount > 0 && (
          <Button type="link" icon={<Trash2 size={14} />} onClick={clearCompleted}>
            清空已完成
          </Button>
        )}
      </div>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onCancel={() => {}}
          onRetry={() => {}}
          onRemove={removeTask}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/components/TaskQueue/index.ts**

```typescript
export { TaskQueue } from './TaskQueue';
export { TaskItem } from './TaskItem';
```

---

## Phase 3: 功能模块开发

### Task 10: 创建格式转换模块

**Files:**
- Create: `src/modules/Convert/index.tsx`
- Create: `src/utils/ffmpegCommands.ts` (部分)

- [ ] **Step 1: 创建 src/modules/Convert/index.tsx**

```typescript
import { useState } from 'react';
import { Select, Button, Card, Space, message } from 'antd';
import { FileDrop } from '@/components/FileDrop';
import { CommandPreview } from '@/components/CommandPreview';
import { useAppStore } from '@/stores/appStore';
import { usePresetStore } from '@/stores/presetStore';
import { useTaskStore } from '@/stores/taskStore';

const formats = [
  { value: 'mp4', label: 'MP4' },
  { value: 'avi', label: 'AVI' },
  { value: 'mov', label: 'MOV' },
  { value: 'webm', label: 'WebM' },
  { value: 'mkv', label: 'MKV' },
];

const codecs = [
  { value: 'libx264', label: 'H.264' },
  { value: 'libx265', label: 'H.265' },
  { value: 'libvpx-vp9', label: 'VP9' },
  { value: 'libaom-av1', label: 'AV1' },
];

const resolutions = [
  { value: 'keep', label: '保持原始' },
  { value: '1920:1080', label: '1080p' },
  { value: '1280:720', label: '720p' },
  { value: '854:480', label: '480p' },
];

export default function ConvertModule() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState('mp4');
  const [codec, setCodec] = useState('libx264');
  const [resolution, setResolution] = useState('keep');
  const [preset, setPreset] = useState<string | null>(null);
  
  const { showCommand } = useAppStore();
  const { presets } = usePresetStore();
  const { addTask } = useTaskStore();

  const command = files.length > 0
    ? `ffmpeg -i "${files[0].name}" -c:v ${codec} -c:a aac${resolution !== 'keep' ? ` -vf scale=${resolution}` : ''} output.${format}`
    : '';

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    message.success(`已选择 ${selectedFiles.length} 个文件`);
  };

  const handleConvert = () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    files.forEach((file) => {
      addTask({
        type: 'convert',
        inputPath: file.name,
        outputPath: `output.${format}`,
        command,
      });
    });

    message.success('已添加到任务队列');
    setFiles([]);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 24, color: '#134E4A' }}>格式转换</h2>
      
      <FileDrop onFilesSelected={handleFilesSelected} />
      
      {files.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 16, color: '#64748B' }}>
            已选择: {files.map((f) => f.name).join(', ')}
          </p>
          
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  输出格式
                </label>
                <Select value={format} onChange={setFormat} options={formats} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  视频编码
                </label>
                <Select value={codec} onChange={setCodec} options={codecs} style={{ width: '100%' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  分辨率
                </label>
                <Select value={resolution} onChange={setResolution} options={resolutions} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  预设模板
                </label>
                <Select
                  value={preset}
                  onChange={setPreset}
                  placeholder="选择预设"
                  allowClear
                  options={presets.map((p) => ({ value: p.id, label: p.name }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <CommandPreview command={command} visible={showCommand} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setFiles([])}>重置</Button>
              <Button type="primary" onClick={handleConvert}>
                开始转换
              </Button>
            </div>
          </Space>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证格式转换模块**

```bash
npm run dev
```

Expected: 可以选择文件，配置参数，生成命令预览

---

### Task 11: 创建其他功能模块占位

**Files:**
- Create: `src/modules/Edit/index.tsx`
- Create: `src/modules/Compress/index.tsx`
- Create: `src/modules/Extract/index.tsx`
- Create: `src/modules/Queue/index.tsx`

- [ ] **Step 1: 创建 src/modules/Edit/index.tsx**

```typescript
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function EditModule() {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <Title level={3}>视频编辑模块</Title>
      <Paragraph style={{ color: '#64748B' }}>
        裁剪、拼接、水印、字幕功能开发中...
      </Paragraph>
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/modules/Compress/index.tsx**

```typescript
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function CompressModule() {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <Title level={3}>压缩优化模块</Title>
      <Paragraph style={{ color: '#64748B' }}>
        视频压缩功能开发中...
      </Paragraph>
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/modules/Extract/index.tsx**

```typescript
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function ExtractModule() {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <Title level={3}>媒体提取模块</Title>
      <Paragraph style={{ color: '#64748B' }}>
        帧提取、GIF生成、音频提取功能开发中...
      </Paragraph>
    </div>
  );
}
```

- [ ] **Step 4: 创建 src/modules/Queue/index.tsx**

```typescript
import { TaskQueue } from '@/components/TaskQueue';

export default function QueueModule() {
  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 24, color: '#134E4A' }}>任务队列</h2>
      <TaskQueue />
    </div>
  );
}
```

- [ ] **Step 5: 验证所有模块**

```bash
npm run dev
```

Expected: 可以切换所有模块，无报错

---

## Phase 4: Electron FFmpeg 集成

### Task 12: 实现 FFmpeg 服务

**Files:**
- Create: `electron/services/ffmpeg.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: 创建 electron/services/ffmpeg.ts**

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

let ffmpegPath: string;

export function initFFmpeg() {
  const platform = process.platform;
  const arch = process.arch;
  
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg')
    : path.join(__dirname, '../../resources/ffmpeg');

  if (platform === 'win32') {
    ffmpegPath = path.join(resourcesPath, 'bin', 'ffmpeg.exe');
  } else if (platform === 'darwin') {
    ffmpegPath = path.join(resourcesPath, 'bin', 'ffmpeg');
  } else {
    ffmpegPath = path.join(resourcesPath, 'bin', 'ffmpeg');
  }
}

export function getFFmpegPath(): string {
  return ffmpegPath;
}

export interface FFmpegOptions {
  input: string;
  output: string;
  args: string[];
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function executeFFmpeg(options: FFmpegOptions): ChildProcess {
  const { input, output, args, onProgress, onComplete, onError } = options;
  
  const defaultArgs = [
    '-i', input,
    '-y',
    ...args,
    output,
  ];

  const process = spawn(ffmpegPath, defaultArgs);
  
  let duration = 0;
  const durationRegex = /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
  const timeRegex = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;

  process.stderr.on('data', (data) => {
    const output = data.toString();
    
    if (!duration) {
      const match = output.match(durationRegex);
      if (match) {
        const [, h, m, s, ms] = match;
        duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 100;
      }
    }
    
    const timeMatch = output.match(timeRegex);
    if (timeMatch && duration > 0 && onProgress) {
      const [, h, m, s, ms] = timeMatch;
      const currentTime = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 100;
      const progress = (currentTime / duration) * 100;
      onProgress(Math.min(progress, 100));
    }
  });

  process.on('close', (code) => {
    if (code === 0) {
      onComplete?.();
    } else {
      onError?.(`FFmpeg exited with code ${code}`);
    }
  });

  process.on('error', (err) => {
    onError?.(err.message);
  });

  return process;
}

export async function getFFmpegVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, ['-version']);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        const versionMatch = output.match(/ffmpeg version (\S+)/);
        resolve(versionMatch ? versionMatch[1] : 'unknown');
      } else {
        reject(new Error('Failed to get FFmpeg version'));
      }
    });
  });
}
```

- [ ] **Step 2: 更新 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { initFFmpeg, executeFFmpeg, getFFmpegVersion } from './services/ffmpeg';
import Store from 'electron-store';

let mainWindow: BrowserWindow | null = null;

const store = new Store();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
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

ipcMain.handle('ffmpeg:execute', async (_event, args: string[]) => {
  return new Promise((resolve) => {
    executeFFmpeg({
      input: args[0],
      output: args[args.length - 1],
      args: args.slice(1, -1),
      onProgress: (progress) => {
        mainWindow?.webContents.send('ffmpeg:progress', progress);
      },
      onComplete: () => {
        resolve({ success: true });
      },
      onError: (error) => {
        resolve({ success: false, error });
      },
    });
  });
});

ipcMain.handle('ffmpeg:version', async () => {
  try {
    return await getFFmpegVersion();
  } catch {
    return 'not found';
  }
});

ipcMain.handle('fs:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('fs:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

// Store IPC handlers
ipcMain.handle('store:get', (_event, key: string) => store.get(key));
ipcMain.handle('store:set', (_event, key: string, value: unknown) => store.set(key, value));
ipcMain.handle('store:delete', (_event, key: string) => store.delete(key));
```

- [ ] **Step 3: 更新 electron/preload.ts**

添加 store API 到 preload：

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  ffmpeg: {
    execute: (args: string[]) => ipcRenderer.invoke('ffmpeg:execute', args),
    getVersion: () => ipcRenderer.invoke('ffmpeg:version'),
    onProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
    },
  },
  fs: {
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },
});
```

- [ ] **Step 4: 创建 electron/services/fileSystem.ts**

```typescript
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
```

- [ ] **Step 5: 验证 FFmpeg 集成**

测试 FFmpeg 版本获取功能。

---

## Phase 5: 完善与测试

### Task 13: 添加测试

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Create: `src/__tests__/stores/appStore.test.ts`
- Create: `src/__tests__/components/FileDrop.test.tsx`

- [ ] **Step 1: 安装测试依赖**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: 创建 src/__tests__/setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: 创建 src/__tests__/stores/appStore.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { useAppStore } from '@/stores/appStore';

describe('AppStore', () => {
  it('should have correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.currentModule).toBe('convert');
    expect(state.showCommand).toBe(false);
    expect(state.theme).toBe('light');
  });

  it('should update current module', () => {
    const { setCurrentModule } = useAppStore.getState();
    setCurrentModule('edit');
    expect(useAppStore.getState().currentModule).toBe('edit');
  });
});
```

- [ ] **Step 5: 添加测试脚本到 package.json**

在 `scripts` 部分添加：

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "electron:dev": "vite --mode electron",
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```

- [ ] **Step 6: 运行测试验证**

```bash
npm test
```

Expected: 测试通过

### Task 14: 配置打包

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 electron-builder 配置到 package.json**

在 package.json 根级别添加 `build` 字段：

```json
"build": {
  "appId": "com.ffmpeg-utils.app",
  "productName": "FFmpeg 工具箱",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "resources/ffmpeg/**/*"
  ],
  "extraResources": [
    {
      "from": "resources/ffmpeg",
      "to": "ffmpeg",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": "nsis",
    "icon": "resources/icon.ico"
  },
  "mac": {
    "target": "dmg",
    "icon": "resources/icon.icns"
  },
  "linux": {
    "target": "AppImage",
    "icon": "resources/icon.png"
  }
}
```

- [ ] **Step 2: 添加打包脚本到 package.json scripts**

```json
"build:win": "npm run build && electron-builder --win",
"build:mac": "npm run build && electron-builder --mac",
"build:linux": "npm run build && electron-builder --linux"
```

---

## MVP 验收标准 (Phase 1-4)

- [ ] Electron 应用可以正常启动
- [ ] React UI 正确渲染，符合设计规范
- [ ] 所有四个功能模块可访问
- [ ] 文件拖拽上传功能正常
- [ ] FFmpeg 命令预览正确生成
- [ ] 任务队列功能正常
- [ ] 跨平台打包成功

---

## MVP 验收标准 (Phase 1-4)

- [ ] Electron 应用可以正常启动
- [ ] React UI 正确渲染，符合设计规范
- [ ] 所有四个功能模块可访问（格式转换完整，其他为占位）
- [ ] 文件拖拽上传功能正常
- [ ] FFmpeg 命令预览正确生成
- [ ] 任务队列功能正常
- [ ] electron-store 持久化正常工作

---

## Phase 6: 后续迭代 (独立计划)

以下功能模块将在 MVP 稳定后，分别创建独立实施计划：

### 视频编辑模块完善
- TrimTab: 裁剪功能（时间轴、开始/结束时间）
- MergeTab: 拼接功能（多文件排序）
- WatermarkTab: 水印功能（图片上传、位置、透明度）
- SubtitleTab: 字幕功能（SRT/ASS 导入）

### 压缩优化模块完善
- 三种压缩模式实现
- 压缩参数配置
- 预估结果显示

### 媒体提取模块完善
- FrameTab: 帧提取
- GifTab: GIF 生成
- AudioTab: 音频提取
- ScreenshotTab: 视频截图

---

**MVP 开发时间**: 3-4 天

**里程碑**:
1. Day 1: Phase 1 - 项目初始化 + 基础架构
2. Day 2: Phase 2 - 通用组件开发
3. Day 3: Phase 3-4 - 功能模块 + FFmpeg 集成
4. Day 4: Phase 5 - 测试与打包配置