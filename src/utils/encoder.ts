import type { GPUType, GPUCapability } from '@/types/gpu';
import { GPU_ENCODERS, CPU_ENCODERS } from '@/types/gpu';

export function getVideoEncoder(gpuType: GPUType | 'auto', codec: 'h264' | 'hevc', detectedGPU: GPUCapability | null): string {
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

export function resolveEncoder(selectedCodec: string, gpuType: GPUType | 'auto', detectedGPU: GPUCapability | null): string {
  if (selectedCodec === 'libx264') {
    return getVideoEncoder(gpuType, 'h264', detectedGPU);
  }
  if (selectedCodec === 'libx265') {
    return getVideoEncoder(gpuType, 'hevc', detectedGPU);
  }
  return selectedCodec;
}

export function getGPUEncodeArgs(gpuType: GPUType | 'auto', quality: number = 22): string[] {
  const args: string[] = [];
  
  if (gpuType === 'nvenc') {
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
  }
  
  return args;
}

export function isGPUEncoder(encoder: string): boolean {
  const gpuEncoders = [
    'h264_nvenc', 'hevc_nvenc',
    'h264_qsv', 'hevc_qsv',
    'h264_amf', 'hevc_amf',
    'h264_videotoolbox', 'hevc_videotoolbox',
    'h264_vaapi', 'hevc_vaapi',
  ];
  return gpuEncoders.includes(encoder);
}

export function getEncoderDisplayName(encoder: string): string {
  const names: Record<string, string> = {
    'libx264': 'H.264 (CPU)',
    'libx265': 'H.265 (CPU)',
    'h264_nvenc': 'H.264 (NVIDIA NVENC)',
    'hevc_nvenc': 'H.265 (NVIDIA NVENC)',
    'h264_qsv': 'H.264 (Intel QSV)',
    'hevc_qsv': 'H.265 (Intel QSV)',
    'h264_amf': 'H.264 (AMD AMF)',
    'hevc_amf': 'H.265 (AMD AMF)',
    'h264_videotoolbox': 'H.264 (VideoToolbox)',
    'hevc_videotoolbox': 'H.265 (VideoToolbox)',
    'h264_vaapi': 'H.264 (VA-API)',
    'hevc_vaapi': 'H.265 (VA-API)',
  };
  return names[encoder] || encoder;
}