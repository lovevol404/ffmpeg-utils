import { Button, Modal, Space } from 'antd';
import { Video, Image as ImageIcon, X, Play, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { useState } from 'react';
import type { AIVideoInfo } from '@/types/ai';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }
  return `${(bitrate / 1000).toFixed(0)} Kbps`;
}

export function VideoSelector() {
  const { 
    selectedVideos, 
    addSelectedVideo, 
    removeSelectedVideo, 
    clearSelectedVideos,
    watermark,
    setWatermark,
    clearWatermark,
  } = useAIStore();
  const [loading, setLoading] = useState(false);
  const [watermarkLoading, setWatermarkLoading] = useState(false);
  const [infoVideo, setInfoVideo] = useState<AIVideoInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectVideo = async () => {
    setLoading(true);
    try {
      const paths = await window.electronAPI?.fs.selectFile('video');
      if (paths && paths.length > 0) {
        for (const path of paths) {
          const fileInfo = await window.electronAPI?.fs.getFileInfo(path);
          const videoInfo = await window.electronAPI?.ffmpeg.getVideoInfo(path);
          
          if (fileInfo) {
            const aiVideoInfo: AIVideoInfo = {
              path: fileInfo.path,
              name: fileInfo.name,
              size: fileInfo.size,
              streams: videoInfo ? {
                codec: videoInfo.codec,
                width: videoInfo.width,
                height: videoInfo.height,
                duration: videoInfo.duration,
                bitrate: videoInfo.bitrate,
                fps: videoInfo.fps,
              } : undefined,
            };
            addSelectedVideo(aiVideoInfo);
          }
        }
      }
    } catch (err) {
      console.error('Failed to select video:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWatermark = async () => {
    setWatermarkLoading(true);
    try {
      const paths = await window.electronAPI?.fs.selectFile('image');
      if (paths && paths.length > 0) {
        const path = paths[0];
        const fileInfo = await window.electronAPI?.fs.getFileInfo(path);
        if (fileInfo) {
          setWatermark({
            path: fileInfo.path,
            name: fileInfo.name,
            size: fileInfo.size,
          });
        }
      }
    } catch (err) {
      console.error('Failed to select watermark:', err);
    } finally {
      setWatermarkLoading(false);
    }
  };

  const handleOpenFolder = async (path: string) => {
    await window.electronAPI?.fs.showItemInFolder(path);
  };

  // 使用系统播放器预览
  const handlePreview = async (path: string) => {
    await window.electronAPI?.fs.openPath(path);
  };

  // 折叠状态下的简要信息
  const getCollapsedInfo = () => {
    if (selectedVideos.length === 0) {
      return '未选择视频';
    }
    const info = selectedVideos[0];
    const parts = [formatFileSize(info.size)];
    if (info.streams?.width && info.streams?.height) {
      parts.push(`${info.streams.width}×${info.streams.height}`);
    }
    if (info.streams?.duration) {
      parts.push(formatDuration(info.streams.duration));
    }
    return parts.join(' · ');
  };

  return (
    <>
      <div style={{ 
        background: '#fff', 
        borderRadius: 8, 
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}>
        {/* 标题栏 - 可点击折叠 */}
        <div 
          onClick={() => setCollapsed(!collapsed)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: collapsed ? '#fff' : '#F8FAFC',
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: collapsed ? 'none' : '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Video size={16} style={{ color: '#0D9488' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>视频文件</span>
            {selectedVideos.length > 0 && (
              <span style={{ 
                fontSize: 12, 
                color: '#0D9488', 
                background: '#CCFBF1', 
                padding: '1px 6px', 
                borderRadius: 4 
              }}>
                {selectedVideos.length} 个
              </span>
            )}
            {watermark && (
              <span style={{ 
                fontSize: 12, 
                color: '#D97706', 
                background: '#FEF3C7', 
                padding: '1px 6px', 
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <ImageIcon size={12} />
                水印
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {collapsed && selectedVideos.length > 0 && (
              <span style={{ fontSize: 12, color: '#64748B' }}>
                {getCollapsedInfo()}
              </span>
            )}
            {collapsed ? <ChevronDown size={16} style={{ color: '#64748B' }} /> : <ChevronUp size={16} style={{ color: '#64748B' }} />}
          </div>
        </div>

        {/* 展开内容 */}
        {!collapsed && (
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            padding: '12px 16px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}>
            {/* 视频选择区 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 auto', minWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handleSelectVideo(); }} 
                  loading={loading}
                >
                  选择视频
                </Button>
                {selectedVideos.length > 1 && (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<X size={12} />} 
                    onClick={(e) => { e.stopPropagation(); clearSelectedVideos(); }}
                    style={{ color: '#EF4444' }}
                  >
                    清空
                  </Button>
                )}
              </div>
              
              {selectedVideos.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  background: '#F8FAFC', 
                  borderRadius: 6, 
                  textAlign: 'center',
                  color: '#94A3B8',
                  fontSize: 13,
                }}>
                  请选择要处理的视频文件
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedVideos.map((video) => (
                    <div 
                      key={video.path}
                      style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: 8,
                        background: '#F0FDFA',
                        border: '1px solid #CCFBF1',
                        borderRadius: 6,
                        minWidth: 180,
                        maxWidth: 240,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Video size={14} style={{ color: '#0D9488', flexShrink: 0 }} />
                        <span style={{ 
                          fontSize: 12, 
                          fontWeight: 500,
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}>
                          {video.name}
                        </span>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<X size={12} />} 
                          onClick={(e) => { e.stopPropagation(); removeSelectedVideo(video.path); }}
                          style={{ padding: '0 2px', height: 18, color: '#64748B' }}
                        />
                      </div>
                      
                      {/* 视频基本信息 */}
                      <div style={{ fontSize: 11, color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                        <span>{formatFileSize(video.size)}</span>
                        {video.streams?.width && video.streams?.height && (
                          <>
                            <span>·</span>
                            <span>{video.streams.width}×{video.streams.height}</span>
                          </>
                        )}
                        {video.streams?.duration && (
                          <>
                            <span>·</span>
                            <span>{formatDuration(video.streams.duration)}</span>
                          </>
                        )}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <Button 
                          size="small" 
                          icon={<Play size={12} />}
                          onClick={(e) => { e.stopPropagation(); handlePreview(video.path); }}
                          style={{ fontSize: 11 }}
                        >
                          预览
                        </Button>
                        <Button 
                          size="small" 
                          icon={<Info size={12} />}
                          onClick={(e) => { e.stopPropagation(); setInfoVideo(video); }}
                          style={{ fontSize: 11 }}
                        >
                          详情
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 水印选择区 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={14} style={{ color: '#64748B' }} />
                <span style={{ fontSize: 12, color: '#64748B' }}>水印</span>
                <Button 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); handleSelectWatermark(); }} 
                  loading={watermarkLoading}
                >
                  选择
                </Button>
                {watermark && (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<X size={12} />} 
                    onClick={(e) => { e.stopPropagation(); clearWatermark(); }}
                    style={{ color: '#EF4444', padding: '0 4px' }}
                  />
                )}
              </div>
              
              {watermark && (
                <div style={{ 
                  padding: 6,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 4,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <ImageIcon size={12} style={{ color: '#D97706' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {watermark.name}
                  </span>
                  <span style={{ color: '#92400E' }}>({formatFileSize(watermark.size)})</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 视频详情弹窗 */}
      <Modal
        title="视频详情"
        open={!!infoVideo}
        onCancel={() => setInfoVideo(null)}
        footer={
          <Space>
            <Button onClick={() => infoVideo && handlePreview(infoVideo.path)}>
              系统播放器打开
            </Button>
            <Button onClick={() => infoVideo && handleOpenFolder(infoVideo.path)}>
              打开所在文件夹
            </Button>
            <Button type="primary" onClick={() => setInfoVideo(null)}>
              关闭
            </Button>
          </Space>
        }
        width={480}
      >
        {infoVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>文件名</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{infoVideo.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>文件大小</span>
              <span style={{ fontSize: 13 }}>{formatFileSize(infoVideo.size)}</span>
            </div>
            {infoVideo.streams?.width && infoVideo.streams?.height && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>分辨率</span>
                <span style={{ fontSize: 13 }}>{infoVideo.streams.width} × {infoVideo.streams.height}</span>
              </div>
            )}
            {infoVideo.streams?.duration && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>时长</span>
                <span style={{ fontSize: 13 }}>{formatDuration(infoVideo.streams.duration)}</span>
              </div>
            )}
            {infoVideo.streams?.codec && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>编码格式</span>
                <span style={{ fontSize: 13 }}>{infoVideo.streams.codec}</span>
              </div>
            )}
            {infoVideo.streams?.bitrate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>比特率</span>
                <span style={{ fontSize: 13 }}>{formatBitrate(infoVideo.streams.bitrate)}</span>
              </div>
            )}
            {infoVideo.streams?.fps && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>帧率</span>
                <span style={{ fontSize: 13 }}>{infoVideo.streams.fps.toFixed(2)} fps</span>
              </div>
            )}
            <div style={{ padding: '8px 0' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>完整路径</span>
              <div style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 4, padding: 8, background: '#F8FAFC', borderRadius: 4 }}>
                {infoVideo.path}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}