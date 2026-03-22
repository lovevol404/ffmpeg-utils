import { useState } from 'react';
import { Tabs, Select, Button, Card, Space, InputNumber, Input, message, Radio, Slider, Typography, Descriptions } from 'antd';
import { Image, Film, Music, Camera, FolderOpen } from 'lucide-react';
import { FileDrop } from '@/components/FileDrop';
import { CommandPreview } from '@/components/CommandPreview';
import { TimeRangePicker } from '@/components/TimeRangePicker/TimeRangePicker';
import { VideoPreviewButton } from '@/components/VideoPreview/VideoPreview';
import { ScreenshotTimeSelector } from '@/components/ScreenshotTimeSelector';
import { useAppStore } from '@/stores/appStore';
import { useTaskStore } from '@/stores/taskStore';
import type { VideoInfo } from '@/types';

const frameFormats = [
  { value: 'png', label: 'PNG (无损)' },
  { value: 'jpg', label: 'JPG (压缩)' },
  { value: 'bmp', label: 'BMP (位图)' },
];

const audioFormats = [
  { value: 'mp3', label: 'MP3' },
  { value: 'aac', label: 'AAC' },
  { value: 'wav', label: 'WAV (无损)' },
  { value: 'flac', label: 'FLAC (无损)' },
];

const audioBitrates = [
  { value: 128, label: '128 kbps' },
  { value: 192, label: '192 kbps' },
  { value: 256, label: '256 kbps' },
  { value: 320, label: '320 kbps' },
];

const screenshotFormats = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
];

const gifWidthPresets = [
  { value: 0, label: '原始宽度' },
  { value: 320, label: '320px (小)' },
  { value: 480, label: '480px (中)' },
  { value: 640, label: '640px (大)' },
  { value: 854, label: '854px (480p)' },
  { value: 1280, label: '1280px (720p)' },
];

const isCustomWidth = (width: number) => {
  return width !== 0 && !gifWidthPresets.some(p => p.value === width);
};

type ExtractMode = 'interval' | 'frames' | 'timestamps';

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

function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(time, 10) || 0;
}

export default function ExtractModule() {
  const [files, setFiles] = useState<VideoInfo[]>([]);
  const [activeTab, setActiveTab] = useState('frames');
  
  const [extractMode, setExtractMode] = useState<ExtractMode>('interval');
  const [interval, setInterval] = useState(1);
  const [frameCount, setFrameCount] = useState(10);
  const [timestamps, setTimestamps] = useState('00:00:01,00:00:05,00:00:10');
  const [frameFormat, setFrameFormat] = useState('png');
  const [outputDir, setOutputDir] = useState('');
  
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifEnd, setGifEnd] = useState('00:00:05');
  const [gifFps, setGifFps] = useState(10);
  const [gifWidth, setGifWidth] = useState<number>(0);
  
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioBitrate, setAudioBitrate] = useState(192);
  
  const [screenshotTime, setScreenshotTime] = useState('00:00:01');
  const [screenshotFormat, setScreenshotFormat] = useState('png');
  
  const { showCommand, setCurrentModule } = useAppStore();
  const { addTask } = useTaskStore();

  const generateCommand = () => {
    if (files.length === 0) return '';
    const input = `"${files[0].path}"`;
    
    switch (activeTab) {
      case 'frames': {
        switch (extractMode) {
          case 'interval':
            return `ffmpeg -i ${input} -vf fps=1/${interval} output_%04d.${frameFormat}`;
          case 'frames':
            return `ffmpeg -i ${input} -vf fps=${frameCount}/1 output_%04d.${frameFormat}`;
          case 'timestamps': {
            const times = timestamps.split(',').filter(t => t.trim());
            return times.map((t, i) => `ffmpeg -ss ${t.trim()} -i ${input} -frames:v 1 output_${String(i + 1).padStart(4, '0')}.${frameFormat}`).join(' && ');
          }
          default:
            return '';
        }
      }
      case 'gif': {
        const gifDuration = timeToSeconds(gifEnd) - timeToSeconds(gifStart);
        const width = gifWidth || files[0].width || 480;
        return `ffmpeg -ss ${gifStart} -t ${gifDuration} -i ${input} -vf "fps=${gifFps},scale=${width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 output.gif`;
      }
      case 'audio': {
        const codecMap: Record<string, string> = {
          mp3: 'libmp3lame',
          aac: 'aac',
          wav: 'pcm_s16le',
          flac: 'flac',
        };
        return `ffmpeg -i ${input} -vn -acodec ${codecMap[audioFormat]}${audioFormat === 'mp3' ? ` -ab ${audioBitrate}k` : ''} output.${audioFormat}`;
      }
      case 'screenshot': {
        const times = screenshotTime.split(',').filter(t => t.trim());
        if (times.length === 1) {
          return `ffmpeg -ss ${screenshotTime} -i ${input} -frames:v 1 screenshot.${screenshotFormat}`;
        }
        return times.map((t, i) => `ffmpeg -ss ${t.trim()} -i ${input} -frames:v 1 screenshot_${String(i + 1).padStart(4, '0')}.${screenshotFormat}`).join(' && ');
      }
      default:
        return '';
    }
  };

  const command = generateCommand();

  const handleFilesSelected = (selectedFiles: VideoInfo[]) => {
    setFiles(selectedFiles);
    if (selectedFiles.length > 0 && selectedFiles[0].width > 0) {
      setGifWidth(selectedFiles[0].width);
    }
    message.success(`已选择 ${selectedFiles.length} 个文件`);
  };

  const handleSelectOutputDir = async () => {
    if (window.electronAPI?.fs?.selectFolder) {
      const path = await window.electronAPI.fs.selectFolder();
      if (path) {
        setOutputDir(path);
        message.success(`输出目录: ${path}`);
      }
    } else {
      message.info('请在文件管理器中选择输出目录');
    }
  };

  const handleExecute = () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    const baseName = files[0].name.replace(/\.[^.]+$/, '');
    const inputDir = files[0].path.substring(0, files[0].path.lastIndexOf(/[/\\]/.test(files[0].path) ? (files[0].path.includes('\\') ? '\\' : '/') : '/'));
    
    let outputPath: string;
    let filterSimple: string | undefined;
    
    switch (activeTab) {
      case 'gif': {
        const gifDuration = timeToSeconds(gifEnd) - timeToSeconds(gifStart);
        outputPath = outputDir ? `${outputDir}/${baseName}.gif` : `${inputDir}/${baseName}.gif`;
        filterSimple = getGifFilter();
        addTask({
          type: 'extract-gif',
          inputPath: files[0].path,
          outputPath,
          command,
          inputArgs: ['-ss', gifStart, '-t', String(gifDuration)],
          filterSimple,
        });
        break;
      }
      case 'frames': {
        outputPath = outputDir 
          ? `${outputDir}/${baseName}_%04d.${frameFormat}`
          : `${inputDir}/${baseName}_%04d.${frameFormat}`;
        switch (extractMode) {
          case 'interval':
            filterSimple = `fps=1/${interval}`;
            break;
          case 'frames':
            filterSimple = `fps=${frameCount}`;
            break;
          case 'timestamps':
            filterSimple = undefined;
            break;
        }
        addTask({
          type: 'extract-frames',
          inputPath: files[0].path,
          outputPath,
          command,
          filterSimple,
        });
        break;
      }
      case 'audio': {
        const codecMap: Record<string, string> = {
          mp3: 'libmp3lame',
          aac: 'aac',
          wav: 'pcm_s16le',
          flac: 'flac',
        };
        outputPath = outputDir ? `${outputDir}/${baseName}.${audioFormat}` : `${inputDir}/${baseName}.${audioFormat}`;
        const audioArgs = ['-vn', '-acodec', codecMap[audioFormat]];
        if (audioFormat === 'mp3') {
          audioArgs.push('-ab', `${audioBitrate}k`);
        }
        addTask({
          type: 'extract-audio',
          inputPath: files[0].path,
          outputPath,
          command,
          args: audioArgs,
        });
        break;
      }
      case 'screenshot': {
        const times = screenshotTime.split(',').filter(t => t.trim());
        if (times.length === 1) {
          outputPath = outputDir 
            ? `${outputDir}/${baseName}_screenshot.${screenshotFormat}`
            : `${inputDir}/${baseName}_screenshot.${screenshotFormat}`;
          addTask({
            type: 'extract-screenshot',
            inputPath: files[0].path,
            outputPath,
            command,
            inputArgs: ['-ss', times[0].trim()],
            args: ['-frames:v', '1'],
          });
        } else {
          times.forEach((t, i) => {
            const fileName = `${baseName}_screenshot_${String(i + 1).padStart(4, '0')}.${screenshotFormat}`;
            outputPath = outputDir 
              ? `${outputDir}/${fileName}`
              : `${inputDir}/${fileName}`;
            addTask({
              type: 'extract-screenshot',
              inputPath: files[0].path,
              outputPath,
              command,
              inputArgs: ['-ss', t.trim()],
              args: ['-frames:v', '1'],
            });
          });
        }
        break;
      }
    }

    message.success('已添加到任务队列');
    setOutputDir('');
    setCurrentModule('queue');
  };

  const handleReset = () => {
    setFiles([]);
    setOutputDir('');
  };

const estimateGifSize = () => {
    const duration = timeToSeconds(gifEnd) - timeToSeconds(gifStart);
    if (duration <= 0) return '计算中..';
    const width = gifWidth || (files.length > 0 ? files[0].width : 480);
    const frames = duration * gifFps;
    const estimatedBytes = frames * width * (width * 9 / 16) * 0.5;
    if (estimatedBytes < 1024) return `${estimatedBytes.toFixed(0)} B`;
    if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`;
    if (estimatedBytes < 1024 * 1024 * 1024) return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(estimatedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

const getGifFilter = () => {
    const width = gifWidth || (files.length > 0 ? files[0].width : 480);
    return `fps=${gifFps},scale=${width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
  };

  const tabItems = [
    {
      key: 'frames',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Image size={16} />
          提取帧        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#134E4A' }}>
              提取模式
            </label>
            <Radio.Group value={extractMode} onChange={(e) => setExtractMode(e.target.value)}>
              <Radio.Button value="interval">按时间间隔</Radio.Button>
              <Radio.Button value="frames">按帧数</Radio.Button>
              <Radio.Button value="timestamps">按时间点</Radio.Button>
            </Radio.Group>
          </div>
          
          {extractMode === 'interval' && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                时间间隔 (秒)
              </label>
              <InputNumber
                value={interval}
                onChange={(v) => setInterval(v || 1)}
                min={0.1}
                max={3600}
                step={0.5}
                style={{ width: '100%' }}
                addonAfter="秒"
              />
            </div>
          )}
          {extractMode === 'frames' && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                每秒提取帧数
              </label>
              <InputNumber
                value={frameCount}
                onChange={(v) => setFrameCount(v || 10)}
                min={1}
                max={60}
                style={{ width: '100%' }}
                addonAfter="帧/s"
              />
            </div>
          )}
          {extractMode === 'timestamps' && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                时间点(逗号分隔)
              </label>
              <Input
                value={timestamps}
                onChange={(e) => setTimestamps(e.target.value)}
                placeholder="00:00:01,00:00:05,00:00:10"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出格式
              </label>
              <Select value={frameFormat} onChange={setFrameFormat} options={frameFormats} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出目录
              </label>
              <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%' }}>
                {outputDir || '选择目录'}
              </Button>
            </div>
          </div>
        </Space>
      ),
    },
    {
      key: 'gif',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Film size={16} />
          生成GIF
        </span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <TimeRangePicker
            startTime={gifStart}
            endTime={gifEnd}
            onStartChange={setGifStart}
            onEndChange={setGifEnd}
            maxDuration={files.length > 0 ? Math.ceil(files[0].duration) || 60 : 60}
          />
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                FPS (帧率)
              </label>
              <InputNumber
                value={gifFps}
                onChange={(v) => setGifFps(v || 10)}
                min={1}
                max={30}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                宽度 {files.length > 0 && <span style={{ color: '#94A3B8' }}>(原宽: {files[0].width}px)</span>}
              </label>
              <Select
                value={isCustomWidth(gifWidth) ? 'custom' : gifWidth}
                onChange={(v) => {
                  if (v === 'custom') {
                    setGifWidth(files.length > 0 ? files[0].width : 480);
                  } else {
                    setGifWidth(v as number);
                  }
                }}
                options={[
                  ...gifWidthPresets,
                  { value: 'custom', label: '自定义...' },
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          {isCustomWidth(gifWidth) && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                自定义宽度 (px)
              </label>
              <InputNumber
                value={gifWidth}
                onChange={(v) => {
                  if (v && v > 0) {
                    setGifWidth(v);
                  }
                }}
                min={100}
                max={3840}
                step={10}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出目录
            </label>
            <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
              {outputDir || '默认保存到源文件目录'}
            </Button>
          </div>
          
          <div style={{ padding: 12, background: '#F0FDFA', borderRadius: 8, border: '1px solid #99F6E4' }}>
            <Typography.Text style={{ color: '#0D9488', fontSize: 12 }}>
              预估文件大小: {estimateGifSize()} (高度将自动计算)
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      key: 'audio',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Music size={16} />
          提取音频
        </span>
      ),
children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500, color: '#134E4A' }}>
              时间选择
            </label>
            {files.length > 0 ? (
              <ScreenshotTimeSelector
                duration={files[0].duration}
                value={screenshotTime}
                onChange={setScreenshotTime}
              />
            ) : (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                color: '#94A3B8',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px dashed #E2E8F0',
              }}>
                请先选择视频文件
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出格式
              </label>
              <Select value={audioFormat} onChange={setAudioFormat} options={audioFormats} style={{ width: '100%' }} />
            </div>
            {audioFormat === 'mp3' && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                  音频质量
                </label>
                <Select value={audioBitrate} onChange={setAudioBitrate} options={audioBitrates} style={{ width: '100%' }} />
              </div>
            )}
          </div>
          
          {audioFormat === 'mp3' && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#64748B' }}>
                码率调节
              </label>
              <Slider
                value={audioBitrate}
                onChange={setAudioBitrate}
                min={128}
                max={320}
                step={64}
                marks={{
                  128: '128k',
                  192: '192k',
                  256: '256k',
                  320: '320k',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出目录
            </label>
            <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
              {outputDir || '默认保存到源文件目录'}
            </Button>
          </div>
          
          <div style={{ padding: 12, background: '#F0FDFA', borderRadius: 8, border: '1px solid #99F6E4' }}>
            <Typography.Text style={{ color: '#0D9488', fontSize: 12 }}>
{audioFormat === 'wav' || audioFormat === 'flac' 
                ? '无损格式将保留原始音频质量'
                : `当前设置: ${audioBitrate}kbps 码率`}
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      key: 'screenshot',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={16} />
          视频截图
        </span>
      ),
children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500, color: '#134E4A' }}>
              时间选择
            </label>
            {files.length > 0 ? (
              <ScreenshotTimeSelector
                duration={files[0].duration}
                value={screenshotTime}
                onChange={setScreenshotTime}
              />
            ) : (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                color: '#94A3B8',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px dashed #E2E8F0',
              }}>
                请先选择视频文件
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出格式
              </label>
              <Select value={screenshotFormat} onChange={setScreenshotFormat} options={screenshotFormats} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
                输出目录
              </label>
              <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%' }}>
                {outputDir || '选择目录'}
              </Button>
            </div>
          </div>
        </Space>
      ),
    },
  ];

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
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <CommandPreview command={command} visible={showCommand} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={handleReset} disabled={!hasFile}>重置</Button>
          <Button type="primary" onClick={handleExecute} disabled={!hasFile}>
            开始提取
          </Button>
        </div>
      </Card>
    </div>
  );
}
