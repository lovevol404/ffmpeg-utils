import { useCallback } from 'react';
import { message } from 'antd';
import { useAIStore } from '@/stores/aiStore';
import type { AIChatMessage } from '@/types/ai';

export function useAIChat() {
  const {
    messages,
    selectedVideos,
    workflow,
    isLoading,
    addMessage,
    setWorkflow,
    setLoading,
  } = useAIStore();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: content.trim(),
    };
    addMessage(userMessage);
    setLoading(true);

    try {
      const videoInfo = selectedVideos.length > 0 ? selectedVideos[0] : null;
      const history = messages.slice(-10);

      const result = await window.electronAPI?.ai.chat(content, videoInfo, history);

      if (result?.success && result.data) {
        addMessage(result.data);
      } else {
        message.error(result?.error || 'AI 响应失败');
      }
    } catch (err) {
      message.error('发送消息失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [messages, selectedVideos, addMessage, setLoading]);

  const generateWorkflow = useCallback(async () => {
    if (messages.length === 0) {
      message.warning('请先与 AI 对话');
      return null;
    }

    setLoading(true);

    try {
      const result = await window.electronAPI?.ai.workflow(messages);

      if (result?.success && result.data) {
        setWorkflow(result.data);
        return result.data;
      } else {
        message.error(result?.error || '生成工作流失败');
        return null;
      }
    } catch (err) {
      message.error('生成工作流失败');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [messages, setWorkflow, setLoading]);

  return {
    messages,
    workflow,
    isLoading,
    sendMessage,
    generateWorkflow,
  };
}