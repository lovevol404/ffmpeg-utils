import { Menu } from 'antd';
import {
  Film,
  Scissors,
  FileVideo,
  Image,
  ListOrdered,
  Settings,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const menuItems = [
  { key: 'aiworkshop', icon: <Sparkles size={18} />, label: 'AI 工作台' },
  { key: 'convert', icon: <Film size={18} />, label: '格式转换' },
  { key: 'edit', icon: <Scissors size={18} />, label: '视频编辑' },
  { key: 'compress', icon: <FileVideo size={18} />, label: '压缩优化' },
  { key: 'extract', icon: <Image size={18} />, label: '媒体提取' },
  { key: 'subtitle', icon: <FileText size={18} />, label: '字幕提取' },
  { key: 'queue', icon: <ListOrdered size={18} />, label: '任务队列' },
];

const bottomMenuItems = [
  { key: 'settings', icon: <Settings size={18} />, label: '编码设置' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const { currentModule, setCurrentModule } = useAppStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[currentModule]}
        style={{
          borderRight: 0,
        }}
        items={menuItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          style: {
            margin: '4px 8px',
            borderRadius: 8,
          },
        }))}
        onClick={({ key }) => setCurrentModule(key as typeof currentModule)}
      />
      <div style={{ flex: 1 }} />
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[currentModule]}
        style={{
          borderRight: 0,
          borderTop: '1px solid #E2E8F0',
        }}
        items={bottomMenuItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          style: {
            margin: '4px 8px',
            borderRadius: 8,
          },
        }))}
        onClick={({ key }) => setCurrentModule(key as typeof currentModule)}
      />
    </div>
  );
}