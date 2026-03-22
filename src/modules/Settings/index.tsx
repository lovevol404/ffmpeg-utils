import { useEffect, useState } from 'react';
import { Card, Radio, Space, Spin, Alert, Descriptions, Tag, Button, Divider, Input, message, Modal, Typography } from 'antd';
import { Cpu, Zap, RefreshCw, Info, Bot, Save, FolderOpen, HardDrive, Download, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { GPU_DISPLAY_NAMES, GPUType } from '@/types/gpu';
import { getEncoderDisplayName } from '@/utils/encoder';
import type { AIConfig, WhisperModelInfo, DownloadModelProgress, CUDAStatus } from '@/types/ai';

const { Paragraph, Text } = Typography;

// Helper to open URL in system browser
const openInBrowser = (url: string) => {
  window.electronAPI?.fs?.openUrl?.(url);
};

export default function SettingsModule() {
  const { gpuAcceleration, detectedGPU, setGPUAcceleration, setDetectedGPU } = useAppStore();
  const [detecting, setDetecting] = useState(false);
  
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  });
  const [savingAI, setSavingAI] = useState(false);
  
  // Whisper model configuration
  const [whisperModelPath, setWhisperModelPath] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<WhisperModelInfo[]>([]);
  const [defaultModelDir, setDefaultModelDir] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [cudaStatus, setCudaStatus] = useState<CUDAStatus | null>(null);
  const [loadingCudaStatus, setLoadingCudaStatus] = useState(false);

  useEffect(() => {
    loadAIConfig();
    loadWhisperConfig();
    loadCudaStatus();
  }, []);

  const loadAIConfig = async () => {
    const config = await window.electronAPI?.store.get('aiConfig');
    if (config) {
      setAiConfig(config as AIConfig);
    }
  };

  const handleSaveAIConfig = async () => {
    setSavingAI(true);
    try {
      await window.electronAPI?.store.set('aiConfig', aiConfig);
      
      const result = await window.electronAPI?.ai.configure(aiConfig);
      if (result?.success) {
        message.success('AI 配置已保存');
      } else {
        message.error(result?.error || '配置失败');
      }
    } catch (err) {
      message.error('保存配置失败');
    } finally {
      setSavingAI(false);
    }
  };

  const loadWhisperConfig = async () => {
    const path = await window.electronAPI?.store.get('whisperModelPath');
    if (path) {
      setWhisperModelPath(path as string);
    }
    await loadAvailableModels(path as string | undefined);
  };

  const loadAvailableModels = async (modelPath?: string) => {
    setLoadingModels(true);
    try {
      const result = await window.electronAPI?.ai.getAvailableModels(modelPath);
      if (result?.success && result.data) {
        setAvailableModels(result.data.models);
        setDefaultModelDir(result.data.defaultModelDir);
      }
    } catch (err) {
      console.error('Failed to load available models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSelectModelPath = async () => {
    const path = await window.electronAPI?.fs.selectFolder();
    if (path) {
      setWhisperModelPath(path);
      await window.electronAPI?.store.set('whisperModelPath', path);
      await loadAvailableModels(path);
      message.success(`模型目录已设置: ${path}`);
    }
  };

  const handleClearModelPath = async () => {
    setWhisperModelPath('');
    await window.electronAPI?.store.delete('whisperModelPath');
    await loadAvailableModels();
    message.success('已恢复使用默认模型目录');
  };

  const loadCudaStatus = async () => {
    setLoadingCudaStatus(true);
    try {
      const status = await window.electronAPI?.ai.getCUDAStatus();
      setCudaStatus(status || null);
    } catch (err) {
      console.error('Failed to load CUDA status:', err);
    } finally {
      setLoadingCudaStatus(false);
    }
  };

  const handleDownloadModel = async (modelSize: string) => {
    // First get download info
    const infoResult = await window.electronAPI?.ai.getModelDownloadInfo(modelSize);
    
    if (infoResult?.success && infoResult.data) {
      const info = infoResult.data;
      
      Modal.confirm({
        width: 600,
        title: `下载 ${modelSize.toUpperCase()} 模型`,
        icon: null,
        content: (
          <div>
            <Alert
              type="info"
              showIcon
              message="自动下载可能因网络问题失败，可使用下方链接手动下载"
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>模型大小:</Text> {info.estimatedSize}
            </div>
            
            <Divider style={{ margin: '12px 0' }}>下载方式</Divider>
            
            <div style={{ marginBottom: 12 }}>
              <Text strong>方式1: 浏览器下载 (推荐)</Text>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text code style={{ flex: 1 }}>{info.huggingfaceUrl}</Text>
                <Button 
                  size="small" 
                  icon={<ExternalLink size={14} />}
                  onClick={() => openInBrowser(info.huggingfaceUrl)}
                >
                  打开
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                点击「打开」在浏览器中下载所有文件，然后放到模型存储目录中
              </Text>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <Text strong>方式2: Hugging Face CLI</Text>
              <Paragraph 
                copyable={{ text: `huggingface-cli download ${info.repoId} --local-dir ./whisper-${modelSize}` }}
                style={{ marginTop: 8, background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, marginBottom: 0 }}
              >
                huggingface-cli download {info.repoId} --local-dir ./whisper-{modelSize}
              </Paragraph>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <Text strong>方式3: Git Clone</Text>
              <Paragraph 
                copyable={{ text: `git clone https://huggingface.co/${info.repoId} whisper-${modelSize}` }}
                style={{ marginTop: 8, background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, marginBottom: 0 }}
              >
                git clone https://huggingface.co/{info.repoId} whisper-{modelSize}
              </Paragraph>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Alert
              type="warning"
              showIcon
              message="手动下载后"
              description={
                <span>
                  请将下载的模型文件夹放到: <Text code copyable={{ text: whisperModelPath || defaultModelDir || '~/.cache/huggingface/hub' }}>{whisperModelPath || defaultModelDir || '~/.cache/huggingface/hub'}</Text>
                </span>
              }
            />
          </div>
        ),
        okText: '尝试自动下载',
        cancelText: '关闭',
        onOk: async () => {
          await executeDownloadModel(modelSize);
        },
      });
    } else {
      // Fallback if we can't get download info
      Modal.confirm({
        title: `下载 ${modelSize.toUpperCase()} 模型`,
        content: (
          <div>
            <p>即将下载 Whisper {modelSize} 模型。</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
              模型大小: {modelSize === 'tiny' ? '~75MB' : modelSize === 'base' ? '~150MB' : modelSize === 'small' ? '~500MB' : modelSize === 'medium' ? '~1.5GB' : '~3GB'}
            </p>
          </div>
        ),
        onOk: async () => {
          await executeDownloadModel(modelSize);
        },
      });
    }
  };

  const executeDownloadModel = async (modelSize: string) => {
    const hide = message.loading(`正在下载 ${modelSize} 模型...`, 0);
    
    try {
      // Set up progress listener
      const progressHandler = (progress: DownloadModelProgress) => {
        message.info(progress.message);
      };
      window.electronAPI?.ai.onDownloadModelProgress(progressHandler);
      
      const result = await window.electronAPI?.ai.downloadModel({
        modelSize,
        modelPath: whisperModelPath || undefined,
      });
      
      window.electronAPI?.ai.removeDownloadModelProgressListener();
      
      if (result?.success) {
        message.success(`模型 ${modelSize} 下载成功！`);
        await loadAvailableModels(whisperModelPath || undefined);
      } else {
        // Show error with option to download manually
        message.error(result?.error || '下载失败');
        const errorUrl = `https://huggingface.co/Systran/faster-whisper-${modelSize}/tree/main`;
        Modal.error({
          title: '自动下载失败',
          content: (
            <div>
              <p>错误: {result?.error || '未知错误'}</p>
              <p style={{ marginTop: 12 }}>请尝试手动下载:</p>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text code style={{ flex: 1 }}>{errorUrl}</Text>
                <Button 
                  size="small" 
                  icon={<ExternalLink size={14} />}
                  onClick={() => openInBrowser(errorUrl)}
                >
                  打开
                </Button>
              </div>
            </div>
          ),
        });
      }
    } catch (err) {
      message.error(`下载出错: ${(err as Error).message}`);
    } finally {
      hide();
    }
  };

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

      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={20} />
            AI 配置
          </span>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#134E4A' }}>
              API Key
            </label>
            <Input.Password
              value={aiConfig.apiKey}
              onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#134E4A' }}>
              API Base URL
            </label>
            <Input
              value={aiConfig.baseUrl}
              onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              支持自定义 OpenAI 兼容的 API 地址
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#134E4A' }}>
              模型
            </label>
            <Input
              value={aiConfig.model}
              onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              placeholder="gpt-4, gpt-4-turbo, gpt-3.5-turbo, ..."
            />
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              常用模型: gpt-4, gpt-4-turbo, gpt-3.5-turbo 等
            </div>
          </div>

          <Button
            type="primary"
            icon={<Save size={16} />}
            onClick={handleSaveAIConfig}
            loading={savingAI}
          >
            保存配置
          </Button>

          <Alert
            type="info"
            showIcon
            icon={<Info size={16} />}
            message="提示"
            description={
              <div>
                <p style={{ margin: 0 }}>• API Key 用于访问 OpenAI API</p>
                <p style={{ margin: '8px 0 0 0' }}>• 可使用 OpenAI 兼容的第三方服务</p>
                <p style={{ margin: '8px 0 0 0' }}>• 配置保存后需要重启 AI 服务生效</p>
              </div>
            }
          />
        </Space>
      </Card>

      <Card
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={20} />
            Whisper 语音识别模型
          </span>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#134E4A' }}>
              模型存储目录
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={whisperModelPath}
                readOnly
                placeholder={defaultModelDir || '使用系统默认缓存目录'}
                style={{ flex: 1 }}
              />
              <Button
                icon={<FolderOpen size={16} />}
                onClick={handleSelectModelPath}
              >
                选择目录
              </Button>
              {whisperModelPath && (
                <Button onClick={handleClearModelPath}>
                  重置
                </Button>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              默认目录: {defaultModelDir || '加载中...'}
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }}>GPU 加速</Divider>

          {loadingCudaStatus ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin tip="检测 CUDA 状态..." />
            </div>
          ) : cudaStatus?.available ? (
            <Alert
              type="success"
              showIcon
              icon={<Zap size={16} />}
              message={
                <span>
                  CUDA 可用 - <strong>{cudaStatus.gpuName}</strong>
                  {cudaStatus.cudaVersion && (
                    <Tag color="green" style={{ marginLeft: 8 }}>CUDA {cudaStatus.cudaVersion}</Tag>
                  )}
                </span>
              }
              description="语音识别将使用 GPU 加速，大幅提升转录速度"
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message="CUDA 不可用"
              description={
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>{cudaStatus?.errorMessage || '未检测到 CUDA 环境'}</p>
                  {cudaStatus?.installInstructions && (
                    <>
                      <div style={{ marginTop: 8 }}>
                        {cudaStatus.installInstructions.steps.map((step, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{step}</div>
                        ))}
                      </div>
                      {cudaStatus.installInstructions.pytorchCommand && (
                        <Paragraph 
                          copyable={{ text: cudaStatus.installInstructions.pytorchCommand }}
                          style={{ marginTop: 12, background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, marginBottom: 8 }}
                        >
                          {cudaStatus.installInstructions.pytorchCommand}
                        </Paragraph>
                      )}
                      {cudaStatus.installInstructions.downloadUrls && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {Object.entries(cudaStatus.installInstructions.downloadUrls).map(([name, url]) => (
                            <Button
                              key={name}
                              size="small"
                              icon={<ExternalLink size={12} />}
                              onClick={() => openInBrowser(url)}
                            >
                              {name === 'cudaToolkit' ? 'CUDA Toolkit' : 
                               name === 'cudnn' ? 'cuDNN' : 
                               name === 'pytorch' ? 'PyTorch' : 
                               name === 'nvidiaDriver' ? 'NVIDIA 驱动' : name}
                            </Button>
                          ))}
                        </div>
                      )}
                      {cudaStatus.installInstructions.note && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                          {cudaStatus.installInstructions.note}
                        </div>
                      )}
                    </>
                  )}
                </div>
              }
            />
          )}

          <Divider style={{ margin: '12px 0' }}>可用模型</Divider>

          {loadingModels ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin tip="加载模型列表..." />
            </div>
          ) : (
            <div>
              {availableModels.map((model) => (
                <div
                  key={model.size}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    marginBottom: 8,
                    background: model.available ? '#F0FDF4' : '#FFFFFF',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ textTransform: 'capitalize' }}>{model.size}</span>
                      {model.available ? (
                        <Tag color="success" icon={<CheckCircle size={12} />}>已下载</Tag>
                      ) : (
                        <Tag color="default" icon={<XCircle size={12} />}>未下载</Tag>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {model.available ? (
                        <span>来源: {model.source === 'local' ? '本地目录' : '系统缓存'}</span>
                      ) : (
                        <span>
                          大小: {model.size === 'tiny' ? '~75MB' : model.size === 'base' ? '~150MB' : model.size === 'small' ? '~500MB' : model.size === 'medium' ? '~1.5GB' : '~3GB'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {model.available ? (
                      <Tag color="green">可用</Tag>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        icon={<Download size={14} />}
                        onClick={() => handleDownloadModel(model.size)}
                      >
                        下载
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert
            type="info"
            showIcon
            icon={<Info size={16} />}
            message="提示"
            description={
              <div>
                <p style={{ margin: 0 }}>• Base 模型 (~150MB) 推荐日常使用，速度和质量平衡最佳</p>
                <p style={{ margin: '8px 0 0 0' }}>• Large-v3 质量最好，但需要 ~10GB 显存</p>
                <p style={{ margin: '8px 0 0 0' }}>• 自定义目录可方便管理多个版本的模型</p>
              </div>
            }
          />
        </Space>
      </Card>
    </div>
  );
}