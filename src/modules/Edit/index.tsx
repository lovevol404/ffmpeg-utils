import { useState, useMemo, useEffect } from 'react';
import { Tabs, Select, Slider, Button, Card, Space, message, List, Input, Modal, Descriptions, Alert } from 'antd';
import { Scissors, Merge, Droplet, Subtitles, GripVertical, X, Eye, FolderOpen } from 'lucide-react';
import { FileDrop } from '@/components/FileDrop';
import { CommandPreview } from '@/components/CommandPreview';
import { TimeRangePicker } from '@/components/TimeRangePicker/TimeRangePicker';
import { VideoPreviewButton } from '@/components/VideoPreview/VideoPreview';
import { useAppStore } from '@/stores/appStore';
import { useTaskStore } from '@/stores/taskStore';
import type { VideoInfo } from '@/types';

type WatermarkPosition = 'topLeft' | 'top' | 'topRight' | 'left' | 'center' | 'right' | 'bottomLeft' | 'bottom' | 'bottomRight';

const positionOptions: { value: WatermarkPosition; label: string }[] = [
  { value: 'topLeft', label: '左上' },
  { value: 'top', label: '顶部居中' },
  { value: 'topRight', label: '右上' },
  { value: 'left', label: '左侧居中' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右侧居中' },
  { value: 'bottomLeft', label: '左下' },
  { value: 'bottom', label: '底部居中' },
  { value: 'bottomRight', label: '右下' },
];

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(time, 10) || 0;
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

function getOverlayPosition(position: WatermarkPosition, videoWidth: number = 1920, videoHeight: number = 1080, wmWidth: number = 100, wmHeight: number = 100): { x: number; y: number } {
  const positions: Record<WatermarkPosition, { x: number; y: number }> = {
    topLeft: { x: 10, y: 10 },
    top: { x: (videoWidth - wmWidth) / 2, y: 10 },
    topRight: { x: videoWidth - wmWidth - 10, y: 10 },
    left: { x: 10, y: (videoHeight - wmHeight) / 2 },
    center: { x: (videoWidth - wmWidth) / 2, y: (videoHeight - wmHeight) / 2 },
    right: { x: videoWidth - wmWidth - 10, y: (videoHeight - wmHeight) / 2 },
    bottomLeft: { x: 10, y: videoHeight - wmHeight - 10 },
    bottom: { x: (videoWidth - wmWidth) / 2, y: videoHeight - wmHeight - 10 },
    bottomRight: { x: videoWidth - wmWidth - 10, y: videoHeight - wmHeight - 10 },
  };
  return positions[position];
}

function TrimPanel() {
  const [files, setFiles] = useState<VideoInfo[]>([]);
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:10');
  const [outputDir, setOutputDir] = useState<string>('');
  const { showCommand, setCurrentModule } = useAppStore();
  const { addTask } = useTaskStore();

  const videoDuration = files.length > 0 ? files[0].duration : 600;
  const duration = parseTimeToSeconds(endTime) - parseTimeToSeconds(startTime);

  const command = files.length > 0
    ? `ffmpeg -ss ${startTime} -to ${endTime} -i "${files[0].path}" -c copy output.mp4`
    : '';

  const handleFilesSelected = (selectedFiles: VideoInfo[]) => {
    setFiles(selectedFiles);
    message.success(`已选择: ${selectedFiles[0].name}`);
  };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI?.fs?.selectFolder) return;
    const dir = await window.electronAPI.fs.selectFolder();
    if (dir) {
      setOutputDir(dir);
      message.success(`输出目录: ${dir}`);
    }
  };

  const handleTrim = () => {
    if (files.length === 0) {
      message.warning('请先选择视频文件');
      return;
    }
    if (duration <= 0) {
      message.warning('请设置有效的时间范围');
      return;
    }

    const baseName = files[0].name.replace(/\.[^.]+$/, '');
    const outputFileName = `${baseName}_trimmed.mp4`;
    const outputPath = outputDir ? `${outputDir}/${outputFileName}` : files[0].path.replace(/\.[^.]+$/, '_trimmed.mp4');
    
    addTask({
      type: 'edit-trim',
      inputPath: files[0].path,
      outputPath,
      command,
    });
    message.success('已添加到任务队列');
    setFiles([]);
    setOutputDir('');
    setStartTime('00:00:00');
    setEndTime('00:00:10');
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
        
        {hasFile && (
          <p style={{ marginBottom: 16, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>已选择: {files[0].name}</span>
            <VideoPreviewButton videoInfo={files[0]} />
          </p>
        )}
        
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <TimeRangePicker
            startTime={startTime}
            endTime={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
            maxDuration={videoDuration || 600}
          />

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出目录
            </label>
            <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
              {outputDir || '默认保存到源文件目录'}
            </Button>
          </div>

          <CommandPreview command={command} visible={showCommand} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => { setFiles([]); setOutputDir(''); }} disabled={!hasFile}>重置</Button>
            <Button type="primary" onClick={handleTrim} disabled={!hasFile}>开始裁剪</Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}

function MergePanel() {
  const [files, setFiles] = useState<VideoInfo[]>([]);
  const [outputDir, setOutputDir] = useState<string>('');
  const [outputFileName, setOutputFileName] = useState<string>('');
  const { showCommand, setCurrentModule } = useAppStore();
  const { addTask } = useTaskStore();

  const outputFormat = 'mp4';

  const checkCompatibility = () => {
    if (files.length < 2) return { compatible: true, issues: [] };
    
    const issues: string[] = [];
    const firstFile = files[0];
    
    const sameResolution = files.every(f => 
      f.width === firstFile.width && f.height === firstFile.height
    );
    const sameCodec = files.every(f => f.codec === firstFile.codec);
    const sameFps = files.every(f => Math.abs(f.fps - firstFile.fps) < 0.1);
    
    if (!sameResolution) {
      issues.push('分辨率不一致');
    }
    if (!sameCodec) {
      issues.push('编码格式不一致');
    }
    if (!sameFps) {
      issues.push('帧率不一致');
    }
    
    return { compatible: issues.length === 0, issues };
  };

  const compatibility = checkCompatibility();

  const generateMergeCommand = () => {
    if (files.length < 2) return '';
    
    const fileListContent = files.map(f => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');
    return `ffmpeg -f concat -safe 0 -i <filelist.txt> -c copy "${outputFileName || 'output_merged.mp4'}"\n\nfilelist.txt 内容:\n${fileListContent}`;
  };

  const command = generateMergeCommand();

  useEffect(() => {
    if (files.length > 0) {
      setOutputFileName(`output_merged.${outputFormat}`);
    }
  }, [files]);

  const handleFilesSelected = (selectedFiles: VideoInfo[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
    message.success(`已添�?${selectedFiles.length} 个文件`);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles;
    });
  };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI?.fs?.selectFolder) return;
    const dir = await window.electronAPI.fs.selectFolder();
    if (dir) {
      setOutputDir(dir);
      message.success(`输出目录: ${dir}`);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      message.warning('请至少选择2个视频文件');
      return;
    }

    if (!compatibility.compatible) {
      Modal.warning({
        title: '视频参数不一致',
        content: (
          <div>
            <p>以下参数不一致，可能导致拼接失败或质量问题：</p>
            <ul>{compatibility.issues.map(i => <li key={i}>{i}</li>)}</ul>
            <p>建议使用相同编码、分辨率和帧率的视频文件。</p>
          </div>
        ),
      });
      return;
    }

    const finalFileName = outputFileName || `output_merged.${outputFormat}`;
    const inputDir = files[0].path.substring(0, files[0].path.lastIndexOf(/[/\\]/.test(files[0].path) ? (files[0].path.includes('\\') ? '\\' : '/') : '/'));
    const outputPath = outputDir ? `${outputDir}/${finalFileName}` : `${inputDir}/${finalFileName}`;

    const concatFileList = files.map(f => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');

    addTask({
      type: 'edit-merge',
      inputPath: files[0].path,
      outputPath,
      command,
      concatFileList,
    });
    message.success('已添加到任务队列');
    setFiles([]);
    setOutputDir('');
    setCurrentModule('queue');
  };

  function formatSize(bytes: number): string {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  const hasFile = files.length > 0;

  return (
    <div>
      <FileDrop onFilesSelected={handleFilesSelected} multiple />
      
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
            请选择多个视频文件进行拼接（至少2个）
          </div>
        )}
        
        {hasFile && (
          <>
            {!compatibility.compatible && files.length >= 2 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="视频参数不一致"
                description={
                  <span>
                    检测到: {compatibility.issues.join('、')}。仅支持相同编码、分辨率、帧率的视频拼接。
                  </span>
                }
              />
            )}
            
            {compatibility.compatible && files.length >= 2 && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message="视频参数一致，可以进行无损拼接"
              />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: '#64748B' }}>已选择 {files.length} 个文件(拖拽调整顺序)</span>
              <Button size="small" onClick={() => setFiles([])}>清空</Button>
            </div>
            
            <List
              dataSource={files}
              renderItem={(file, index) => (
                <List.Item
                  style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, marginBottom: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <VideoPreviewButton videoInfo={file} />
                    <GripVertical size={16} color="#94A3B8" style={{ cursor: 'grab' }} />
                    <span style={{ flex: 1, color: '#134E4A', fontWeight: 500 }}>{file.name}</span>
                    <span style={{ color: '#64748B', fontSize: 12 }}>{formatSize(file.size)}</span>
                    <Space size={4}>
                      <Button size="small" disabled={index === 0} onClick={() => handleMoveUp(index)}>↑</Button>
                      <Button size="small" disabled={index === files.length - 1} onClick={() => handleMoveDown(index)}>↓</Button>
                      <Button size="small" danger icon={<X size={14} />} onClick={() => handleRemoveFile(index)} />
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出文件名
            </label>
            <Input 
              value={outputFileName} 
              onChange={(e) => setOutputFileName(e.target.value)} 
              placeholder={`output_merged.${outputFormat}`}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出目录
            </label>
            <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
              {outputDir || '选择输出目录'}
            </Button>
          </div>
        </div>

        <CommandPreview command={command} visible={showCommand} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => { setFiles([]); setOutputDir(''); }} disabled={!hasFile}>重置</Button>
          <Button type="primary" onClick={handleMerge} disabled={files.length < 2}>开始拼接</Button>
        </div>
      </Card>
    </div>
  );
}

function WatermarkPanel() {
  const [videoFiles, setVideoFiles] = useState<VideoInfo[]>([]);
  const [watermarkPath, setWatermarkPath] = useState<string>('');
  const [watermarkName, setWatermarkName] = useState<string>('');
  const [position, setPosition] = useState<WatermarkPosition>('bottomRight');
  const [opacity, setOpacity] = useState(1);
  const [outputDir, setOutputDir] = useState<string>('');
  const { showCommand, setCurrentModule } = useAppStore();
  const { addTask } = useTaskStore();

  const overlayPos = useMemo(() => getOverlayPosition(position), [position]);

  const filterComplex = useMemo(() => {
    if (opacity < 1) {
      return `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${overlayPos.x}:${overlayPos.y}`;
    }
    return `overlay=${overlayPos.x}:${overlayPos.y}`;
  }, [opacity, overlayPos]);

  const command = videoFiles.length > 0 && watermarkPath
    ? `ffmpeg -i "${videoFiles[0].path}" -i "${watermarkPath}" -filter_complex "${filterComplex}" output.mp4`
    : '';

  const handleVideoSelected = (files: VideoInfo[]) => {
    setVideoFiles(files);
    message.success(`已选择: ${files[0].name}`);
  };

  const handleSelectWatermark = async () => {
    if (!window.electronAPI?.fs?.selectFile) return;
    const paths = await window.electronAPI.fs.selectFile('image');
    if (paths && paths.length > 0) {
      setWatermarkPath(paths[0]);
      setWatermarkName(paths[0].split(/[/\\]/).pop() || paths[0]);
      message.success(`已选择水印: ${paths[0].split(/[/\\]/).pop()}`);
    }
  };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI?.fs?.selectFolder) return;
    const dir = await window.electronAPI.fs.selectFolder();
    if (dir) {
      setOutputDir(dir);
      message.success(`输出目录: ${dir}`);
    }
  };

  const handleAddWatermark = () => {
    if (videoFiles.length === 0) {
      message.warning('请先选择视频文件');
      return;
    }
    if (!watermarkPath) {
      message.warning('请选择水印图片');
      return;
    }

    const baseName = videoFiles[0].name.replace(/\.[^.]+$/, '');
    const outputFileName = `${baseName}_watermarked.mp4`;
    const outputPath = outputDir ? `${outputDir}/${outputFileName}` : videoFiles[0].path.replace(/\.[^.]+$/, '_watermarked.mp4');
    
    addTask({
      type: 'edit-watermark',
      inputPath: videoFiles[0].path,
      outputPath,
      command,
      extraInputs: [watermarkPath],
      filterComplex,
    });
    message.success('已添加到任务队列');
    setVideoFiles([]);
    setWatermarkPath('');
    setWatermarkName('');
    setPosition('bottomRight');
    setOpacity(1);
    setOutputDir('');
    setCurrentModule('queue');
  };

  const hasFile = videoFiles.length > 0 && watermarkPath;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#134E4A', fontWeight: 500 }}>
          视频文件
        </label>
        <FileDrop onFilesSelected={handleVideoSelected} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#134E4A', fontWeight: 500 }}>
          水印图片
        </label>
        <Button onClick={handleSelectWatermark} style={{ width: '100%', height: 56, border: '2px dashed #E2E8F0' }}>
          {watermarkName || '点击选择水印图片'}
        </Button>
      </div>

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
            请先选择视频文件和水印图片
          </div>
        )}
        
        {videoFiles.length > 0 && watermarkPath && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {videoFiles[0].name}
                  <VideoPreviewButton videoInfo={videoFiles[0]} />
                </span>
              }
              size="small"
              column={4}
              bordered
              style={{ marginBottom: 16 }}
              items={[
                { label: '时长', children: formatDuration(videoFiles[0].duration) },
                { label: '大小', children: formatSize(videoFiles[0].size) },
                { label: '分辨率', children: videoFiles[0].width ? `${videoFiles[0].width} x ${videoFiles[0].height}` : '-' },
                { label: '编码', children: videoFiles[0].codec || '-' },
                { label: '码率', children: formatBitrate(videoFiles[0].bitrate) },
                { label: '帧率', children: videoFiles[0].fps ? `${videoFiles[0].fps.toFixed(2)} fps` : '-' },
              ]}
            />
            <p style={{ color: '#64748B', marginTop: 8 }}>
              水印: {watermarkName}
            </p>
          </div>
        )}

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              水印位置
            </label>
            <Select
              value={position}
              onChange={setPosition}
              options={positionOptions}
              style={{ width: '100%' }}
            />
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 4, 
              marginTop: 8,
              maxWidth: 200 
            }}>
              {positionOptions.map((pos) => (
                <div
                  key={pos.value}
                  onClick={() => setPosition(pos.value)}
                  style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    background: position === pos.value ? '#0D9488' : '#F0FDFA',
                    color: position === pos.value ? '#FFFFFF' : '#134E4A',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11,
                    transition: 'all 0.2s',
                  }}
                >
                  {pos.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              透明度: {opacity.toFixed(2)}
            </label>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={setOpacity}
              tooltip={{ formatter: (v) => v?.toFixed(2) }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
              输出目录
            </label>
            <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
              {outputDir || '默认保存到源文件目录'}
            </Button>
          </div>

          <CommandPreview command={command} visible={showCommand} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => { setVideoFiles([]); setWatermarkPath(''); setWatermarkName(''); setOutputDir(''); }} disabled={!hasFile}>重置</Button>
            <Button type="primary" onClick={handleAddWatermark} disabled={!hasFile}>添加水印</Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}

function SubtitlePanel() {
  const [videoFiles, setVideoFiles] = useState<VideoInfo[]>([]);
  const [subtitlePath, setSubtitlePath] = useState<string>('');
  const [subtitleName, setSubtitleName] = useState<string>('');
  const [subtitleContent, setSubtitleContent] = useState<string>('');
  const [outputDir, setOutputDir] = useState<string>('');
  const { showCommand, setCurrentModule } = useAppStore();
  const { addTask } = useTaskStore();

  const command = videoFiles.length > 0 && subtitlePath
    ? `ffmpeg -i "${videoFiles[0].path}" -vf "subtitles=${subtitlePath}" output.mp4`
    : '';

  const handleVideoSelected = (files: VideoInfo[]) => {
    setVideoFiles(files);
    message.success(`已选择: ${files[0].name}`);
  };

  const handleSelectSubtitle = async () => {
    if (!window.electronAPI?.fs?.selectFile) return;
    const paths = await window.electronAPI.fs.selectFile();
    if (paths && paths.length > 0) {
      const path = paths[0];
      setSubtitlePath(path);
      setSubtitleName(path.split(/[/\\]/).pop() || path);
      message.success(`已选择字幕: ${path.split(/[/\\]/).pop()}`);
    }
  };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI?.fs?.selectFolder) return;
    const dir = await window.electronAPI.fs.selectFolder();
    if (dir) {
      setOutputDir(dir);
      message.success(`输出目录: ${dir}`);
    }
  };

  const handleAddSubtitle = () => {
    if (videoFiles.length === 0) {
      message.warning('请先选择视频文件');
      return;
    }
    if (!subtitlePath) {
      message.warning('请选择字幕文件');
      return;
    }

    const baseName = videoFiles[0].name.replace(/\.[^.]+$/, '');
    const outputFileName = `${baseName}_subtitled.mp4`;
    const outputPath = outputDir ? `${outputDir}/${outputFileName}` : videoFiles[0].path.replace(/\.[^.]+$/, '_subtitled.mp4');
    
    addTask({
      type: 'edit-subtitle',
      inputPath: videoFiles[0].path,
      outputPath,
      command,
    });
    message.success('已添加到任务队列');
    setVideoFiles([]);
    setSubtitlePath('');
    setSubtitleName('');
    setSubtitleContent('');
    setOutputDir('');
    setCurrentModule('queue');
  };

  const hasFile = videoFiles.length > 0 && subtitlePath;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#134E4A', fontWeight: 500 }}>
          视频文件
        </label>
        <FileDrop onFilesSelected={handleVideoSelected} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#134E4A', fontWeight: 500 }}>
          字幕文件 (SRT/ASS)
        </label>
        <Button onClick={handleSelectSubtitle} style={{ width: '100%', height: 56, border: '2px dashed #E2E8F0' }}>
          {subtitleName || '点击选择字幕文件'}
        </Button>
      </div>

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
            请先选择视频文件和字幕文件
          </div>
        )}
        
        {videoFiles.length > 0 && subtitlePath && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {videoFiles[0].name}
                  <VideoPreviewButton videoInfo={videoFiles[0]} />
                </span>
              }
              size="small"
              column={4}
              bordered
              style={{ marginBottom: 16 }}
              items={[
                { label: '时长', children: formatDuration(videoFiles[0].duration) },
                { label: '大小', children: formatSize(videoFiles[0].size) },
                { label: '分辨率', children: videoFiles[0].width ? `${videoFiles[0].width} x ${videoFiles[0].height}` : '-' },
                { label: '编码', children: videoFiles[0].codec || '-' },
                { label: '码率', children: formatBitrate(videoFiles[0].bitrate) },
                { label: '帧率', children: videoFiles[0].fps ? `${videoFiles[0].fps.toFixed(2)} fps` : '-' },
              ]}
            />
            <p style={{ color: '#64748B', marginTop: 8 }}>
              字幕: {subtitleName}
            </p>
          </div>
        )}

        {subtitleContent && hasFile && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 8,
              color: '#64748B',
              fontSize: 12 
            }}>
              <Eye size={14} />
              <span>字幕预览</span>
            </div>
            <pre style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              maxHeight: 200,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {subtitleContent}
            </pre>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
            输出目录
          </label>
          <Button onClick={handleSelectOutputDir} icon={<FolderOpen size={16} />} style={{ width: '100%', textAlign: 'left' }}>
            {outputDir || '默认保存到源文件目录'}
          </Button>
        </div>

        <CommandPreview command={command} visible={showCommand} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => { setVideoFiles([]); setSubtitlePath(''); setSubtitleName(''); setSubtitleContent(''); setOutputDir(''); }} disabled={!hasFile}>重置</Button>
          <Button type="primary" onClick={handleAddSubtitle} disabled={!hasFile}>添加字幕</Button>
        </div>
      </Card>
    </div>
  );
}

export default function EditModule() {
  const items = [
    {
      key: 'trim',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scissors size={16} />
          裁剪视频
        </span>
      ),
      children: <TrimPanel />,
    },
    {
      key: 'merge',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Merge size={16} />
          拼接视频
        </span>
      ),
      children: <MergePanel />,
    },
    {
      key: 'watermark',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Droplet size={16} />
          添加水印
        </span>
      ),
      children: <WatermarkPanel />,
    },
    {
      key: 'subtitle',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Subtitles size={16} />
          添加字幕
        </span>
      ),
      children: <SubtitlePanel />,
    },
  ];

  return (
    <div>
      <Tabs 
        defaultActiveKey="trim" 
        items={items}
        style={{ marginBottom: 24 }}
      />
    </div>
  );
}
