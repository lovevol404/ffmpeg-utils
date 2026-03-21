import { useEffect, useRef, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useAppStore } from '@/stores/appStore';
import { getVideoEncoder, getGPUEncodeArgs } from '@/utils/encoder';

export function useTaskExecutor() {
  const { tasks, updateTask } = useTaskStore();
  const { gpuAcceleration, detectedGPU } = useAppStore();
  const runningRef = useRef<Set<string>>(new Set());
  const processingTaskIdRef = useRef<string | null>(null);
  const maxConcurrent = 2;

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleProgress = (progress: number) => {
      if (processingTaskIdRef.current) {
        updateTask(processingTaskIdRef.current, { progress });
      }
    };

    window.electronAPI.ffmpeg.onProgress(handleProgress);
  }, [updateTask]);

  const executeTask = useCallback((task: typeof tasks[0]) => {
    if (!window.electronAPI) return;

    runningRef.current.add(task.id);
    processingTaskIdRef.current = task.id;

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
      args = [...task.args];
      const encoderIndex = args.findIndex((_, i) => 
        i > 0 && args[i - 1] === '-c:v'
      );
      if (encoderIndex === -1) {
        args = ['-c:v', encoder, ...args];
      } else {
        args[encoderIndex] = encoder;
      }
    } else {
      args.push('-c:v', encoder);
      args.push('-c:a', 'aac');
      
      if (effectiveGpuType !== 'none' && effectiveGpuType !== 'auto') {
        const gpuArgs = getGPUEncodeArgs(effectiveGpuType, 22);
        args.push(...gpuArgs);
      } else if (effectiveGpuType === 'auto' && detectedGPU?.available) {
        const gpuArgs = getGPUEncodeArgs(detectedGPU.type, 22);
        args.push(...gpuArgs);
      }
    }

    const options: {
      input: string;
      output: string;
      args?: string[];
      inputArgs?: string[];
      extraInputs?: string[];
      filterComplex?: string;
      filterSimple?: string;
      filterAudio?: string;
      concatFileList?: string;
    } = {
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
        if (processingTaskIdRef.current === task.id) {
          processingTaskIdRef.current = null;
        }
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
        if (processingTaskIdRef.current === task.id) {
          processingTaskIdRef.current = null;
        }
        updateTask(task.id, {
          status: 'failed',
          error: error.message || 'Execution failed',
        });
      });
  }, [updateTask, gpuAcceleration, detectedGPU]);

  useEffect(() => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    const runningCount = tasks.filter((t) => t.status === 'processing').length;
    const availableSlots = maxConcurrent - runningCount;

    if (availableSlots <= 0 || pendingTasks.length === 0) return;

    const tasksToStart = pendingTasks.slice(0, availableSlots);
    tasksToStart.forEach((task) => {
      if (!runningRef.current.has(task.id)) {
        executeTask(task);
      }
    });
  }, [tasks, executeTask]);
}