import { useState, useEffect } from 'react';
import { Layout, Button, Tooltip, Result, Spin } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Terminal } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/appStore';
import { useAIStore } from '@/stores/aiStore';
import ConvertModule from '@/modules/Convert';
import EditModule from '@/modules/Edit';
import CompressModule from '@/modules/Compress';
import ExtractModule from '@/modules/Extract';
import SubtitleModule from '@/modules/Subtitle';
import QueueModule from '@/modules/Queue';
import SettingsModule from '@/modules/Settings';
import AIWorkshopModule from '@/modules/AIWorkshop';

const { Sider, Content } = Layout;

export function MainLayout() {
  const { currentModule, showCommand, toggleShowCommand } = useAppStore();
  const { setServiceStatus, setConfig } = useAIStore();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startAIService();
  }, []);

  const startAIService = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await window.electronAPI?.ai.status();
      
      if (status?.running) {
        setServiceStatus(true, status.baseUrl);
        await loadAIConfig();
        setLoading(false);
      } else {
        const result = await window.electronAPI?.ai.start();
        if (result?.success) {
          setServiceStatus(true, result.baseUrl || '');
          await loadAIConfig();
          setLoading(false);
        } else {
          setError(result?.error || 'AI 服务启动失败');
          setLoading(false);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const loadAIConfig = async () => {
    const config = await window.electronAPI?.store.get('aiConfig');
    if (config) {
      setConfig(config as any);
      await window.electronAPI?.ai.configure(config as any);
    }
  };

  const renderModule = (moduleKey: string, Component: React.ComponentType) => (
    <div style={{ display: currentModule === moduleKey ? 'block' : 'none', height: '100%' }}>
      <Component />
    </div>
  );

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#F0FDFA',
        gap: 24,
      }}>
        <Spin size="large" />
        <div style={{ fontSize: 16, color: '#134E4A' }}>正在启动 AI 服务...</div>
        <div style={{ fontSize: 12, color: '#64748B' }}>首次启动可能需要几秒钟</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDFA' }}>
        <Result
          status="error"
          title="AI 服务启动失败"
          subTitle={error}
          extra={[
            <Button type="primary" key="retry" onClick={startAIService}>
              重试
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={180}
        collapsedWidth={60}
        style={{
          background: '#fff',
          borderRight: '1px solid #E2E8F0',
          flexShrink: 0,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <span style={{ 
            fontSize: collapsed ? 14 : 16, 
            fontWeight: 600, 
            color: '#134E4A',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}>
            {collapsed ? '视频' : '视频工具箱'}
          </span>
        </div>
        <Sidebar collapsed={collapsed} />
      </Sider>
      <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: collapsed ? 60 : 180 }}>
        <div
          style={{
            height: 48,
            background: '#fff',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <div style={{ flex: 1 }} />
          <Tooltip title="预览 FFmpeg 命令">
            <Button
              type="text"
              icon={<Terminal />}
              onClick={toggleShowCommand}
              style={{ 
                fontSize: 14,
                color: showCommand ? '#0D9488' : '#64748B',
              }}
            />
          </Tooltip>
        </div>
        <Content
          style={{
            padding: 24,
            background: '#F0FDFA',
            overflow: 'auto',
            flex: 1,
          }}
        >
          <div style={{ maxWidth: currentModule === 'aiworkshop' ? '100%' : 900, margin: '0 auto', width: '100%', height: currentModule === 'aiworkshop' ? 'calc(100vh - 96px)' : 'auto' }}>
            {renderModule('aiworkshop', AIWorkshopModule)}
            {renderModule('convert', ConvertModule)}
            {renderModule('edit', EditModule)}
            {renderModule('compress', CompressModule)}
            {renderModule('extract', ExtractModule)}
            {renderModule('subtitle', SubtitleModule)}
            {renderModule('queue', QueueModule)}
            {renderModule('settings', SettingsModule)}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}