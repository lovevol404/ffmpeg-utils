import { useMemo } from 'react';
import { Button, Empty } from 'antd';
import { Trash2 } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { useTaskStore } from '@/stores/taskStore';

export function TaskQueue() {
  const { tasks, removeTask, clearCompleted, cancelTask, updateTask } = useTaskStore();

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);

  const handleRetry = (id: string) => {
    updateTask(id, { status: 'pending', progress: 0, error: undefined });
  };

  if (tasks.length === 0) {
    return <Empty description="暂无任务" />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: '#64748B' }}>
          共 {tasks.length} 个任务，{pendingCount} 个等待中，{completedCount} 个已完成
        </span>
        {completedCount > 0 && (
          <Button type="link" icon={<Trash2 size={14} />} onClick={clearCompleted}>
            清空已完成
          </Button>
        )}
      </div>
      {tasks.map((task) => (
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