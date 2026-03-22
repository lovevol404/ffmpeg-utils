import { useEffect, useState } from 'react';
import { Alert, Button, Spin, Space, Input, Modal, message } from 'antd';
import { FolderOpen, PlusCircle } from 'lucide-react';
import { VideoSelector } from './VideoSelector';
import { ChatPanel } from './ChatPanel';
import { WorkflowPreview } from './WorkflowPreview';
import { useAIStore } from '@/stores/aiStore';

export default function AIWorkshopModule() {
  const { isServiceRunning, setServiceStatus, setConfig, workDirectory, setWorkDirectory, startNewSession } = useAIStore();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDirModal, setShowDirModal] = useState(false);

  useEffect(() => {
    checkAndStartService();
  }, []);

  const checkAndStartService = async () => {
    setChecking(true);
    setError(null);

    try {
      const status = await window.electronAPI?.ai.status();
      
      if (status?.running) {
        setServiceStatus(true, status.baseUrl);
        await loadConfig();
      } else {
        const result = await window.electronAPI?.ai.start();
        if (result?.success) {
          setServiceStatus(true, result.baseUrl || '');
          await loadConfig();
        } else {
          setError(result?.error || 'AI 服务启动失败');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const loadConfig = async () => {
    const config = await window.electronAPI?.store.get('aiConfig');
    if (config) {
      setConfig(config as any);
      await window.electronAPI?.ai.configure(config as any);
    }
    
    const savedDir = await window.electronAPI?.store.get('workDirectory');
    if (savedDir) {
      setWorkDirectory(savedDir as string);
    }
  };

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI?.fs.selectFolder();
    if (dir) {
      setWorkDirectory(dir);
      await window.electronAPI?.store.set('workDirectory', dir);
      message.success('工作目录已设置');
    }
  };

  const handleNewSession = () => {
    if (!workDirectory) {
      setShowDirModal(true);
      return;
    }
    startNewSession();
    message.success('已开启新会话');
  };

  const handleConfirmNewSession = () => {
    setShowDirModal(false);
    startNewSession();
    message.success('已开启新会话');
  };

  if (checking) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#64748B' }}>正在启动 AI 服务...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="AI 服务启动失败"
        description={error}
        showIcon
        action={
          <Button size="small" onClick={checkAndStartService}>
            重试
          </Button>
        }
      />
    );
  }

  if (!isServiceRunning) {
    return (
      <Alert
        type="warning"
        message="AI 服务未运行"
        description="请确保 Python 后端服务已启动。开发模式请运行: npm run dev:python"
        showIcon
        action={
          <Button size="small" onClick={checkAndStartService}>
            启动服务
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        <Space>
          <span style={{ fontSize: 13, color: '#64748B' }}>工作目录:</span>
          {workDirectory ? (
            <span style={{ fontSize: 13, color: '#134E4A', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={workDirectory}>
              {workDirectory}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#EF4444' }}>未设置</span>
          )}
          <Button size="small" icon={<FolderOpen size={14} />} onClick={handleSelectDirectory}>
            选择目录
          </Button>
        </Space>
        <Button type="primary" icon={<PlusCircle size={14} />} onClick={handleNewSession}>
          新会话
        </Button>
      </div>
      <div style={{ flexShrink: 0 }}>
        <VideoSelector />
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        <div style={{ flex: '1 1 60%', minWidth: 0 }}>
          <ChatPanel />
        </div>
        <div style={{ flex: '1 1 40%', minWidth: 300 }}>
          <WorkflowPreview />
        </div>
      </div>
      
      <Modal
        title="设置工作目录"
        open={showDirModal}
        onOk={handleConfirmNewSession}
        onCancel={() => setShowDirModal(false)}
        okText="确认"
        cancelText="取消"
      >
        <p style={{ marginBottom: 12 }}>请先选择一个工作目录，视频处理结果将保存到此目录。</p>
        <Space.Compact style={{ width: '100%' }}>
          <Input 
            value={workDirectory || ''} 
            placeholder="点击右侧按钮选择目录" 
            readOnly 
          />
          <Button icon={<FolderOpen size={14} />} onClick={handleSelectDirectory}>
            选择
          </Button>
        </Space.Compact>
      </Modal>
    </div>
  );
}