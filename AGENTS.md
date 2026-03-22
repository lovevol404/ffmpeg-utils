# Video Toolbox - FFmpeg Visual Utils

Electron + React + Python desktop app for video processing. FFmpeg GUI with AI-powered workflow generation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 28 |
| Frontend | React 18 + TypeScript + Ant Design 5 |
| State | Zustand 4 |
| Build | Vite 5 + electron-builder |
| AI Backend | Python 3.10+ + FastAPI + LangChain |
| Test | Vitest + Testing Library |

## Commands

### Development
```bash
npm run dev            # Start full dev environment (Python + Vite + Electron)
npm run dev:frontend   # Start Vite dev server (renderer only)
npm run dev:python     # Start Python backend only
```

### Build (Windows only)
```bash
npm run build          # Build Python backend + Electron app for Windows
npm run build:frontend # TypeScript check + Vite build only
npm run build:python   # Build Python backend with PyInstaller
```

### Testing
```bash
npm run test           # Run all tests with Vitest
npm run test:coverage  # Run tests with coverage
npx vitest run src/__tests__/stores/appStore.test.ts  # Run single test file
npx vitest run --reporter=verbose                     # Run with verbose output
```

### Linting & Type Checking
```bash
npx tsc --noEmit       # Type check without emitting
```

## Where to Look

| Task | Location |
|------|----------|
| Add new video module | `src/modules/ModuleName/index.tsx` |
| Add reusable component | `src/components/ComponentName/` |
| Add IPC handler | `electron/main.ts` + `electron/preload.ts` |
| Modify AI chat | `python/agents/video_agent.py` |
| Add FFmpeg tool | `python/tools/ffmpeg_tools.py` |
| Add API endpoint | `python/api/routes.py` |
| Global state | `src/stores/` |
| Type definitions | `src/types/` |
| Custom hooks | `src/hooks/` |

## Code Style Guidelines

### Imports

Group imports in this order, separated by blank lines:
1. External libraries (React, Ant Design, etc.)
2. Internal aliases (`@/` imports)
3. Relative imports

```typescript
import { useState, useEffect } from 'react';
import { Button, Card, message } from 'antd';
import { FolderOpen } from 'lucide-react';

import { useAppStore } from '@/stores/appStore';
import { FileDrop } from '@/components/FileDrop';

import { helperFunction } from './utils';
```

Use `import type` for type-only imports:
```typescript
import type { VideoInfo } from '@/types';
import type { GPUType, GPUCapability } from '@/types/gpu';
```

### File Structure

- **Components**: `src/components/ComponentName/ComponentName.tsx` with `index.ts` barrel export
- **Modules**: `src/modules/ModuleName/index.tsx` (page-level components)
- **Stores**: `src/stores/storeName.ts` (Zustand stores)
- **Types**: `src/types/typeName.ts` with `index.ts` re-exporting all
- **Hooks**: `src/hooks/hookName.ts`
- **Utils**: `src/utils/utilName.ts`
- **Electron**: `electron/main.ts`, `electron/preload.ts`, `electron/services/`
- **Python Backend**: `python/` - FastAPI + LangChain AI service
- **Scripts**: `scripts/` - Build and development helper scripts

### TypeScript

- Enable strict mode; all code must pass `noUnusedLocals` and `noUnusedParameters`
- Define interfaces for all object shapes; use `type` for unions and primitives
- Prefer explicit return types for exported functions
- Use path alias `@/` for imports from `src/`

```typescript
// Prefer interface for objects
interface AppState {
  currentModule: 'convert' | 'edit' | 'compress';
  setTheme: (theme: 'light' | 'dark') => void;
}

// Use type for unions
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

### React Components

- Use function components with named exports
- Component files: PascalCase (e.g., `TaskQueue.tsx`)
- Props interfaces named `ComponentNameProps`

```typescript
interface TaskQueueProps {
  maxItems?: number;
}

export function TaskQueue({ maxItems = 10 }: TaskQueueProps) {
  const { tasks } = useTaskStore();
  return <div>...</div>;
}
```

### State Management (Zustand)

```typescript
interface AppState {
  value: string;
  setValue: (value: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));
```

### Error Handling

- Use `try/catch` for async operations in Electron main process
- Return `null` or `false` on errors in IPC handlers instead of throwing
- Display user-friendly messages via `message.warning()` / `message.error()`

```typescript
// Electron main - IPC handlers
ipcMain.handle('fs:pathExists', async (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

// Renderer - user feedback
const handleConvert = async () => {
  if (files.length === 0) {
    message.warning('请先选择文件');
    return;
  }
};
```

### Electron IPC Pattern

Types defined in `electron/preload.ts`. See `electron/AGENTS.md` for IPC handler patterns.

### Naming Conventions

- **Components**: PascalCase (`TaskQueue`, `FileDrop`)
- **Functions**: camelCase (`handleConvert`, `getVideoInfo`)
- **Constants**: UPPER_SNAKE_CASE for global, camelCase for local
- **Files**: Match primary export (PascalCase for components, camelCase for utilities)
- **CSS properties**: camelCase in inline styles (`backgroundColor`, `marginTop`)

## FFmpeg Resources

Binaries in `resources/ffmpeg/{platform-arch}/bin/`. Auto-detects system FFmpeg first, bundled as fallback.

## Subdirectory Docs

| Path | Purpose |
|------|---------|
| `electron/AGENTS.md` | Main process, IPC handlers, services |
| `python/AGENTS.md` | AI backend, API endpoints, LangChain agent |

## FFmpeg References

- Documentation: https://ffmpeg.org/documentation.html
- Tool Reference: https://ffmpeg.org/ffmpeg.html