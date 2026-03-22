import { useState } from 'react';
import { Layout, Button, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Terminal } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/appStore';
import ConvertModule from '@/modules/Convert';
import EditModule from '@/modules/Edit';
import CompressModule from '@/modules/Compress';
import ExtractModule from '@/modules/Extract';
import SubtitleModule from '@/modules/Subtitle';
import QueueModule from '@/modules/Queue';
import SettingsModule from '@/modules/Settings';
import AIWorkshopModule from '@/modules/AIWorkshop';

const { Sider, Content } = Layout;

const moduleMap = {
  convert: ConvertModule,
  edit: EditModule,
  compress: CompressModule,
  extract: ExtractModule,
  subtitle: SubtitleModule,
  aiworkshop: AIWorkshopModule,
  queue: QueueModule,
  settings: SettingsModule,
};

export function MainLayout() {
  const { currentModule, showCommand, toggleShowCommand } = useAppStore();
  const ModuleComponent = moduleMap[currentModule];
  const [collapsed, setCollapsed] = useState(false);

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
            <ModuleComponent />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}