import { useState, useCallback } from 'react';
import { message } from 'antd';
import { Inbox } from 'lucide-react';
import type { VideoInfo } from '@/types';

interface FileDropProps {
  multiple?: boolean;
  onFilesSelected: (files: VideoInfo[]) => void;
}

export function FileDrop({
  multiple = false,
  onFilesSelected,
}: FileDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(async () => {
    if (!window.electronAPI) {
      message.error('Electron API not available');
      return;
    }

    try {
      const filePaths = await window.electronAPI.fs.selectFile();
      if (!filePaths || filePaths.length === 0) return;

      const videoInfos: VideoInfo[] = [];
      for (const filePath of multiple ? filePaths : [filePaths[0]]) {
        const info = await window.electronAPI.ffmpeg.getVideoInfo(filePath);
        if (info) {
          videoInfos.push(info);
        } else {
          videoInfos.push({
            path: filePath,
            name: filePath.split(/[/\\]/).pop() || filePath,
            size: 0,
            duration: 0,
            width: 0,
            height: 0,
            codec: 'unknown',
            bitrate: 0,
            fps: 0,
            format: 'unknown',
          });
        }
      }

      if (videoInfos.length > 0) {
        onFilesSelected(videoInfos);
        message.success(`已选择 ${videoInfos.length} 个文件`);
      }
    } catch (err) {
      message.error('选择文件失败');
      console.error(err);
    }
  }, [multiple, onFilesSelected]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!window.electronAPI) {
        message.error('Electron API not available');
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const videoInfos: VideoInfo[] = [];
      for (const file of multiple ? files : [files[0]]) {
        const info = await window.electronAPI.ffmpeg.getVideoInfo((file as any).path);
        if (info) {
          videoInfos.push(info);
        } else {
          videoInfos.push({
            path: (file as any).path || file.name,
            name: file.name,
            size: file.size,
            duration: 0,
            width: 0,
            height: 0,
            codec: 'unknown',
            bitrate: 0,
            fps: 0,
            format: 'unknown',
          });
        }
      }

      if (videoInfos.length > 0) {
        onFilesSelected(videoInfos);
        message.success(`已选择 ${videoInfos.length} 个文件`);
      }
    },
    [multiple, onFilesSelected]
  );

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#0D9488' : '#E2E8F0'}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: isDragging ? '#E6FFFA' : '#FFFFFF',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minHeight: 56,
      }}
    >
      <Inbox size={24} color={isDragging ? '#0D9488' : '#94A3B8'} />
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>
          拖拽文件到这里，或点击选择
        </p>
        <p style={{ margin: '2px 0 0', color: '#94A3B8', fontSize: 11 }}>
          支持 MP4, AVI, MOV, MKV, WebM
        </p>
      </div>
    </div>
  );
}