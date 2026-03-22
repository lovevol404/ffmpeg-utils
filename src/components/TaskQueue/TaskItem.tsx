import { useState, useEffect } from 'react';
import { Progress, Tag, Button, Tooltip } from 'antd';
import { Trash2, RotateCcw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, FolderOpen, Timer, Terminal, AlertCircle } from 'lucide-react';
import type { Task } from '@/types';
import { useTaskStore } from '@/stores/taskStore';

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

function formatDuration(startTime: Date, endTime?: Date): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  
  if (diff < 60) {
    return `${diff}秒`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}分${seconds}秒`;
  } else {
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours}时${minutes}分${seconds}秒`;
  }
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
  const [expandedError, setExpandedError] = useState(false);
  const [expandedCommand, setExpandedCommand] = useState(false);
  const [, setTick] = useState(0);
  const hasError = task.error && task.error.length > 50;
  const canStartTask = useTaskStore((state) => state.canStartTask);
  const canStart = task.status === 'pending' ? canStartTask(task.id) : true;

  useEffect(() => {
    if (task.status === 'processing') {
      const timer = setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [task.status]);

  const handleOpenFolder = () => {
    const dir = getDirFromPath(task.outputPath);
    if (window.electronAPI?.fs?.openPath) {
      window.electronAPI.fs.openPath(dir);
    }
  };

  const getDuration = () => {
    if (task.status === 'processing' && task.startedAt) {
      return formatDuration(task.startedAt);
    }
    if ((task.status === 'completed' || task.status === 'failed') && task.startedAt && task.completedAt) {
      return formatDuration(task.startedAt, task.completedAt);
    }
    return null;
  };

  const duration = getDuration();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag color={taskTypeConfig[task.type]?.color || 'default'}>
            {taskTypeConfig[task.type]?.text || task.type}
          </Tag>
          <Tag color={config.color} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {config.icon}
            {config.text}
          </Tag>
          {!canStart && task.status === 'pending' && (
            <Tag color="warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} />
              等待依赖
            </Tag>
          )}
          {duration && (
            <Tag color="default" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Timer size={12} />
              {duration}
            </Tag>
          )}
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
      
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: '#64748B', minWidth: 50 }}>输入:</span>
        <span style={{ color: '#134E4A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.inputPath}>
          {task.inputPath.split(/[/\\]/).pop()}
        </span>
      </div>
      
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span style={{ color: '#64748B', minWidth: 50 }}>输出:</span>
        <span style={{ color: '#134E4A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.outputPath}>
          {task.outputPath.split(/[/\\]/).pop()}
        </span>
        {(task.status === 'completed' || task.status === 'failed') && (
          <Button type="link" size="small" icon={<FolderOpen size={12} />} onClick={handleOpenFolder} style={{ padding: 0, height: 'auto', fontSize: 12, minWidth: 'auto' }}>
            打开目录
          </Button>
        )}
      </div>
      
      {task.dependsOn && task.dependsOn.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: '#64748B', minWidth: 50 }}>依赖:</span>
          <Tag color="default" style={{ fontSize: 11, margin: 0 }}>
            {task.dependsOn.length} 个前置任务
          </Tag>
        </div>
      )}
      
      {task.status === 'processing' && (
        <Progress percent={Math.round(task.progress)} size="small" strokeColor="#0D9488" />
      )}
      
      {task.command && (
        <div style={{ marginTop: 8 }}>
          <Button
            type="link"
            size="small"
            icon={expandedCommand ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            onClick={() => setExpandedCommand(!expandedCommand)}
            style={{ padding: 0, height: 'auto', fontSize: 12 }}
          >
            <Terminal size={12} style={{ marginRight: 4 }} />
            {expandedCommand ? '收起命令' : '查看命令'}
          </Button>
          {expandedCommand && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: 8,
                marginTop: 8,
              }}
            >
              <pre
                style={{
                  color: '#334155',
                  fontSize: 11,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {task.command}
              </pre>
            </div>
          )}
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
              maxHeight: hasError && !expandedError ? 48 : undefined,
              overflow: hasError && !expandedError ? 'hidden' : undefined,
            }}
          >
            {task.error}
          </pre>
          {hasError && (
            <Button
              type="link"
              size="small"
              icon={expandedError ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              onClick={() => setExpandedError(!expandedError)}
              style={{ padding: '4px 0', height: 'auto' }}
            >
              {expandedError ? '收起' : '展开详情'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}