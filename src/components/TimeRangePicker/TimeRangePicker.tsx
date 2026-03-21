import { useState, useEffect } from 'react';
import { Slider, Input, Row, Col, Typography } from 'antd';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
  maxDuration?: number;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(time, 10) || 0;
}

function formatSecondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TimeRangePicker({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  maxDuration = 600,
}: TimeRangePickerProps) {
  const [localStart, setLocalStart] = useState(() => parseTimeToSeconds(startTime));
  const [localEnd, setLocalEnd] = useState(() => parseTimeToSeconds(endTime));

  useEffect(() => {
    setLocalStart(parseTimeToSeconds(startTime));
  }, [startTime]);

  useEffect(() => {
    setLocalEnd(parseTimeToSeconds(endTime));
  }, [endTime]);

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const seconds = parseTimeToSeconds(value);
    if (!isNaN(seconds) && seconds >= 0 && seconds <= maxDuration) {
      setLocalStart(seconds);
      if (seconds <= localEnd) {
        onStartChange(value);
      }
    }
  };

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const seconds = parseTimeToSeconds(value);
    if (!isNaN(seconds) && seconds >= 0 && seconds <= maxDuration) {
      setLocalEnd(seconds);
      if (seconds >= localStart) {
        onEndChange(value);
      }
    }
  };

  const handleStartBlur = () => {
    if (localStart > localEnd) {
      setLocalStart(localEnd);
      onStartChange(formatSecondsToTime(localEnd));
    }
  };

  const handleEndBlur = () => {
    if (localEnd < localStart) {
      setLocalEnd(localStart);
      onEndChange(formatSecondsToTime(localStart));
    }
  };

  const duration = localEnd - localStart;

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
            开始时间
          </label>
          <Input
            value={startTime}
            onChange={handleStartInputChange}
            onBlur={handleStartBlur}
            placeholder="00:00:00"
            style={{ borderRadius: 8 }}
          />
        </Col>
        <Col span={12}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748B' }}>
            结束时间
          </label>
          <Input
            value={endTime}
            onChange={handleEndInputChange}
            onBlur={handleEndBlur}
            placeholder="00:00:10"
            style={{ borderRadius: 8 }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16, padding: '0 4px' }}>
        <Slider
          range
          min={0}
          max={maxDuration}
          value={[localStart, localEnd]}
          onChange={([start, end]) => {
            setLocalStart(start);
            setLocalEnd(end);
          }}
          onChangeComplete={([start, end]) => {
            onStartChange(formatSecondsToTime(start));
            onEndChange(formatSecondsToTime(end));
          }}
          tooltip={{ formatter: (value) => value !== undefined ? formatSecondsToTime(value) : '' }}
        />
      </div>

      <div style={{ marginTop: 8, padding: '8px 12px', background: '#F0FDFA', borderRadius: 8, textAlign: 'center' }}>
        <Typography.Text style={{ color: '#134E4A', fontSize: 13 }}>
          已选时长: <strong>{formatSecondsToTime(duration)}</strong>
        </Typography.Text>
      </div>
    </div>
  );
}