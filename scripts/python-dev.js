#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const { setupPython, getPythonExecutable, PYTHON_DIR } = require('./utils/python');
const { registerProcess, setupCleanup, waitForPort } = require('./utils/process');

const PORT = process.env.PYTHON_PORT ? parseInt(process.env.PYTHON_PORT, 10) : 8765;

async function main() {
  console.log('Setting up Python environment...');
  
  if (!setupPython()) {
    console.error('Failed to setup Python environment.');
    process.exit(1);
  }

  const python = getPythonExecutable();
  const mainPy = path.join(PYTHON_DIR, 'main.py');
  
  console.log(`Starting Python server on port ${PORT}...`);
  
  const proc = spawn(python, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: PYTHON_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
    },
  });

  registerProcess(proc);
  setupCleanup();

  proc.on('error', (err) => {
    console.error('Failed to start Python server:', err);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Python server exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  try {
    await waitForPort(PORT);
    console.log(`\n✓ Python server running at http://127.0.0.1:${PORT}`);
    console.log('Press Ctrl+C to stop.\n');
  } catch (err) {
    console.error('Failed to start Python server:', err.message);
    process.exit(1);
  }
}

main();