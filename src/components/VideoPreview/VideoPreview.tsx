import { Button, message } from 'antd';
import { Play } from 'lucide-react';
import type { VideoInfo } from '@/types';

interface VideoPreviewButtonProps {
  videoInfo: VideoInfo;
}

export function VideoPreviewButton({ videoInfo }: VideoPreviewButtonProps) {
  const handlePreview = () => {
    if (window.electronAPI?.fs?.openPath) {
      window.electronAPI.fs.openPath(videoInfo.path);
    } else {
      message.warning('请使用 Electron 版本以支持预览功能');
    }
  };

  return (
    <Button
      type="link"
      icon={<Play size={14} />}
      onClick={handlePreview}
      style={{ padding: 0, height: 'auto', fontSize: 12 }}
    >
      预览
    </Button>
  );
}