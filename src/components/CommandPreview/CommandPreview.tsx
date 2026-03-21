import { useState } from 'react';
import { Collapse, Button, message } from 'antd';
import { Copy, Check, Terminal } from 'lucide-react';

interface CommandPreviewProps {
  command: string;
  visible?: boolean;
}

export function CommandPreview({ command, visible = true }: CommandPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      message.success('命令已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  const highlightCommand = (cmd: string) => {
    const parts = cmd.split(' ');
    return parts.map((part, index) => {
      let color = '#134E4A';
      if (part.startsWith('-')) {
        color = '#F97316';
      } else if (part.includes(':') || /^\d+$/.test(part)) {
        color = '#22C55E';
      } else if (part.endsWith('.mp4') || part.endsWith('.avi') || part.endsWith('.mkv')) {
        color = '#0D9488';
      }
      return (
        <span key={index} style={{ color }}>
          {part}{' '}
        </span>
      );
    });
  };

  return (
    <Collapse
      ghost
      items={[
        {
          key: '1',
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={16} />
              <span>FFmpeg 命令</span>
            </div>
          ),
          children: (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: 12,
                position: 'relative',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {highlightCommand(command)}
              </pre>
              <Button
                type="text"
                size="small"
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={handleCopy}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: copied ? '#22C55E' : '#64748B',
                }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}