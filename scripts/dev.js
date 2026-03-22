#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const path = require('path');
const { setupPython, getPythonExecutable, PYTHON_DIR } = require('./utils/python');
const { registerProcess, setupCleanup } = require('./utils/process');

const PYTHON_PORT = 8765;

function findFFmpeg() {
  try {
    if (process.platform === 'win32') {
      const result = execSync('where ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      const ffmpegPath = result.trim().split('\n')[0];
      const ffprobeResult = execSync('where ffprobe', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      const ffprobePath = ffprobeResult.trim().split('\n')[0];
      return { ffmpegPath, ffprobePath };
    } else {
      const ffmpegPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
      const ffprobePath = execSync('which ffprobe', { encoding: 'utf-8' }).trim();
      return { ffmpegPath, ffprobePath };
    }
  } catch {
    return { ffmpegPath: null, ffprobePath: null };
  }
}

async function startPythonServer() {
  const python = getPythonExecutable();
  const { ffmpegPath, ffprobePath } = findFFmpeg();
  
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
  };
  
  if (ffmpegPath) env.FFMPEG_PATH = ffmpegPath;
  if (ffprobePath) env.FFPROBE_PATH = ffprobePath;
  
  const proc = spawn(python, [
    '-m', 'uvicorn', 'main:app',
    '--host', '127.0.0.1',
    '--port', String(PYTHON_PORT),
    '--reload',
  ], {
    cwd: PYTHON_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  registerProcess(proc);

  proc.stdout.on('data', (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[Python] ${data.toString().trim()}`);
  });

  return new Promise((resolve, reject) => {
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Python server startup timeout (30s)'));
      }
    }, 30000);

    const checkStarted = (data) => {
      const output = data.toString();
      if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
        started = true;
        clearTimeout(timeout);
        resolve(proc);
      }
    };

    proc.stdout.on('data', checkStarted);
    proc.stderr.on('data', checkStarted);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('exit', (code) => {
      clearTimeout(timeout);
      if (!started) {
        reject(new Error(`Python server exited with code ${code}`));
      }
    });
  });
}

function startVite() {
  const proc = spawn('npx', ['vite'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PYTHON_PORT: String(PYTHON_PORT),
    },
  });

  registerProcess(proc);
  return proc;
}

async function main() {
  console.log('🚀 Starting development environment...\n');
  console.log('='.repeat(50));

  console.log('\n📦 [1/2] Setting up Python environment...');
  if (!setupPython()) {
    console.error('❌ Failed to setup Python environment.');
    process.exit(1);
  }
  console.log('✓ Python environment ready.\n');

  console.log('🐍 [2/2] Starting Python backend...');
  try {
    await startPythonServer();
    console.log(`✓ Python backend running at http://127.0.0.1:${PYTHON_PORT}\n`);
  } catch (err) {
    console.error('❌ Failed to start Python backend:', err.message);
    process.exit(1);
  }

  console.log('⚡ Starting Vite (Electron will auto-start via plugin)...\n');
  setupCleanup();
  
  startVite();
}

main();