import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import os from 'os';

let ffmpegPath: string;
let ffprobePath: string;

function getPlatformDir(): string {
  const platform = process.platform;
  const arch = process.arch;
  
  if (platform === 'win32') {
    return 'win-x64';
  } else if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  } else {
    return 'linux-x64';
  }
}

function findSystemFFmpeg(): string | null {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      const result = execSync('where ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim().split('\n')[0];
    } else {
      const result = execSync('which ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim();
    }
  } catch {
    return null;
  }
}

function findSystemFFprobe(): string | null {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      const result = execSync('where ffprobe', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim().split('\n')[0];
    } else {
      const result = execSync('which ffprobe', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      return result.trim();
    }
  } catch {
    return null;
  }
}

function getResourcesPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg');
  }
  
  const possiblePaths = [
    path.join(process.cwd(), 'resources', 'ffmpeg'),
    path.join(__dirname, '..', '..', 'resources', 'ffmpeg'),
    path.join(app.getAppPath(), 'resources', 'ffmpeg'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  return path.join(process.cwd(), 'resources', 'ffmpeg');
}

function getBundledPath(binaryName: string): string | null {
  const platformDir = getPlatformDir();
  const resourcesPath = getResourcesPath();
  
  const bundledPath = path.join(resourcesPath, platformDir, 'bin', binaryName);
  
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  
  const fallbackPath = path.join(resourcesPath, 'bin', binaryName);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  
  return null;
}

export function initFFmpeg() {
  const systemFFmpeg = findSystemFFmpeg();
  const systemFFprobe = findSystemFFprobe();
  
  const ffmpegExe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeExe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

  if (systemFFmpeg) {
    ffmpegPath = systemFFmpeg;
    console.log('Using system FFmpeg:', ffmpegPath);
  } else {
    const bundled = getBundledPath(ffmpegExe);
    if (bundled) {
      ffmpegPath = bundled;
      console.log('Using bundled FFmpeg:', ffmpegPath);
    } else {
      const resourcesPath = getResourcesPath();
      ffmpegPath = path.join(resourcesPath, getPlatformDir(), 'bin', ffmpegExe);
      console.log('FFmpeg not found, expected at:', ffmpegPath);
    }
  }

  if (systemFFprobe) {
    ffprobePath = systemFFprobe;
    console.log('Using system FFprobe:', ffprobePath);
  } else {
    const bundled = getBundledPath(ffprobeExe);
    if (bundled) {
      ffprobePath = bundled;
      console.log('Using bundled FFprobe:', ffprobePath);
    } else {
      const resourcesPath = getResourcesPath();
      ffprobePath = path.join(resourcesPath, getPlatformDir(), 'bin', ffprobeExe);
      console.log('FFprobe not found, expected at:', ffprobePath);
    }
  }
}

export function getFFmpegPath(): string {
  return ffmpegPath;
}

export function getFFprobePath(): string {
  return ffprobePath;
}

export interface FFmpegOptions {
  input: string;
  output: string;
  args?: string[];
  inputArgs?: string[];
  extraInputs?: string[];
  filterComplex?: string;
  filterSimple?: string;
  filterAudio?: string;
  concatFileList?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function executeFFmpeg(options: FFmpegOptions): ChildProcess {
  const { input, output, args, inputArgs: preInputArgs, extraInputs, filterComplex, filterSimple, filterAudio, concatFileList, onProgress, onComplete, onError } = options;
  
  let tempFilePath: string | null = null;
  
  const extraInputArgs: string[] = [];
  extraInputs?.forEach((extraInput) => {
    extraInputArgs.push('-i', extraInput);
  });
  
  const filterArgs: string[] = [];
  if (filterComplex) {
    filterArgs.push('-filter_complex', filterComplex);
  }
  if (filterSimple) {
    filterArgs.push('-vf', filterSimple);
  }
  if (filterAudio) {
    filterArgs.push('-af', filterAudio);
  }
  
  let defaultArgs: string[];
  
  if (concatFileList) {
    tempFilePath = path.join(os.tmpdir(), `ffmpeg_concat_${Date.now()}.txt`);
    fs.writeFileSync(tempFilePath, concatFileList, 'utf-8');
    defaultArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', tempFilePath,
      '-c', 'copy',
      '-y',
      output,
    ];
  } else {
    // FFmpeg 命令顺序: 输入 -> 滤镜 -> 编码参数 -> 输出
    defaultArgs = [
      ...(preInputArgs || []),
      '-i', input,
      ...extraInputArgs,
      ...filterArgs,  // 滤镜在编码参数之前
      '-y',
      ...(args || []),  // 编码参数
      output,
    ];
  }

  const proc = spawn(ffmpegPath, defaultArgs);
  
  let duration = 0;
  let stderrOutput = '';
  const durationRegex = /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
  const timeRegex = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;

  proc.stderr.on('data', (data) => {
    const out = data.toString();
    stderrOutput += out;
    
    if (!duration) {
      const match = out.match(durationRegex);
      if (match) {
        const [, h, m, s, ms] = match;
        duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 100;
      }
    }
    
    const timeMatch = out.match(timeRegex);
    if (timeMatch && duration > 0 && onProgress) {
      const [, h, m, s, ms] = timeMatch;
      const currentTime = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 100;
      const progress = (currentTime / duration) * 100;
      onProgress(Math.min(progress, 100));
    }
  });

  proc.on('close', (code) => {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
    if (code === 0) {
      onComplete?.();
    } else {
      const errorLines = stderrOutput
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('frame=') && !line.startsWith('  '))
        .slice(-5)
        .join('\n');
      onError?.(`FFmpeg exited with code ${code}\n${errorLines}`);
    }
  });

  proc.on('error', (err) => {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
    onError?.(err.message);
  });

  return proc;
}

export async function getFFmpegVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-version']);
    let out = '';
    
    proc.stdout.on('data', (data) => {
      out += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        const versionMatch = out.match(/ffmpeg version (\S+)/);
        resolve(versionMatch ? versionMatch[1] : 'unknown');
      } else {
        reject(new Error('Failed to get FFmpeg version'));
      }
    });
  });
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
  format: string;
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn(ffprobePath, args);
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed: ${errorOutput || 'Unknown error'}`));
        return;
      }

      try {
        const data = JSON.parse(output);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const format = data.format || {};

        const info: VideoInfo = {
          path: filePath,
          name: path.basename(filePath),
          size: parseInt(format.size) || 0,
          duration: parseFloat(format.duration) || 0,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          codec: videoStream?.codec_name || 'unknown',
          bitrate: parseInt(format.bit_rate) || 0,
          fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
          format: format.format_name || 'unknown',
        };

        resolve(info);
      } catch (err) {
        reject(new Error(`Failed to parse video info: ${err}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFprobe error: ${err.message}`));
    });
  });
}