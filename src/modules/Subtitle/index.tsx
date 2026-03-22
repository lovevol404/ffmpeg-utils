import { useState, useEffect } from 'react';
import { Card, Button, Select, Progress, message, Space, Typography, Alert, Spin } from 'antd';
import { FileText, FolderOpen, Mic, Languages, Cpu, FileOutput } from 'lucide-react';
import type { TranscribeProgress } from '@/types/ai';

const { Text, Title } = Typography;

const subtitleLanguages = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'ja', label: '日文' },
  { value: 'ko', label: '韩文' },
  { value: 'fr', label: '法文' },
  { value: 'de', label: '德文' },
  { value: 'es', label: '西班牙文' },
];

const whisperModels = [
  { value: 'tiny', label: 'Tiny (最快，~1GB显存)' },
  { value: 'base', label: 'Base (推荐，~1GB显存)' },
  { value: 'small', label: 'Small (较好，~2GB显存)' },
  { value: 'medium', label: 'Medium (很好，~5GB显存)' },
  { value: 'large-v3', label: 'Large-v3 (最好，~10GB显存)' },
];

const subtitleFormats = [
  { value: 'srt', label: 'SRT (通用)' },
  { value: 'vtt', label: 'WebVTT (网页)' },
  { value: 'ass', label: 'ASS (高级样式)' },
];

interface AudioFileInfo {
  path: string;
  name: string;
  size: number;
  duration?: number;
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

export default function SubtitleModule() {
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null);
  const [outputDir, setOutputDir] = useState('');
  const [subtitleLanguage, setSubtitleLanguage] = useState('auto');
  const [subtitleModel, setSubtitleModel] = useState('base');
  const [subtitleFormat, setSubtitleFormat] = useState('srt');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState<TranscribeProgress | null>(null);

  useEffect(() => {
    if (window.electronAPI?.ai?.onTranscribeProgress) {
      window.electronAPI.ai.onTranscribeProgress((progress: TranscribeProgress) => {
        setTranscribeProgress(progress);
      });
    }
    return () => {
      window.electronAPI?.ai?.removeTranscribeProgressListener?.();
    };
  }, []);

  const handleSelectAudioFile = async () => {
    const result = await window.electronAPI?.fs?.selectFile('audio');
    if (result && result.length > 0) {
      const filePath = result[0];
      const fileName = filePath.split(/[/\\]/).pop() || '';
      const fileInfo = await window.electronAPI?.fs?.getFileInfo(filePath);
      
      let duration: number | undefined;
      try {
        const videoInfo = await window.electronAPI?.ffmpeg?.getVideoInfo(filePath);
        duration = videoInfo?.duration;
      } catch {
        // Ignore if we can't get duration
      }
      
      setAudioFile({
        path: filePath,
        name: fileName,
        size: fileInfo?.size || 0,
        duration,
      });
      setOutputDir('');
    }
  };

  const handleSelectOutputDir = async () => {
    const result = await window.electronAPI?.fs?.selectFolder();
    if (result) {
      setOutputDir(result);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      message.warning('请先选择音频文件');
      return;
    }

    const baseName = audioFile.name.replace(/\.[^.]+$/, '');
    const inputDir = audioFile.path.substring(0, audioFile.path.lastIndexOf(/[/\\]/.test(audioFile.path) ? (audioFile.path.includes('\\') ? '\\' : '/') : '/'));
    const outputPath = outputDir 
      ? `${outputDir}/${baseName}.${subtitleFormat}`
      : `${inputDir}/${baseName}.${subtitleFormat}`;

    setTranscribing(true);
    setTranscribeProgress(null);

    try {
      const status = await window.electronAPI?.ai?.status();
      if (!status?.running) {
        const startResult = await window.electronAPI?.ai?.start();
        if (!startResult?.success) {
          message.error('无法启动AI服务');
          setTranscribing(false);
          return;
        }
      }

      console.log('[Subtitle] Starting transcription for:', audioFile.path);

      const result = await window.electronAPI?.ai?.transcribe({
        videoPath: audioFile.path,
        outputPath,
        language: subtitleLanguage === 'auto' ? undefined : subtitleLanguage,
        modelSize: subtitleModel as 'tiny' | 'base' | 'small' | 'medium' | 'large-v3',
        outputFormat: subtitleFormat as 'srt' | 'vtt' | 'ass',
      });

      console.log('[Subtitle] Result:', result);

      if (result?.success && result.data) {
        const data = result.data as {
          outputPath?: string;
          language?: string;
          segmentsCount?: number;
        };
        message.success(`字幕提取成功: ${data.outputPath || '未知路径'}`);
        if (data.language) {
          message.info(`检测语言: ${data.language}, 片段数: ${data.segmentsCount || 0}`);
        }
        if (data.outputPath) {
          window.electronAPI?.fs?.showItemInFolder(data.outputPath);
        }
      } else {
        const errorDetail = result?.error || '未知错误，请查看控制台日志';
        console.error('[Subtitle] Failed:', errorDetail);
        message.error(`字幕提取失败: ${errorDetail}`);
      }
    } catch (err) {
      console.error('[Subtitle] Exception:', err);
      message.error(`字幕提取出错: ${(err as Error).message}`);
    } finally {
      setTranscribing(false);
      setTranscribeProgress(null);
      setOutputDir('');
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setOutputDir('');
    setTranscribeProgress(null);
  };

  const getProgressPercent = () => {
    if (!transcribeProgress) return 0;
    return Math.round(transcribeProgress.progress * 100);
  };

  const getProgressMessage = () => {
    if (!transcribeProgress) return '';
    
    switch (transcribeProgress.status) {
      case 'extracting_audio':
        return '正在提取音频...';
      case 'loading_model':
        return `正在加载 ${subtitleModel} 模型...`;
      case 'transcribing':
        if (transcribeProgress.totalTime > 0) {
          return `正在转录: ${formatDuration(transcribeProgress.currentTime)} / ${formatDuration(transcribeProgress.totalTime)}`;
        }
        return '正在转录音频...';
      case 'saving':
        return '正在保存字幕文件...';
      case 'completed':
        return '转录完成!';
      default:
        return transcribeProgress.message || '处理中...';
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>
          <FileText size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          字幕提取
        </Title>

        <Alert
          type="info"
          showIcon
          message="使用 Whisper AI 从音频文件中提取字幕"
          description="支持 MP3、WAV、AAC、FLAC 等常见音频格式。首次使用需要下载模型，请耐心等待。"
          style={{ marginBottom: 24 }}
        />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" title={<><Mic size={16} style={{ marginRight: 8 }} />音频文件</>}>
            <Space>
              <Button onClick={handleSelectAudioFile} disabled={transcribing}>
                选择音频文件
              </Button>
              {audioFile && (
                <Button type="text" onClick={handleReset} disabled={transcribing}>
                  清除
                </Button>
              )}
            </Space>
            {audioFile && (
              <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                <Text strong>{audioFile.name}</Text>
                <br />
                <Text type="secondary">
                  大小: {formatSize(audioFile.size)}
                  {audioFile.duration && ` | 时长: ${formatDuration(audioFile.duration)}`}
                </Text>
              </div>
            )}
          </Card>

          {audioFile && (
            <>
              <Card size="small" title={<><Languages size={16} style={{ marginRight: 8 }} />语言设置</>}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>音频语言</Text>
                    <Select
                      value={subtitleLanguage}
                      onChange={setSubtitleLanguage}
                      options={subtitleLanguages}
                      style={{ width: 160 }}
                      disabled={transcribing}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>输出格式</Text>
                    <Select
                      value={subtitleFormat}
                      onChange={setSubtitleFormat}
                      options={subtitleFormats}
                      style={{ width: 160 }}
                      disabled={transcribing}
                    />
                  </div>
                </div>
              </Card>

              <Card size="small" title={<><Cpu size={16} style={{ marginRight: 8 }} />模型选择</>}>
                <Select
                  value={subtitleModel}
                  onChange={setSubtitleModel}
                  options={whisperModels}
                  style={{ width: '100%', maxWidth: 300 }}
                  disabled={transcribing}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  模型越大，识别越准确，但需要更多内存和处理时间
                </Text>
              </Card>

              <Card size="small" title={<><FileOutput size={16} style={{ marginRight: 8 }} />输出目录</>}>
                <Space>
                  <Button 
                    onClick={handleSelectOutputDir} 
                    icon={<FolderOpen size={16} />}
                    disabled={transcribing}
                  >
                    选择目录
                  </Button>
                  <Text type="secondary">
                    {outputDir || '默认保存到音频文件所在目录'}
                  </Text>
                </Space>
              </Card>

              {transcribing && transcribeProgress && (
                <Card size="small">
                  <div style={{ marginBottom: 8 }}>
                    <Text>{getProgressMessage()}</Text>
                  </div>
                  <Progress percent={getProgressPercent()} status="active" />
                </Card>
              )}

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleTranscribe}
                  disabled={transcribing || !audioFile}
                  icon={transcribing ? <Spin size="small" /> : undefined}
                >
                  {transcribing ? '正在提取字幕...' : '开始提取字幕'}
                </Button>
              </div>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}