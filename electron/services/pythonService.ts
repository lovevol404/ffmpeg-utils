import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import http from 'http';
import { getFFmpegPath, getFFprobePath } from './ffmpeg';

class PythonService {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private baseUrl: string = '';
  private isDevelopment: boolean;
  private shuttingDown: boolean = false;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
    
    app.on('will-quit', () => {
      this.stop();
    });
  }

  private getPythonExecutable(): string {
    const isWin = process.platform === 'win32';
    const resourcesPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'python')
      : path.join(__dirname, '../../resources/python/video-toolbox-ai');
    
    if (isWin) {
      return path.join(resourcesPath, 'video-toolbox-ai.exe');
    }
    return path.join(resourcesPath, 'video-toolbox-ai');
  }

  private getDevPythonExecutable(): string {
    const isWin = process.platform === 'win32';
    const pythonDir = path.join(__dirname, '../../python');
    
    if (isWin) {
      return path.join(pythonDir, '.venv', 'Scripts', 'python.exe');
    }
    return path.join(pythonDir, '.venv', 'bin', 'python');
  }

  async start(): Promise<{ port: number; baseUrl: string }> {
    if (this.process) {
      return { port: this.port, baseUrl: this.baseUrl };
    }

    if (this.isDevelopment) {
      return this.startDevServer();
    }
    
    return this.startProductionServer();
  }

  private async startDevServer(): Promise<{ port: number; baseUrl: string }> {
    const port = parseInt(process.env.PYTHON_PORT || '8765', 10);
    this.port = port;
    this.baseUrl = `http://127.0.0.1:${port}`;
    
    const healthCheck = await this.checkHealth();
    if (healthCheck) {
      console.log(`Python dev server already running at ${this.baseUrl}`);
      return { port: this.port, baseUrl: this.baseUrl };
    }

    console.log('Python dev server not running, please start it manually:');
    console.log('  npm run dev:python');
    
    throw new Error('Python server not running. Run "npm run dev:python" first.');
  }

  private async startProductionServer(): Promise<{ port: number; baseUrl: string }> {
    return new Promise((resolve, reject) => {
      const executable = this.getPythonExecutable();
      
      console.log('Python executable path:', executable);
      console.log('resourcesPath:', process.resourcesPath);
      console.log('isPackaged:', app.isPackaged);
      console.log('Executable exists:', fs.existsSync(executable));
      
      if (!fs.existsSync(executable)) {
        const errorMsg = `Python executable not found: ${executable}`;
        console.error(errorMsg);
        console.error('Contents of resourcesPath:', fs.existsSync(process.resourcesPath) ? 
          fs.readdirSync(process.resourcesPath) : 'resourcesPath does not exist');
        const pythonDir = path.join(process.resourcesPath, 'python');
        console.error('Contents of python dir:', fs.existsSync(pythonDir) ? 
          fs.readdirSync(pythonDir) : 'python dir does not exist');
        reject(new Error(errorMsg));
        return;
      }

      this.port = this.findAvailablePort();
      this.baseUrl = `http://127.0.0.1:${this.port}`;

      console.log(`Starting Python server on port ${this.port}...`);
      console.log('FFmpeg path:', getFFmpegPath());
      console.log('FFprobe path:', getFFprobePath());

      this.process = spawn(executable, [
        String(this.port),
      ], {
        cwd: path.dirname(executable),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          FFMPEG_PATH: getFFmpegPath(),
          FFPROBE_PATH: getFFprobePath(),
        },
      });

      this.process.stdout?.on('data', (data) => {
        console.log(`[Python] ${data.toString()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[Python Error] ${data.toString()}`);
      });

      this.process.on('error', (err) => {
        console.error('Python process error:', err);
        if (!this.shuttingDown) {
          reject(err);
        }
      });

      this.process.on('exit', (code) => {
        console.log(`Python process exited with code ${code}`);
        this.process = null;
      });

      setTimeout(async () => {
        const healthCheck = await this.checkHealth();
        if (healthCheck) {
          console.log('Python server health check passed');
          resolve({ port: this.port, baseUrl: this.baseUrl });
        } else {
          console.error('Python server health check failed after 3 seconds');
          console.error('Process running:', this.process !== null);
          reject(new Error('Python server failed to start. Check logs for details.'));
        }
      }, 5000);
    });
  }

  private findAvailablePort(): number {
    const min = 8700;
    const max = 8800;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  stop(): void {
    this.shuttingDown = true;
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  getUrl(): string {
    return this.baseUrl;
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.process !== null || (this.isDevelopment && this.baseUrl !== '');
  }
}

export const pythonService = new PythonService();