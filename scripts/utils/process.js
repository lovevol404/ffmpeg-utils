const { spawn, ChildProcess } = require('child_process');

const processes = new Set();

function registerProcess(proc) {
  if (proc instanceof ChildProcess) {
    processes.add(proc);
    proc.on('exit', () => processes.delete(proc));
  }
  return proc;
}

function killProcess(proc, signal = 'SIGTERM') {
  if (proc && proc.pid) {
    try {
      process.kill(proc.pid, signal);
    } catch {
      // Process might already be dead
    }
  }
}

function killAllProcesses() {
  for (const proc of processes) {
    killProcess(proc);
  }
  processes.clear();
}

function setupCleanup() {
  const cleanup = () => {
    console.log('\nCleaning up processes...');
    killAllProcesses();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', killAllProcesses);
}

function waitForPort(port, host = '127.0.0.1', timeout = 30000) {
  const net = require('net');
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    function check() {
      const socket = net.connect({ port, host }, () => {
        socket.destroy();
        resolve();
      });
      
      socket.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 500);
        }
      });
    }
    check();
  });
}

module.exports = {
  registerProcess,
  killProcess,
  killAllProcesses,
  setupCleanup,
  waitForPort,
};