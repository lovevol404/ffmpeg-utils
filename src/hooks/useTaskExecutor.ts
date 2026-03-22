import { useEffect, useRef, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useAppStore } from '@/stores/appStore';
import { getVideoEncoder, getGPUEncodeArgs } from '@/utils/encoder';

/**
 * 清理 AI 生成的 args，移除输入相关的参数
 * 这些参数会导致 FFmpeg 命令格式错误
 */
function sanitizeArgs(args: string[]): string[] {
  const forbiddenOptions = [
    '-i', '-f', '-ss', '-t', '-to',           // 输入相关
    '-y', '-n',                               // 覆盖选项（由系统控制）
    'ffmpeg',                                 // 命令本身
  ];
  
  const result: string[] = [];
  let skipNext = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // 跳过被禁止的选项及其值
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    // 检查是否是被禁止的选项
    if (forbiddenOptions.includes(arg)) {
      // 如果是带值的选项，跳过下一个参数
      if (['-i', '-f', '-ss', '-t', '-to'].includes(arg)) {
        skipNext = true;
      }
      continue;
    }
    
    // 检查是否看起来像文件路径（Windows 或 Unix 路径）
    if (arg.match(/^[A-Z]:\\|^\/|^\.\/|^\.\.\/|^~\//)) {
      // 跳过看起来像路径的参数
      continue;
    }
    
    // 检查是否是媒体文件扩展名
    if (arg.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv|m4v|mp3|aac|wav|flac|png|jpg|jpeg|gif|bmp|srt|ass|vtt)$/i)) {
      continue;
    }
    
    result.push(arg);
  }
  
  return result;
}

/**
 * 根据任务类型生成默认参数
 */
function getDefaultArgsForType(taskType: string, encoder: string): string[] {
  switch (taskType) {
    case 'extract-audio':
      return ['-vn', '-c:a', 'mp3', '-b:a', '192k'];
    case 'extract-frames':
      return ['-vsync', 'vfr'];
    case 'extract-gif':
      return ['-loop', '0'];
    case 'compress':
      return ['-c:v', encoder, '-crf', '28', '-preset', 'medium', '-c:a', 'aac'];
    case 'convert':
    default:
      return ['-c:v', encoder, '-crf', '23', '-preset', 'fast', '-c:a', 'aac'];
  }
}

export function useTaskExecutor() {
  const { tasks, updateTask, canStartTask } = useTaskStore();
  const { gpuAcceleration, detectedGPU } = useAppStore();
  const runningRef = useRef<Set<string>>(new Set());
  const maxConcurrent = 2;

  // 监听进度事件 - 支持多任务并发
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (event: { taskId: string; progress: number }) => {
      // 根据 taskId 更新对应任务的进度
      updateTask(event.taskId, { progress: event.progress });
    };

    window.electronAPI.ffmpeg.onProgress(handleProgress);
  }, [updateTask]);

  const executeTask = useCallback((task: typeof tasks[0]) => {
    if (!window.electronAPI) return;

    // 检查依赖是否完成
    if (!canStartTask(task.id)) {
      console.log(`Task ${task.id} waiting for dependencies`);
      return;
    }

    runningRef.current.add(task.id);

    updateTask(task.id, {
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
    });

    const effectiveGpuType = task.gpuType || gpuAcceleration;
    const codec = task.codec || 'h264';
    const encoder = getVideoEncoder(effectiveGpuType, codec, detectedGPU);
    
    let args: string[] = [];
    
    if (task.args && task.args.length > 0) {
      // 清理 AI 生成的参数
      const sanitizedArgs = sanitizeArgs(task.args);
      
      if (sanitizedArgs.length > 0) {
        args = [...sanitizedArgs];
        
        // GIF/截图/帧提取不需要视频编码器
        const needsVideoEncoder = !['extract-gif', 'extract-frames', 'extract-screenshot'].includes(task.type);
        
        if (needsVideoEncoder) {
          // 检查是否已包含编码器设置
          const hasVideoEncoder = args.some((_, i) => 
            i > 0 && args[i - 1] === '-c:v'
          );
          
          if (!hasVideoEncoder) {
            // 根据任务类型添加默认编码器
            args = ['-c:v', encoder, ...args];
          } else {
            // 替换为正确的编码器
            const encoderIndex = args.findIndex((_, i) => 
              i > 0 && args[i - 1] === '-c:v'
            );
            if (encoderIndex !== -1) {
              args[encoderIndex] = encoder;
            }
          }
        }
      } else {
        // 清理后没有有效参数，使用默认值
        args = getDefaultArgsForType(task.type, encoder);
      }
    } else {
      // 没有提供参数，根据任务类型使用默认值
      args = getDefaultArgsForType(task.type, encoder);
    }
    
    // 添加 GPU 加速参数 (GIF 不需要)
    if (task.type !== 'extract-gif' && task.type !== 'extract-frames' && task.type !== 'extract-screenshot') {
      if (effectiveGpuType !== 'none' && effectiveGpuType !== 'auto') {
        const gpuArgs = getGPUEncodeArgs(effectiveGpuType, 22);
        args.push(...gpuArgs);
      } else if (effectiveGpuType === 'auto' && detectedGPU?.available) {
        const gpuArgs = getGPUEncodeArgs(detectedGPU.type, 22);
        args.push(...gpuArgs);
      }
    }

    // 构建执行选项 - 包含 taskId 用于进度追踪
    const options = {
      taskId: task.id,  // 关键：用于多任务进度追踪
      input: task.inputPath,
      output: task.outputPath,
      args: args.length > 0 ? args : undefined,
      inputArgs: task.inputArgs,
      extraInputs: task.extraInputs,
      filterComplex: task.filterComplex,
      filterSimple: task.filterSimple,
      filterAudio: task.filterAudio,
      concatFileList: task.concatFileList,
    };

    window.electronAPI!.ffmpeg.execute(options)
      .then((result) => {
        runningRef.current.delete(task.id);
        if (result.success) {
          updateTask(task.id, {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
          });
        } else {
          updateTask(task.id, {
            status: 'failed',
            error: result.error || 'Unknown error',
          });
        }
      })
      .catch((error) => {
        runningRef.current.delete(task.id);
        updateTask(task.id, {
          status: 'failed',
          error: error.message || 'Execution failed',
        });
      });
  }, [updateTask, gpuAcceleration, detectedGPU, canStartTask]);

  // 任务调度 - 检查依赖后启动
  useEffect(() => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    const runningCount = tasks.filter((t) => t.status === 'processing').length;
    const availableSlots = maxConcurrent - runningCount;

    if (availableSlots <= 0 || pendingTasks.length === 0) return;

    // 过滤出依赖已满足的任务
    const readyTasks = pendingTasks.filter((task) => canStartTask(task.id));
    
    if (readyTasks.length === 0) return;

    const tasksToStart = readyTasks.slice(0, availableSlots);
    tasksToStart.forEach((task) => {
      if (!runningRef.current.has(task.id)) {
        executeTask(task);
      }
    });
  }, [tasks, executeTask, canStartTask]);
}