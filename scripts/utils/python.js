const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PYTHON_DIR = path.join(ROOT_DIR, 'python');
const VENV_DIR = path.join(PYTHON_DIR, '.venv');
const REQUIREMENTS_FILE = path.join(PYTHON_DIR, 'requirements.txt');

function getPythonExecutable() {
  const isWin = process.platform === 'win32';
  
  if (isWin) {
    return path.join(VENV_DIR, 'Scripts', 'python.exe');
  }
  return path.join(VENV_DIR, 'bin', 'python');
}

function getPipExecutable() {
  const isWin = process.platform === 'win32';
  
  if (isWin) {
    return path.join(VENV_DIR, 'Scripts', 'pip.exe');
  }
  return path.join(VENV_DIR, 'bin', 'pip');
}

function findSystemPython() {
  const isWin = process.platform === 'win32';
  const pythonCommands = isWin ? ['python', 'python3', 'py'] : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const match = result.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        if (major > 3 || (major === 3 && minor >= 10)) {
          return cmd;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function venvExists() {
  return fs.existsSync(VENV_DIR);
}

function createVenv(pythonCmd) {
  console.log(`Creating virtual environment with ${pythonCmd}...`);
  
  try {
    execSync(`${pythonCmd} -m venv "${VENV_DIR}"`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
    });
    console.log('Virtual environment created successfully.');
    return true;
  } catch (error) {
    console.error('Failed to create virtual environment:', error.message);
    return false;
  }
}

function checkDependenciesInstalled() {
  const pip = getPipExecutable();
  if (!fs.existsSync(pip)) return false;
  
  try {
    const result = execSync(`"${pip}" list --format=freeze`, { 
      cwd: PYTHON_DIR, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const requirements = fs.readFileSync(REQUIREMENTS_FILE, 'utf8');
    const requiredPackages = requirements
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split(/[=<>]/)[0].toLowerCase());
    
    const installedPackages = result
      .toLowerCase()
      .split('\n')
      .filter(line => line.includes('=='))
      .map(line => line.split('==')[0]);
    
    for (const pkg of requiredPackages) {
      if (!installedPackages.includes(pkg)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

function installDependencies() {
  const pip = getPipExecutable();
  console.log('Installing Python dependencies...');
  
  try {
    execSync(`"${pip}" install -r "${REQUIREMENTS_FILE}" -i https://mirrors.aliyun.com/pypi/simple`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
    });
    console.log('Dependencies installed successfully.');
    return true;
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    return false;
  }
}

function setupPython() {
  if (venvExists()) {
    console.log('Virtual environment already exists.');
    
    if (!checkDependenciesInstalled()) {
      console.log('Installing/updating dependencies...');
      return installDependencies();
    }
    console.log('Dependencies are up to date.');
    return true;
  }
  
  const pythonCmd = findSystemPython();
  if (!pythonCmd) {
    console.error('Python 3.10+ not found. Please install Python 3.10 or later.');
    return false;
  }
  
  console.log(`Found Python: ${pythonCmd}`);
  
  if (!createVenv(pythonCmd)) {
    return false;
  }
  
  return installDependencies();
}

module.exports = {
  ROOT_DIR,
  PYTHON_DIR,
  VENV_DIR,
  getPythonExecutable,
  getPipExecutable,
  findSystemPython,
  venvExists,
  createVenv,
  installDependencies,
  setupPython,
};