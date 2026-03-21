import { useState } from 'react';
import { Progress, Tag, Button, Tooltip } from 'antd';
import { Trash2, RotateCcw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

function getDirFromPath(filePath: string): string {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  if (lastSep === -1) return filePath;
  return filePath.substring(0, lastSep);
}

const statusConfig = {
  pending: { color: 'default', icon: <Clock size={14} />, text: '等待中' },
  processing: { color: 'processing', icon: null, text: '处理中' },
  completed: { color: 'success', icon: <CheckCircle size={14} />, text: '已完成' },
  failed: { color: 'error', icon: <XCircle size={14} />, text: '失败' },
};

const taskTypeConfig: Record<string, { color: string; text: string }> = {
  convert: { color: 'blue', text: '格式转换' },
  edit: { color: 'purple', text: '视频编辑' },
  'edit-trim': { color: 'purple', text: '视频剪辑' },
  'edit-merge': { color: 'purple', text: '视频拼接' },
  'edit-watermark': { color: 'purple', text: '添加水印' },
  'edit-subtitle': { color: 'purple', text: '添加字幕' },
  compress: { color: 'orange', text: '压缩优化' },
  extract: { color: 'green', text: '媒体提取' },
  'extract-frames': { color: 'green', text: '提取帧' },
  'extract-gif': { color: 'green', text: '生成GIF' },
  'extract-audio': { color: 'green', text: '提取音频' },
  'extract-screenshot': { color: 'green', text: '截取画面' },
};

export function TaskItem({ task, onCancel, onRetry, onRemove }: TaskItemProps) {
  const config = statusConfig[task.status];
  const [expanded, setExpanded] = useState(false);
  const hasError = task.error && task.error.length > 50;
  const outputDir = getDirFromPath(task.outputPath);

  const handleOpenFolder = () => {
    const dir = getDirFromPath(task.outputPath);
    if (window.electronAPI?.fs?.openPath) {
      window.electronAPI.fs.openPath(dir);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 500, color: '#134E4A' }}>{task.inputPath.split(/[/\\]/).pop()}</span>
          <Tag color={taskTypeConfig[task.type]?.color || 'default'} style={{ marginLeft: 8 }}>
            {taskTypeConfig[task.type]?.text || task.type}
          </Tag>
          <Tag color={config.color} style={{ marginLeft: 4 }}>
            {config.icon && <span style={{ marginRight: 4 }}>{config.icon}</span>}
            {config.text}
          </Tag>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {task.status === 'processing' && (
            <Tooltip title="取消">
              <Button type="text" size="small" icon={<XCircle size={14} />} onClick={() => onCancel(task.id)} />
            </Tooltip>
          )}
          {task.status === 'failed' && (
            <Tooltip title="重试">
              <Button type="text" size="small" icon={<RotateCcw size={14} />} onClick={() => onRetry(task.id)} />
            </Tooltip>
          )}
          {(task.status === 'completed' || task.status === 'failed') && (
            <Tooltip title="移除">
              <Button type="text" size="small" icon={<Trash2 size={14} />} onClick={() => onRemove(task.id)} />
            </Tooltip>
          )}
        </div>
      </div>
      {task.status === 'processing' && (
        <Progress percent={Math.round(task.progress)} size="small" strokeColor="#0D9488" />
      )}
      {(task.status === 'completed' || task.status === 'failed') && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>输出目录:</span>
          <span style={{ fontSize: 12, color: '#134E4A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={outputDir}>
            {outputDir}
          </span>
          <Button type="link" size="small" icon={<FolderOpen size={12} />} onClick={handleOpenFolder} style={{ padding: 0, height: 'auto', fontSize: 12 }}>
            打开
          </Button>
        </div>
      )}
      {task.error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 4,
            padding: 8,
            marginTop: 8,
          }}
        >
          <pre
            style={{
              color: '#DC2626',
              fontSize: 12,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: hasError && !expanded ? 48 : undefined,
              overflow: hasError && !expanded ? 'hidden' : undefined,
            }}
          >
            {task.error}
          </pre>
          {hasError && (
            <Button
              type="link"
              size="small"
              icon={expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              onClick={() => setExpanded(!expanded)}
              style={{ padding: '4px 0', height: 'auto' }}
            >
              {expanded ? '收起' : '展开详情'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}