import { Menu } from 'antd';
import {
  Film,
  Scissors,
  FileVideo,
  Image,
  ListOrdered,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const menuItems = [
  { key: 'convert', icon: <Film size={18} />, label: '格式转换' },
  { key: 'edit', icon: <Scissors size={18} />, label: '视频编辑' },
  { key: 'compress', icon: <FileVideo size={18} />, label: '压缩优化' },
  { key: 'extract', icon: <Image size={18} />, label: '媒体提取' },
  { key: 'queue', icon: <ListOrdered size={18} />, label: '任务队列' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const { currentModule, setCurrentModule } = useAppStore();

  return (
    <Menu
      mode="inline"
      inlineCollapsed={collapsed}
      selectedKeys={[currentModule]}
      style={{
        height: '100%',
        borderRight: 0,
        overflow: 'auto',
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
  );
}