import { useState, useEffect, useMemo } from 'react';
import { Slider, Button, Space, Tag, message } from 'antd';
import { Plus, Trash2 } from 'lucide-react';

interface ScreenshotTimeSelectorProps {
  duration: number;
  value: string;
  onChange: (value: string) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(time, 10) || 0;
}

export function ScreenshotTimeSelector({ duration, value, onChange }: ScreenshotTimeSelectorProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [timeList, setTimeList] = useState<string[]>(() => {
    if (value) {
      const times = value.split(',').filter(t => t.trim());
      return times.map(t => t.trim());
    }
    return [];
  });

  useEffect(() => {
    onChange(timeList.join(','));
  }, [timeList, onChange]);

  const handleAddTime = () => {
    const timeStr = formatTime(currentTime);
    if (timeList.includes(timeStr)) {
      message.warning('该时间点已存在');
      return;
    }
    const newList = [...timeList, timeStr].sort((a, b) => parseTimeToSeconds(a) - parseTimeToSeconds(b));
    setTimeList(newList);
    message.success(`已添加时间点: ${timeStr}`);
  };

  const handleRemoveTime = (time: string) => {
    setTimeList(timeList.filter(t => t !== time));
  };

  const handleClearAll = () => {
    setTimeList([]);
  };

  const marks = useMemo(() => {
    const m: Record<number, string> = {
      0: '00:00',
      [duration]: formatTime(duration),
    };
    timeList.forEach(t => {
      const seconds = parseTimeToSeconds(t);
      if (seconds > 0 && seconds < duration) {
        m[seconds] = '';
      }
    });
    return m;
  }, [duration, timeList]);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#134E4A' }}>
            当前时间: {formatTime(currentTime)}
          </span>
          <Space>
            <Button type="primary" icon={<Plus size={14} />} onClick={handleAddTime}>
              添加时间点
            </Button>
          </Space>
        </div>
        
        <Slider
          value={currentTime}
          onChange={setCurrentTime}
          min={0}
          max={duration || 60}
          step={0.1}
          marks={marks}
          tooltip={{ formatter: (v) => formatTime(v || 0) }}
        />
      </div>

      {timeList.length > 0 && (
        <div style={{ 
          padding: 12, 
          background: '#F8FAFC', 
          borderRadius: 8, 
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              已选择 {timeList.length} 个时间点
            </span>
            <Button size="small" danger icon={<Trash2 size={12} />} onClick={handleClearAll}>
              清空
            </Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {timeList.map((time) => (
              <Tag 
                key={time} 
                closable 
                onClose={() => handleRemoveTime(time)}
                style={{ margin: 0, cursor: 'pointer' }}
                color="blue"
                onClick={() => setCurrentTime(parseTimeToSeconds(time))}
              >
                {time}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}