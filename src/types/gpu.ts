export type GPUType = 'nvenc' | 'qsv' | 'amf' | 'videotoolbox' | 'vaapi' | 'none';

export interface GPUEncoder {
  h264: string;
  hevc: string;
}

export interface GPUCapability {
  type: GPUType;
  name: string;
  available: boolean;
  encoders: GPUEncoder;
}

export interface GPUConfig {
  acceleration: GPUType | 'auto';
  detectedGPU: GPUCapability | null;
}

export const GPU_ENCODERS: Record<Exclude<GPUType, 'none'>, GPUEncoder> = {
  nvenc: {
    h264: 'h264_nvenc',
    hevc: 'hevc_nvenc',
  },
  qsv: {
    h264: 'h264_qsv',
    hevc: 'hevc_qsv',
  },
  amf: {
    h264: 'h264_amf',
    hevc: 'hevc_amf',
  },
  videotoolbox: {
    h264: 'h264_videotoolbox',
    hevc: 'hevc_videotoolbox',
  },
  vaapi: {
    h264: 'h264_vaapi',
    hevc: 'hevc_vaapi',
  },
};

export const CPU_ENCODERS: GPUEncoder = {
  h264: 'libx264',
  hevc: 'libx265',
};

export const GPU_DISPLAY_NAMES: Record<GPUType | 'auto', string> = {
  auto: '自动检测',
  nvenc: 'NVIDIA NVENC',
  qsv: 'Intel QuickSync',
  amf: 'AMD AMF',
  videotoolbox: 'Apple VideoToolbox',
  vaapi: 'VA-API (Linux)',
  none: '禁用硬件加速',
};

export const GPU_PRIORITY: GPUType[] = ['nvenc', 'qsv', 'amf', 'videotoolbox', 'vaapi'];