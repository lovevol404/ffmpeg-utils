import { useState, useEffect, useMemo } from 'react';
import { Select, Button, Card, Space, message, Descriptions, Input, Modal, Slider, InputNumber } from 'antd';
import { FolderOpen } from 'lucide-react';
import { FileDrop } from '@/components/FileDrop';
import { CommandPreview } from '@/components/CommandPreview';
import { VideoPreviewButton } from '@/components/VideoPreview/VideoPreview';
import { useAppStore } from '@/stores/appStore';
import { usePresetStore } from '@/stores/presetStore';
import { useTaskStore } from '@/stores/taskStore';
import type { VideoInfo } from '@/types';

const formats = [
  { value: 'mp4', label: 'MP4' },
  { value: 'avi', label: 'AVI' },
  { value: 'mov', label: 'MOV' },
  { value: 'webm', label: 'WebM' },
  { value: 'mkv', label: 'MKV' },
];

const codecs = [
  { value: 'libx264', label: 'H.264' },
  { value: 'libx265', label: 'H.265' },
  { value: 'libvpx-vp9', label: 'VP9' },
  { value: 'libaom-av1', label: 'AV1' },
];

const resolutions = [
  { value: 'keep', label: '保持原始' },
  { value: '1920:1080', label: '1080p' },
  { value: '1280:720', label: '720p' },
  { value: '854:480', label: '480p' },
];

function getAudioTempoFilter(speed: number): string {
  if (speed === 1) return '';
  
  const filters: string[] = [];
  let remainingSpeed = speed;
  
  while (remainingSpeed > 2) {
    filters.push('atempo=2.0');
    remainingSpeed /= 2;
  }
  while (remainingSpeed < 0.5) {
    filters.push('atempo=0.5');
    remainingSpeed /= 0.5;
  }
  if (remainingSpeed !== 1) {
    filters.push(`atempo=${remainingSpeed.toFixed(2)}`);
  }
  
  return filters.join(',');
}

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

export default function ConvertModule() {
  const [files, setFiles] = useState<VideoInfo[]>([]);
  const [format, setFormat] = useState('mp4');
  const [codec, setCodec] = useState('libx264');
  const [resolution, setResolution] = useState('keep');
  const [speed, setSpeed] = useState(1);
  const [preset, setPreset] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');
  
  const { showCommand, setCurrentModule } = useAppStore();
  const { presets } = usePresetStore();
  const { addTask } = useTaskStore();

  useEffect(() => {
    if (files.length > 0) {
      const baseName = files[0].name.replace(/\.[^.]+$/, '');
      setOutputFileName(`${baseName}.${format}`);
    }
  }, [files, format]);

  const getFilterArgs = () => {
    const filters: string[] = [];
    
    if (resolution !== 'keep') {
      filters.push(`scale=${resolution}`);
    }
    
    if (speed !== 1) {
      filters.push(`setpts=${(1/speed).toFixed(2)}*PTS`);
    }
    
    return filters.length > 0 ? filters.join(',') : '';
  };

  const getAudioFilter = () => {
    return getAudioTempoFilter(speed);
  };

  const command = useMemo(() => {
    if (files.length === 0) return '';
    
    const videoFilter = getFilterArgs();
    const audioFilter = getAudioFilter();
    
    let cmd = `ffmpeg -i "${files[0].path}" -c:v ${codec} -c:a aac`;
    
    if (videoFilter) {
      cmd += ` -vf "${videoFilter}"`;
    }
    if (audioFilter) {
      cmd += ` -af "${audioFilter}"`;
    }
    
    cmd += ` "${outputFileName || 'output.' + format}"`;
    return cmd;
  }, [files, codec, resolution, speed, outputFileName, format]);

  const handleFilesSelected = (selectedFiles: VideoInfo[]) => {
    setFiles(selectedFiles);
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

  const handleConvert = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    const file = files[0];
    const finalFileName = outputFileName || `${file.name.replace(/\.[^.]+$/, '')}.${format}`;
    const inputDir = file.path.substring(0, file.path.lastIndexOf(/[/\\]/.test(file.path) ? (file.path.includes('\\') ? '\\' : '/') : '/'));
    const outputPath = outputDir ? `${outputDir}/${finalFileName}` : `${inputDir}/${finalFileName}`;

    const videoFilter = getFilterArgs();
    const audioFilter = getAudioFilter();
    const args = ['-c:v', codec, '-c:a', 'aac'];

    const taskData = {
      type: 'convert' as const,
      inputPath: file.path,
      outputPath,
      command,
      args,
      filterSimple: videoFilter || undefined,
      filterAudio: audioFilter || undefined,
    };

    if (window.electronAPI?.fs?.pathExists) {
      const exists = await window.electronAPI.fs.pathExists(outputPath);
      if (exists) {
        Modal.confirm({
          title: '文件已存在',
          content: `目标文件夹已存在 "${finalFileName}"，是否覆盖？`,
          okText: '覆盖',
          cancelText: '取消',
          onOk: () => {
            addTask(taskData);
            message.success('已添加到任务队列');
            setFiles([]);
            setOutputDir('');
            setCurrentModule('queue');
          },
        });
        return;
      }
    }

    addTask(taskData);

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
          <div key={index} style={{ marginBottom: index < files.length - 1 ? 16 : 0 }}>
            <Descriptions
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {file.name}
                  <VideoPreviewButton videoInfo={file} />
                </span>
              }
              size="small"
              column={4}
              bordered
              items={[
                { label: '时长', children: formatDuration(file.duration) },
                { label: '大小', children: formatSize(file.size) },
                { label: '分辨率', children: file.width ? `${file.width} x ${file.height}` : '-' },
                { label: '编码', children: file.codec || '-' },
                { label: '码率', children: formatBitrate(file.bitrate) },
                { label: '帧率', children: file.fps ? `${file.fps.toFixed(2)} fps` : '-' },
                { label: '格式', children: file.format || '-' },
                { label: '路径', children: <span style={{ fontSize: 11, color: '#64748B' }}>{file.path}</span> },
              ]}
            />
          </div>
        ))}
        
        <div style={{ 
          padding: '12px 16px', 
          background: '#F0FDFA', 
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: '#134E4A', fontWeight: 500, marginBottom: 12 }}>
            转换设置
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  输出格式
                </label>
                <Select value={format} onChange={setFormat} options={formats} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  视频编码
                </label>
                <Select value={codec} onChange={setCodec} options={codecs} style={{ width: '100%' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  分辨率
                </label>
                <Select value={resolution} onChange={setResolution} options={resolutions} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  预设模板
                </label>
                <Select
                  value={preset}
                  onChange={setPreset}
                  placeholder="选择预设"
                  allowClear
                  options={presets.map((p) => ({ value: p.id, label: p.name }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: '#64748B' }}>
                  播放速度
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InputNumber
                    value={speed}
                    onChange={(v) => setSpeed(v || 1)}
                    min={0.1}
                    max={100}
                    step={0.1}
                    precision={1}
                    style={{ width: 80 }}
                  />
                  <span style={{ fontSize: 12, color: '#64748B' }}>倍</span>
                </div>
              </div>
              <Slider
                value={speed}
                onChange={setSpeed}
                min={0.1}
                max={16}
                step={0.1}
                marks={{
                  0.25: '0.25x',
                  0.5: '0.5x',
                  1: '1x',
                  2: '2x',
                  4: '4x',
                  8: '8x',
                  16: '16x',
                }}
                tooltip={{ formatter: (v) => `${v}倍` }}
              />
              {speed !== 1 && files.length > 0 && (
                <div style={{ fontSize: 11, color: '#0D9488', marginTop: 4 }}>
                  预计时长: {formatDuration(files[0].duration / speed)} (原: {formatDuration(files[0].duration)})
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  输出文件名
                </label>
                <Input 
                  value={outputFileName} 
                  onChange={(e) => setOutputFileName(e.target.value)} 
                  placeholder={`输出文件名.${format}`}
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
          </Space>
        </div>

        <CommandPreview command={command} visible={showCommand} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => { setFiles([]); setOutputDir(''); }} disabled={!hasFile}>重置</Button>
          <Button type="primary" onClick={handleConvert} disabled={!hasFile}>
            开始转换
          </Button>
        </div>
      </Card>
    </div>
  );
}