import { useMemo, useEffect } from 'react';
import { Button, Empty, Spin } from 'antd';
import { Trash2 } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { useTaskStore } from '@/stores/taskStore';

export function TaskQueue() {
  const { tasks, removeTask, clearCompleted, clearAll, cancelTask, updateTask, loadTasks, loaded } = useTaskStore();

  useEffect(() => {
    if (!loaded) {
      loadTasks();
    }
  }, [loaded, loadTasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const timeA = a.startedAt ? new Date(a.startedAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.startedAt ? new Date(b.startedAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [tasks]);

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const failedCount = useMemo(() => tasks.filter((t) => t.status === 'failed').length, [tasks]);

  const handleRetry = (id: string) => {
    updateTask(id, { status: 'pending', progress: 0, error: undefined });
  };

  if (!loaded) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin tip="加载任务列表..." />
      </div>
    );
  }

  if (tasks.length === 0) {
    return <Empty description="暂无任务" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: '#64748B' }}>
          共 {tasks.length} 个任务，{pendingCount} 个等待中，{completedCount} 个已完成
          {failedCount > 0 && <span style={{ color: '#EF4444' }}>，{failedCount} 个失败</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {completedCount > 0 && (
            <Button size="small" icon={<Trash2 size={14} />} onClick={clearCompleted}>
              清空已完成
            </Button>
          )}
          {tasks.length > 0 && (
            <Button size="small" danger icon={<Trash2 size={14} />} onClick={clearAll}>
              清空全部
            </Button>
          )}
        </div>
      </div>
      {sortedTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onCancel={cancelTask}
          onRetry={handleRetry}
          onRemove={removeTask}
        />
      ))}
    </div>
  );
}