import { useEffect, useState } from 'react';
import { Card, Radio, Space, Spin, Alert, Descriptions, Tag, Button, Divider } from 'antd';
import { Cpu, Zap, RefreshCw, Info } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { GPU_DISPLAY_NAMES, GPUType } from '@/types/gpu';
import { getEncoderDisplayName } from '@/utils/encoder';

export default function SettingsModule() {
  const { gpuAcceleration, detectedGPU, setGPUAcceleration, setDetectedGPU } = useAppStore();
  const [detecting, setDetecting] = useState(false);

  const handleDetectGPU = async () => {
    if (!window.electronAPI?.gpu) return;
    
    setDetecting(true);
    try {
      const result = await window.electronAPI.gpu.detect();
      setDetectedGPU(result);
    } catch (err) {
      console.error('GPU detection failed:', err);
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (!detectedGPU && window.electronAPI?.gpu) {
      handleDetectGPU();
    }
  }, []);

  const gpuOptions: Array<{ value: GPUType | 'auto'; label: string; description: string }> = [
    { value: 'auto', label: GPU_DISPLAY_NAMES['auto'], description: '自动检测并选择最佳硬件加速' },
    { value: 'nvenc', label: GPU_DISPLAY_NAMES['nvenc'], description: 'NVIDIA 显卡硬件编码' },
    { value: 'qsv', label: GPU_DISPLAY_NAMES['qsv'], description: 'Intel 集显/独显硬件编码' },
    { value: 'amf', label: GPU_DISPLAY_NAMES['amf'], description: 'AMD 显卡硬件编码' },
    { value: 'videotoolbox', label: GPU_DISPLAY_NAMES['videotoolbox'], description: 'macOS 硬件编码' },
    { value: 'vaapi', label: GPU_DISPLAY_NAMES['vaapi'], description: 'Linux 硬件编码' },
    { value: 'none', label: GPU_DISPLAY_NAMES['none'], description: '使用 CPU 软件编码（兼容性最好）' },
  ];

  const currentEncoder = detectedGPU?.available && (gpuAcceleration === 'auto' || gpuAcceleration === detectedGPU.type)
    ? getEncoderDisplayName(detectedGPU.encoders.h264)
    : getEncoderDisplayName('libx264');

  return (
    <div>
      <Card title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={20} />
          编码设置
        </span>
      }>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#134E4A' }}>GPU 硬件加速</span>
              <Button 
                size="small" 
                icon={<RefreshCw size={14} />} 
                onClick={handleDetectGPU}
                loading={detecting}
              >
                重新检测
              </Button>
            </div>
            
            {detecting && (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin tip="正在检测 GPU..." />
              </div>
            )}
            
            {!detecting && detectedGPU && (
              <Alert
                type="success"
                showIcon
                icon={<Zap size={16} />}
                style={{ marginBottom: 16 }}
                message={
                  <span>
                    检测到: <strong>{detectedGPU.name}</strong>
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      {GPU_DISPLAY_NAMES[detectedGPU.type]}
                    </Tag>
                  </span>
                }
              />
            )}
            
            {!detecting && !detectedGPU && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="未检测到支持的 GPU，将使用 CPU 编码"
              />
            )}
            
            <Radio.Group
              value={gpuAcceleration}
              onChange={(e) => setGPUAcceleration(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {gpuOptions.map((option) => {
                  const isDisabled = option.value !== 'auto' && 
                    option.value !== 'none' && 
                    (!detectedGPU || detectedGPU.type !== option.value);
                  
                  return (
                    <Radio 
                      key={option.value} 
                      value={option.value}
                      disabled={isDisabled}
                      style={{
                        padding: '12px 16px',
                        border: `1px solid ${gpuAcceleration === option.value ? '#0D9488' : '#E2E8F0'}`,
                        borderRadius: 8,
                        background: gpuAcceleration === option.value ? '#E6FFFA' : '#FFFFFF',
                        width: '100%',
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 500 }}>{option.label}</span>
                        {option.value === 'auto' && detectedGPU?.available && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>推荐</Tag>
                        )}
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                          {option.description}
                          {isDisabled && option.value !== 'none' && option.value !== 'auto' && (
                            <span style={{ color: '#EF4444', marginLeft: 8 }}>(不可用)</span>
                          )}
                        </div>
                      </div>
                    </Radio>
                  );
                })}
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          <div>
            <Descriptions title="当前配置" column={1} bordered size="small">
              <Descriptions.Item label="硬件加速模式">
                {GPU_DISPLAY_NAMES[gpuAcceleration]}
              </Descriptions.Item>
              <Descriptions.Item label="检测到的 GPU">
                {detectedGPU ? detectedGPU.name : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="当前编码器">
                <Tag color="blue">{currentEncoder}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Alert
            type="info"
            showIcon
            icon={<Info size={16} />}
            message="提示"
            description={
              <div>
                <p style={{ margin: 0 }}>• GPU 加速可提升 3-10 倍编码速度</p>
                <p style={{ margin: '8px 0 0 0' }}>• GPU 编码质量可能略低于 CPU 编码</p>
                <p style={{ margin: '8px 0 0 0' }}>• 如遇编码问题，可尝试切换到 CPU 编码</p>
              </div>
            }
          />
        </Space>
      </Card>
    </div>
  );
}