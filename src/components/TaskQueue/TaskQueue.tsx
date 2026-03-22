import { useMemo, useEffect } from 'react';
import { Button, Empty, Spin, Tag } from 'antd';
import { Trash2, GitBranch } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { useTaskStore } from '@/stores/taskStore';
import type { Task } from '@/types';

export function TaskQueue() {
  const { tasks, removeTask, clearCompleted, clearAll, cancelTask, updateTask, loadTasks, loaded } = useTaskStore();

  useEffect(() => {
    if (!loaded) {
      loadTasks();
    }
  }, [loaded, loadTasks]);

  // 按工作流分组任务
  const groupedTasks = useMemo(() => {
    // 按工作流分组
    const workflowGroups = new Map<string | undefined, Task[]>();
    const standaloneTasks: Task[] = [];
    
    tasks.forEach((task) => {
      if (task.workflowId) {
        const group = workflowGroups.get(task.workflowId) || [];
        group.push(task);
        workflowGroups.set(task.workflowId, group);
      } else {
        standaloneTasks.push(task);
      }
    });
    
    // 对每个工作流组内的任务按 workflowIndex 排序
    workflowGroups.forEach((group) => {
      group.sort((a, b) => (a.workflowIndex ?? 0) - (b.workflowIndex ?? 0));
    });
    
    return { workflowGroups, standaloneTasks };
  }, [tasks]);

  // 生成排序后的任务列表（工作流优先，按顺序）
  const sortedTasks = useMemo(() => {
    const result: (Task | { type: 'workflow-header'; workflowId: string; tasks: Task[] })[] = [];
    
    // 先添加工作流任务（按创建时间倒序）
    const sortedWorkflows = Array.from(groupedTasks.workflowGroups.entries())
      .sort((a, b) => {
        const aTime = Math.min(...a[1].map(t => new Date(t.createdAt).getTime()));
        const bTime = Math.min(...b[1].map(t => new Date(t.createdAt).getTime()));
        return bTime - aTime;
      });
    
    sortedWorkflows.forEach(([workflowId, workflowTasks]) => {
      result.push({ type: 'workflow-header', workflowId: workflowId!, tasks: workflowTasks });
      workflowTasks.forEach((task) => result.push(task));
    });
    
    // 再添加独立任务（按时间倒序）
    const sortedStandalone = [...groupedTasks.standaloneTasks].sort((a, b) => {
      const timeA = a.startedAt ? new Date(a.startedAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.startedAt ? new Date(b.startedAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
    sortedStandalone.forEach((task) => result.push(task));
    
    return result;
  }, [groupedTasks]);

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const failedCount = useMemo(() => tasks.filter((t) => t.status === 'failed').length, [tasks]);
  const workflowCount = groupedTasks.workflowGroups.size;

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
          共 {tasks.length} 个任务
          {workflowCount > 0 && <span style={{ color: '#0D9488' }}>，{workflowCount} 个工作流</span>}
          {pendingCount > 0 && <span>，{pendingCount} 个等待中</span>}
          {completedCount > 0 && <span>，{completedCount} 个已完成</span>}
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
      
      {sortedTasks.map((item) => {
        if ('type' in item && item.type === 'workflow-header') {
          // 工作流标题
          const workflowTasks = item.tasks;
          const workflowStatus = {
            completed: workflowTasks.filter(t => t.status === 'completed').length,
            total: workflowTasks.length,
            isComplete: workflowTasks.every(t => t.status === 'completed'),
            hasFailed: workflowTasks.some(t => t.status === 'failed'),
            isProcessing: workflowTasks.some(t => t.status === 'processing'),
          };
          
          return (
            <div 
              key={item.workflowId}
              style={{ 
                marginBottom: 8,
                padding: '8px 12px',
                background: workflowStatus.isComplete ? '#F0FDF4' : workflowStatus.hasFailed ? '#FEF2F2' : '#F0FDFA',
                borderRadius: 6,
                border: `1px solid ${workflowStatus.isComplete ? '#BBF7D0' : workflowStatus.hasFailed ? '#FECACA' : '#CCFBF1'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GitBranch size={14} style={{ color: workflowStatus.isComplete ? '#16A34A' : workflowStatus.hasFailed ? '#DC2626' : '#0D9488' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                  工作流
                </span>
                <Tag color={workflowStatus.isComplete ? 'success' : workflowStatus.hasFailed ? 'error' : workflowStatus.isProcessing ? 'processing' : 'default'}>
                  {workflowStatus.completed}/{workflowStatus.total} 完成
                </Tag>
              </div>
            </div>
          );
        }
        
        // 普通任务
        const task = item as Task;
        return (
          <TaskItem
            key={task.id}
            task={task}
            onCancel={cancelTask}
            onRetry={handleRetry}
            onRemove={removeTask}
          />
        );
      })}
    </div>
  );
}