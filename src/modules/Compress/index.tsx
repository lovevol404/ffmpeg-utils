import { useState, useMemo, useEffect } from 'react';
import { Slider, InputNumber, Select, Button, Card, Space, message, Row, Col, Descriptions, Input, Modal } from 'antd';
import { Zap, Target, Sparkles, HardDrive, FolderOpen } from 'lucide-react';
import { FileDrop } from '@/components/FileDrop';
import { CommandPreview } from '@/components/CommandPreview';
import { VideoPreviewButton } from '@/components/VideoPreview/VideoPreview';
import { useAppStore } from '@/stores/appStore';
import { useTaskStore } from '@/stores/taskStore';
import { getVideoEncoder } from '@/utils/encoder';
import type { VideoInfo } from '@/types';

type CompressionMode = 'targetSize' | 'qualityFirst' | 'fastCompress';

const audioBitrateOptions = [
  { value: 64, label: '64 kbps' },
  { value: 128, label: '128 kbps' },
  { value: 192, label: '192 kbps' },
  { value: 256, label: '256 kbps' },
];

const modeConfig = {
  targetSize: {
    icon: Target,
    title: '目标大小',
    description: '指定目标文件大小进行压缩',
  },
  qualityFirst: {
    icon: Sparkles,
    title: '质量优先',
    description: '使用CRF模式保持最佳质量',
  },
  fastCompress: {
    icon: Zap,
    title: '快速压缩',
    description: '使用快速预设加速编码',
  },
};

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatBitrate(bps: number): string {
  if (!bps) return '-';
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1000000).toFixed(2)} Mbps`;
}

export default function CompressModule() {
  const [files, setFiles] = useState<VideoInfo[]>([]);
  const [mode, setMode] = useState<CompressionMode>('targetSize');
  const [targetSize, setTargetSize] = useState<number>(10);
  const [quality, setQuality] = useState<number>(50);
  const [videoBitrate, setVideoBitrate] = useState<number | null>(null);
  const [audioBitrate, setAudioBitrate] = useState<number>(128);
  const [outputDir, setOutputDir] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');

  const { showCommand, setCurrentModule, gpuAcceleration, detectedGPU } = useAppStore();
  const { addTask } = useTaskStore();

  useEffect(() => {
    if (files.length > 0) {
      const baseName = files[0].name.replace(/\.[^.]+$/, '');
      setOutputFileName(`${baseName}_compressed.mp4`);
    }
  }, [files]);

  const encoder = useMemo(() => {
    return getVideoEncoder(gpuAcceleration, 'h264', detectedGPU);
  }, [gpuAcceleration, detectedGPU]);

  const command = useMemo(() => {
    if (files.length === 0) return '';
    const input = files[0].path;
    const output = outputFileName || input.replace(/\.[^.]+$/, '_compressed.mp4');

    switch (mode) {
      case 'targetSize':
        const targetBytes = targetSize * 1024 * 1024;
        return `ffmpeg -i "${input}" -fs ${targetBytes} -c:v ${encoder} -c:a aac "${output}"`;
      case 'qualityFirst':
        const crf = Math.round(51 - (quality / 100) * 51);
        return `ffmpeg -i "${input}" -c:v ${encoder} -crf ${crf} -c:a aac "${output}"`;
      case 'fastCompress':
        return `ffmpeg -i "${input}" -c:v ${encoder} -preset fast -c:a aac "${output}"`;
      default:
        return '';
    }
  }, [files, mode, targetSize, quality, outputFileName, encoder]);

  const estimatedSize = useMemo(() => {
    if (files.length === 0) return null;
    const originalSize = files[0].size;

    switch (mode) {
      case 'targetSize':
        return targetSize * 1024 * 1024;
      case 'qualityFirst':
        const crf = Math.round(51 - (quality / 100) * 51);
        const qualityFactor = 1 - (crf / 51) * 0.7;
        return originalSize * qualityFactor;
      case 'fastCompress':
        return originalSize * 0.6;
      default:
        return null;
    }
  }, [files, mode, targetSize, quality]);

  const compressionRatio = useMemo(() => {
    if (!files.length || !estimatedSize) return null;
    const originalSize = files[0].size;
    return Math.round((1 - estimatedSize / originalSize) * 100);
  }, [files, estimatedSize]);

  const handleFilesSelected = (selectedFiles: VideoInfo[]) => {
    setFiles(selectedFiles);
    message.success(`已选择文件: ${selectedFiles[0].name}`);
  };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI?.fs?.selectFolder) {
      message.warning('请使用 Electron 版本');
      return;
    }
    const dir = await window.electronAPI.fs.selectFolder();
    if (dir) {
      setOutputDir(dir);
      message.success(`输出目录: ${dir}`);
    }
  };

  const handleCompress = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    const input = files[0].path;
    const finalFileName = outputFileName || `${files[0].name.replace(/\.[^.]+$/, '')}_compressed.mp4`;
    const output = outputDir ? `${outputDir}/${finalFileName}` : input.replace(/\.[^.]+$/, '_compressed.mp4');

    if (window.electronAPI?.fs?.pathExists) {
      const exists = await window.electronAPI.fs.pathExists(output);
      if (exists) {
        Modal.confirm({
          title: '文件已存在',
          content: `目标文件夹已存在 "${finalFileName}"，是否覆盖？`,
          okText: '覆盖',
          cancelText: '取消',
          onOk: () => {
            addTask({
              type: 'compress',
              inputPath: input,
              outputPath: output,
              command,
            });
            message.success('已添加到任务队列');
            setFiles([]);
            setOutputDir('');
            setCurrentModule('queue');
          },
        });
        return;
      }
    }

    addTask({
      type: 'compress',
      inputPath: input,
      outputPath: output,
      command,
    });

    message.success('已添加到任务队列');
    setFiles([]);
    setOutputDir('');
    setCurrentModule('queue');
  };

  const hasFile = files.length > 0;

  return (
    <div>
      <FileDrop onFilesSelected={handleFilesSelected} />

      <Card style={{ marginTop: 16 }}>
        {!hasFile && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            color: '#94A3B8',
            background: '#F8FAFC',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            请先选择视频文件以查看文件信息
          </div>
        )}
        
        {hasFile && files.map((file, index) => (
          <Descriptions
            key={index}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {file.name}
                <VideoPreviewButton videoInfo={file} />
              </span>
            }
            size="small"
            column={4}
            bordered
            style={{ marginBottom: 16 }}
            items={[
              { label: '时长', children: formatDuration(file.duration) },
              { label: '大小', children: formatSize(file.size) },
              { label: '分辨率', children: file.width ? `${file.width} x ${file.height}` : '-' },
              { label: '编码', children: file.codec || '-' },
              { label: '码率', children: formatBitrate(file.bitrate) },
              { label: '帧率', children: file.fps ? `${file.fps.toFixed(2)} fps` : '-' },
            ]}
          />
        ))}

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 500, color: '#134E4A' }}>
            压缩模式
          </label>
          <Row gutter={12}>
            {(Object.keys(modeConfig) as CompressionMode[]).map((key) => {
              const config = modeConfig[key];
              const Icon = config.icon;
              const isSelected = mode === key;
              return (
                <Col span={8} key={key}>
                  <div
                    onClick={() => setMode(key)}
                    style={{
                      padding: 16,
                      border: `2px solid ${isSelected ? '#0D9488' : '#E2E8F0'}`,
                      borderRadius: 12,
                      background: isSelected ? '#E6FFFA' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                  >
                    <Icon size={24} color={isSelected ? '#0D9488' : '#94A3B8'} />
                    <div style={{ marginTop: 8, fontWeight: 500, color: '#134E4A' }}>
                      {config.title}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#64748B' }}>
                      {config.description}
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {mode === 'targetSize' && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748B' }}>
                目标大小 (MB)
              </label>
              <InputNumber
                value={targetSize}
                onChange={(v) => setTargetSize(v || 1)}
                min={1}
                max={1000}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {mode === 'qualityFirst' && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748B' }}>
                质量等级: {quality}%
              </label>
              <Slider
                value={quality}
                onChange={setQuality}
                min={1}
                max={100}
                marks={{ 1: '低质量', 50: '平衡', 100: '高质量' }}
              />
            </div>
          )}

          {mode === 'fastCompress' && (
            <div style={{ padding: 12, background: '#F0FDFA', borderRadius: 8, color: '#64748B', fontSize: 14 }}>
              使用快速预设进行压缩，编码速度更快但压缩率较低
            </div>
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748B' }}>
                视频码率 (kbps, 可选)
              </label>
              <InputNumber
                value={videoBitrate}
                onChange={(v) => setVideoBitrate(v)}
                placeholder="自动"
                min={100}
                max={50000}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748B' }}>
                音频码率
              </label>
              <Select
                value={audioBitrate}
                onChange={setAudioBitrate}
                options={audioBitrateOptions}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出文件名
              </label>
              <Input 
                value={outputFileName} 
                onChange={(e) => setOutputFileName(e.target.value)} 
                placeholder="输出文件名.mp4"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出目录
              </label>
              <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
                {outputDir || '默认保存到源文件目录'}
              </Button>
            </div>
          </div>

          {hasFile && (
            <Card
              style={{
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                marginTop: 8,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <HardDrive size={18} color="#22C55E" />
                <span style={{ fontWeight: 500, color: '#134E4A' }}>预估结果</span>
              </div>
              <Row gutter={24}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>原始大小</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#134E4A' }}>
                    {formatSize(files[0].size)}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>预估压缩后</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#22C55E' }}>
                    {estimatedSize ? formatSize(estimatedSize) : '-'}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>压缩比例</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#22C55E' }}>
                    {compressionRatio !== null ? `${compressionRatio}%` : '-'}
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <CommandPreview command={command} visible={showCommand} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setFiles([])} disabled={!hasFile}>重置</Button>
            <Button type="primary" onClick={handleCompress} disabled={!hasFile}>
              开始压缩
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}