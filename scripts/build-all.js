#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'release');

function runScript(scriptPath) {
  console.log(`\n▶ Running: ${scriptPath}\n`);
  
  try {
    execSync(`node "${scriptPath}"`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    return true;
  } catch (err) {
    console.error(`Failed to run ${scriptPath}:`, err.message);
    return false;
  }
}

function buildElectron() {
  console.log('\n📦 Building Electron application...\n');
  
  try {
    console.log('Building frontend...');
    execSync('npm run build:frontend', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    
    console.log('\nBuilding Electron app for Windows...');
    execSync('npx electron-builder --win', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    
    return true;
  } catch (err) {
    console.error('Failed to build Electron application:', err.message);
    return false;
  }
}

function main() {
  console.log('🚀 Starting build process (Windows)...\n');
  console.log('='.repeat(50));

  console.log('\n[1/2] Building Python backend...');
  if (!runScript(path.join(ROOT_DIR, 'scripts', 'build-python.js'))) {
    console.error('\n❌ Python build failed, aborting.');
    process.exit(1);
  }

  console.log('\n[2/2] Building Electron application...');
  if (!buildElectron()) {
    console.error('\n❌ Electron build failed.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Build completed successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main();