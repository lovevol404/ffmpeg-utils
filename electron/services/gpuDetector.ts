import { spawn, execSync } from 'child_process';
import { getFFmpegPath } from './ffmpeg';
import type { GPUType, GPUCapability, GPUEncoder } from '../../src/types/gpu';
import { GPU_ENCODERS, GPU_PRIORITY, CPU_ENCODERS } from '../../src/types/gpu';

const platform = process.platform;

function getEncoders(): string[] {
  try {
    const ffmpegPath = getFFmpegPath();
    console.log('Checking encoders from:', ffmpegPath);
    const result = execSync(`"${ffmpegPath}" -encoders`, { encoding: 'utf-8' });
    const encoders: string[] = [];
    const lines = result.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*[VAS]\S+\s+(\S+)/);
      if (match) {
        encoders.push(match[1]);
      }
    }
    console.log('Available encoders count:', encoders.length);
    console.log('NVENC available:', encoders.includes('h264_nvenc'));
    return encoders;
  } catch (error) {
    console.error('Failed to get encoders:', error);
    return [];
  }
}

async function getNVIDIAGPUName(): Promise<string | null> {
  if (platform !== 'win32') return null;
  
  try {
    const result = execSync(
      'wmic path win32_VideoController get name',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const lines = result.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.toLowerCase().includes('nvidia')) {
        return trimmed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getIntelGPUName(): Promise<string | null> {
  if (platform !== 'win32') return null;
  
  try {
    const result = execSync(
      'wmic path win32_VideoController get name',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const lines = result.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.toLowerCase().includes('intel') || trimmed.toLowerCase().includes('uhd') || trimmed.toLowerCase().includes('iris'))) {
        return trimmed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getAMDGPUName(): Promise<string | null> {
  if (platform !== 'win32') return null;
  
  try {
    const result = execSync(
      'wmic path win32_VideoController get name',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const lines = result.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.toLowerCase().includes('amd') || trimmed.toLowerCase().includes('radeon'))) {
        return trimmed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getMacGPUName(): Promise<string | null> {
  if (platform !== 'darwin') return null;
  
  try {
    const result = execSync('system_profiler SPDisplaysDataType', { encoding: 'utf-8' });
    const match = result.match(/Chipset Model:\s*(.+)/);
    return match ? match[1].trim() : 'Apple GPU';
  } catch {
    return 'Apple GPU';
  }
}

async function testEncoder(encoder: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegPath = getFFmpegPath();
    console.log('Testing encoder:', encoder);
    
    const args = [
      '-f', 'lavfi',
      '-i', 'color=c=black:s=320x240:d=0.1',
      '-c:v', encoder,
      '-f', 'null',
      '-'
    ];
    
    const proc = spawn(ffmpegPath, args);
    
    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      console.log(`Encoder ${encoder} test result: code=${code}`);
      if (code !== 0) {
        console.log('Error output:', stderr.slice(-500));
      }
      resolve(code === 0);
    });
    
    proc.on('error', (err) => {
      console.log(`Encoder ${encoder} test error:`, err.message);
      resolve(false);
    });
    
    setTimeout(() => {
      proc.kill();
      console.log(`Encoder ${encoder} test timeout`);
      resolve(false);
    }, 10000);
  });
}

export async function detectGPU(): Promise<GPUCapability | null> {
  console.log('Starting GPU detection...');
  const encoders = getEncoders();
  console.log('Encoders found:', encoders.filter(e => e.includes('nvenc') || e.includes('qsv') || e.includes('amf')));
  
  if (platform === 'win32') {
    console.log('Checking NVIDIA NVENC...');
    if (encoders.includes('h264_nvenc')) {
      const name = await getNVIDIAGPUName();
      console.log('NVIDIA GPU name:', name);
      const available = await testEncoder('h264_nvenc');
      console.log('NVENC available:', available);
      if (available) {
        return {
          type: 'nvenc',
          name: name || 'NVIDIA GPU',
          available: true,
          encoders: GPU_ENCODERS.nvenc,
        };
      }
    }
    
    console.log('Checking Intel QSV...');
    if (encoders.includes('h264_qsv')) {
      const name = await getIntelGPUName();
      const available = await testEncoder('h264_qsv');
      if (available) {
        return {
          type: 'qsv',
          name: name || 'Intel GPU',
          available: true,
          encoders: GPU_ENCODERS.qsv,
        };
      }
    }
    
    console.log('Checking AMD AMF...');
    if (encoders.includes('h264_amf')) {
      const name = await getAMDGPUName();
      const available = await testEncoder('h264_amf');
      if (available) {
        return {
          type: 'amf',
          name: name || 'AMD GPU',
          available: true,
          encoders: GPU_ENCODERS.amf,
        };
      }
    }
  }
  
  if (platform === 'darwin') {
    if (encoders.includes('h264_videotoolbox')) {
      const name = await getMacGPUName();
      const available = await testEncoder('h264_videotoolbox');
      if (available) {
        return {
          type: 'videotoolbox',
          name: name || 'Apple GPU',
          available: true,
          encoders: GPU_ENCODERS.videotoolbox,
        };
      }
    }
  }
  
  if (platform === 'linux') {
    if (encoders.includes('h264_vaapi')) {
      const available = await testEncoder('h264_vaapi');
      if (available) {
        return {
          type: 'vaapi',
          name: 'VA-API GPU',
          available: true,
          encoders: GPU_ENCODERS.vaapi,
        };
      }
    }
  }
  
  console.log('No GPU detected');
  return null;
}

export function getEncoderForGPU(gpuType: GPUType | 'auto', codec: 'h264' | 'hevc', detectedGPU: GPUCapability | null): string {
  if (gpuType === 'auto') {
    if (detectedGPU && detectedGPU.available) {
      return detectedGPU.encoders[codec];
    }
    return CPU_ENCODERS[codec];
  }
  
  if (gpuType === 'none') {
    return CPU_ENCODERS[codec];
  }
  
  const gpuEncoder = GPU_ENCODERS[gpuType];
  if (gpuEncoder) {
    return gpuEncoder[codec];
  }
  
  return CPU_ENCODERS[codec];
}

export function getGPUEncodeArgs(gpuType: GPUType | 'auto', quality: number = 22): string[] {
  const args: string[] = [];
  
  if (gpuType === 'nvenc' || gpuType === 'auto') {
    args.push('-preset', 'p4');
    args.push('-cq:v', String(quality));
  } else if (gpuType === 'qsv') {
    args.push('-preset', 'fast');
    args.push('-global_quality', String(quality));
  } else if (gpuType === 'amf') {
    args.push('-quality', 'balanced');
    args.push('-rc', 'cqp');
    args.push('-qp_i', String(quality));
    args.push('-qp_p', String(quality));
  } else if (gpuType === 'videotoolbox') {
    args.push('-q:v', String(Math.round(quality * 2.5)));
  } else if (gpuType === 'vaapi') {
    args.push('-vaapi_device', '/dev/dri/renderD128');
  }
  
  return args;
}

export { CPU_ENCODERS, GPU_ENCODERS };