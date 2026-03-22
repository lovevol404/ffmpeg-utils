#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const PYTHON_DIR = path.join(ROOT_DIR, 'python');
const OUTPUT_DIR = path.join(ROOT_DIR, 'resources', 'python');

function getPythonExecutable() {
  const isWin = process.platform === 'win32';
  
  if (isWin) {
    return path.join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe');
  }
  return path.join(PYTHON_DIR, '.venv', 'bin', 'python');
}

function checkPyInstaller() {
  const python = getPythonExecutable();
  try {
    execSync(`"${python}" -c "import PyInstaller"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function installPyInstaller() {
  const python = getPythonExecutable();
  console.log('Installing PyInstaller...');
  
  try {
    execSync(`"${python}" -m pip install pyinstaller -i https://mirrors.aliyun.com/pypi/simple`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
    });
    return true;
  } catch (err) {
    console.error('Failed to install PyInstaller:', err.message);
    return false;
  }
}

function buildPython() {
  const python = getPythonExecutable();
  const isWin = process.platform === 'win32';
  const executableName = isWin ? 'video-toolbox-ai.exe' : 'video-toolbox-ai';
  
  console.log('Building Python application with PyInstaller...');
  
  const hiddenImports = [
    'api',
    'api.routes',
    'api.schemas',
    'agents',
    'agents.video_agent',
    'core',
    'core.config',
    'tools',
    'tools.ffmpeg_tools',
    'tools.whisper_tools',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'starlette',
    'starlette.responses',
    'starlette.routing',
    'starlette.middleware',
    'starlette.middleware.cors',
    'sse_starlette',
    'sse_starlette.sse',
    'pydantic',
    'pydantic_settings',
    'langchain',
    'langchain_openai',
    'langchain_community',
    'openai',
    'faster_whisper',
    'ffmpeg',
    '_ffmpeg',
  ];

  const args = [
    '-m', 'PyInstaller',
    '--name', 'video-toolbox-ai',
    '--distpath', OUTPUT_DIR,
    '--workpath', path.join(PYTHON_DIR, 'build'),
    '--specpath', PYTHON_DIR,
    '--onedir',
    '--noconfirm',
    '--clean',
    ...hiddenImports.flatMap(imp => ['--hidden-import', imp]),
    '--collect-all', 'uvicorn',
    '--collect-all', 'fastapi',
    '--collect-all', 'starlette',
    '--collect-all', 'sse_starlette',
    '--collect-all', 'faster_whisper',
    '--collect-all', 'torch',
    'main.py',
  ];

  try {
    execSync(`"${python}" ${args.join(' ')}`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
    });
    
    const outputPath = path.join(OUTPUT_DIR, 'video-toolbox-ai');
    console.log(`\n✓ Python build completed: ${outputPath}`);
    return true;
  } catch (err) {
    console.error('Failed to build Python application:', err.message);
    return false;
  }
}

function main() {
  console.log('📦 Building Python backend...\n');

  if (!checkPyInstaller()) {
    if (!installPyInstaller()) {
      process.exit(1);
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (buildPython()) {
    console.log('\n✅ Python build successful!');
  } else {
    console.error('\n❌ Python build failed!');
    process.exit(1);
  }
}

main();