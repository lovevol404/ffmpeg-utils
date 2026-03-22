import { Card, Tag, Button, Space, Empty, Steps, Popconfirm, Alert } from 'antd';
import { Play, GitBranch, Clock } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { useTaskStore } from '@/stores/taskStore';
import { message } from 'antd';
import { useState } from 'react';
import type { TaskType } from '@/types/task';

const taskTypeLabels: Record<string, string> = {
  convert: '格式转换',
  compress: '视频压缩',
  extract_audio: '提取音频',
  extract_frame: '提取帧',
  cut: '裁剪视频',
  merge: '合并视频',
  add_subtitle: '添加字幕',
  add_watermark: '添加水印',
  custom: '自定义',
};

// 工作流任务类型 -> TaskType 映射
const workflowToTaskType: Record<string, TaskType> = {
  convert: 'convert',
  compress: 'compress',
  extract_audio: 'extract-audio',
  extract_frame: 'extract-frames',
  cut: 'edit-trim',
  merge: 'edit-merge',
  add_subtitle: 'edit-subtitle',
  add_watermark: 'edit-watermark',
  custom: 'convert', // 默认使用 convert
};

const taskTypeColors: Record<string, string> = {
  convert: 'blue',
  compress: 'green',
  extract_audio: 'purple',
  extract_frame: 'cyan',
  cut: 'orange',
  merge: 'magenta',
  add_subtitle: 'gold',
  add_watermark: 'lime',
  custom: 'default',
};

export function WorkflowPreview() {
  const { workflow, clearWorkflow, workDirectory, selectedVideos, watermark } = useAIStore();
  const { addTask } = useTaskStore();
  const [executing, setExecuting] = useState(false);

  /**
   * 获取输出路径 - 使用工作目录
   * 工作目录只用于输出视频和中间产物
   */
  const getOutputPath = (originalOutput: string): string => {
    if (!workDirectory) return originalOutput;
    
    const fileName = originalOutput.split('/').pop() || originalOutput.split('\\').pop() || originalOutput;
    
    // 检测工作目录使用的路径分隔符
    const isWindows = workDirectory.includes('\\') || workDirectory.match(/^[A-Z]:\\/i);
    const separator = isWindows ? '\\' : '/';
    
    return workDirectory.endsWith(separator) 
      ? workDirectory + fileName 
      : workDirectory + separator + fileName;
  };

  /**
   * 解析输入路径 - 使用用户选择的原始视频路径
   * 工作目录不影响原始输入
   */
  const resolveInputPath = (taskInput: string | string[]): string | string[] => {
    // 如果没有选择视频，返回原始值
    if (selectedVideos.length === 0) {
      return taskInput;
    }

    // 单个输入
    if (typeof taskInput === 'string') {
      // 优先使用用户选择的第一个视频
      return selectedVideos[0].path;
    }

    // 多个输入（如合并视频）
    if (Array.isArray(taskInput)) {
      // 使用用户选择的所有视频，如果不够则补充原AI生成的路径
      const videoPaths = selectedVideos.map(v => v.path);
      if (videoPaths.length >= taskInput.length) {
        return videoPaths.slice(0, taskInput.length);
      }
      // 用户选择的视频不够，混合使用
      return [...videoPaths, ...taskInput.slice(videoPaths.length)];
    }

    return taskInput;
  };

  /**
   * 获取水印路径 - 使用用户选择的原始水印图片路径
   */
  const getWatermarkPath = (): string | undefined => {
    return watermark?.path;
  };

  const handleExecuteWorkflow = async () => {
    if (!workflow || workflow.tasks.length === 0) return;
    
    if (!workDirectory) {
      message.warning('请先设置工作目录');
      return;
    }

    if (selectedVideos.length === 0) {
      message.warning('请先选择视频文件');
      return;
    }

    setExecuting(true);

    try {
      // 生成工作流ID，用于分组显示
      const workflowId = `workflow-${Date.now()}`;
      const taskIdMap: Record<string, string> = {};
      
      for (let i = 0; i < workflow.tasks.length; i++) {
        const task = workflow.tasks[i];
        const dependsOnIds = task.depends_on
          .map(depId => taskIdMap[depId])
          .filter(Boolean);
        
        // 使用用户选择的视频路径作为输入
        const resolvedInput = resolveInputPath(task.input);
        const inputPath = Array.isArray(resolvedInput) ? resolvedInput[0] : resolvedInput;
        
        // 处理额外的输入文件（如合并视频）
        let extraInputs: string[] | undefined;
        if (Array.isArray(resolvedInput) && resolvedInput.length > 1) {
          extraInputs = resolvedInput.slice(1);
        }

        // 处理水印任务 - 添加水印图片作为额外输入
        let filterComplex = task.filterComplex;
        if (task.type === 'add_watermark' && watermark) {
          const watermarkPath = getWatermarkPath();
          if (watermarkPath) {
            extraInputs = extraInputs || [];
            extraInputs.push(watermarkPath);
            
            // 如果 AI 没有提供 filter_complex，生成默认的水印叠加
            if (!filterComplex) {
              // 默认在右下角添加水印，透明度 0.8
              filterComplex = '[0:v][1:v]overlay=W-w-10:H-h-10';
            } else if (!filterComplex.includes('overlay')) {
              // 如果 filter_complex 不包含 overlay，添加基本的叠加
              filterComplex = `[0:v][1:v]${filterComplex}`;
            }
          }
        }
        
        const newTaskId = addTask({
          type: workflowToTaskType[task.type] || 'convert',
          inputPath,
          outputPath: getOutputPath(task.output),
          command: '',
          args: task.args,  // args 会在 useTaskExecutor 中被清理和验证
          filterComplex,
          extraInputs,
          dependsOn: dependsOnIds.length > 0 ? dependsOnIds : undefined,
          workflowId,           // 工作流ID，用于分组
          workflowIndex: i,     // 在工作流中的顺序
        });
        
        taskIdMap[task.id] = newTaskId;
      }

      message.success(`已添加 ${workflow.tasks.length} 个任务到队列`);
      clearWorkflow();
    } catch (err) {
      message.error('添加任务失败');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  if (!workflow) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <GitBranch size={16} />
            <span style={{ fontSize: 14 }}>工作流预览</span>
          </Space>
        }
        styles={{ body: { padding: 16, height: 'calc(100% - 45px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }}
        style={{ height: '100%' }}
      >
        {!workDirectory && (
          <Alert
            type="warning"
            message="请先设置工作目录"
            style={{ marginBottom: 16, fontSize: 12 }}
            showIcon
          />
        )}
        <Empty
          image={<GitBranch size={36} style={{ color: '#94A3B8' }} />}
          description={<span style={{ fontSize: 12 }}>与 AI 对话后点击生成工作流</span>}
        />
      </Card>
    );
  }

  const getFileName = (path: string | string[]): string => {
    const p = Array.isArray(path) ? path[0] : path;
    return p.split('/').pop() || p.split('\\').pop() || p;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <GitBranch size={16} />
          <span style={{ fontSize: 14 }}>工作流预览</span>
          <Tag color="blue" style={{ fontSize: 11 }}>{workflow.tasks.length} 个任务</Tag>
        </Space>
      }
      extra={
        <Space size={4}>
          <Button size="small" onClick={clearWorkflow}>
            清除
          </Button>
          <Popconfirm
            title="确认执行"
            description="将添加所有任务到队列，确认继续？"
            onConfirm={handleExecuteWorkflow}
            okText="确认"
            cancelText="取消"
          >
            <Button type="primary" size="small" icon={<Play size={12} />} loading={executing} disabled={!workDirectory}>
              执行
            </Button>
          </Popconfirm>
        </Space>
      }
      styles={{ body: { height: 'calc(100% - 45px)', overflow: 'auto', padding: 12 } }}
      style={{ height: '100%' }}
    >
      {workflow.description && (
        <div style={{ marginBottom: 8, padding: 8, background: '#F0FDFA', borderRadius: 6, fontSize: 12 }}>
          <strong>说明：</strong>{workflow.description}
        </div>
      )}

      <Steps
        direction="vertical"
        size="small"
        current={-1}
        items={workflow.tasks.map((task, index) => ({
          title: (
            <Space size={4}>
              <Tag color={taskTypeColors[task.type] || 'default'} style={{ fontSize: 11, margin: 0 }}>
                {taskTypeLabels[task.type] || task.type}
              </Tag>
              <span style={{ fontSize: 12 }}>{task.description}</span>
            </Space>
          ),
          description: (
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                输入: {getFileName(task.input)}{Array.isArray(task.input) && task.input.length > 1 && ` 等${task.input.length}个文件`}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                输出: {task.output.split('/').pop() || task.output.split('\\').pop() || task.output}
              </div>
              {task.depends_on.length > 0 && (
                <div style={{ marginTop: 2, display: 'flex', alignItems: 'center' }}>
                  <Clock size={10} style={{ marginRight: 2 }} />
                  依赖: {task.depends_on.join(', ')}
                </div>
              )}
            </div>
          ),
          status: 'wait' as const,
          icon: <span style={{ fontSize: 10 }}>{index + 1}</span>,
        }))}
      />
    </Card>
  );
}