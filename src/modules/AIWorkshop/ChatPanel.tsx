import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Space, Avatar, Spin, Empty } from 'antd';
import { Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useAIChat } from './hooks/useAIChat';
import 'highlight.js/styles/github-dark.css';

export function ChatPanel() {
  const { messages, isLoading, sendMessage, generateWorkflow } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      title={
        <Space>
          <Bot size={18} />
          <span>AI 助手</span>
        </Space>
      }
      extra={
        <Button size="small" onClick={generateWorkflow} loading={isLoading}>
          生成工作流
        </Button>
      }
      styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0, height: 'calc(100% - 57px)' } }}
      style={{ height: '100%' }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
        }}
      >
        {messages.length === 0 ? (
          <Empty
            image={<Bot size={48} style={{ color: '#94A3B8' }} />}
            description="开始与 AI 对话，描述你的视频处理需求"
            style={{ marginTop: 80 }}
          />
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <Space align="start" style={{ maxWidth: msg.role === 'assistant' ? '90%' : '85%' }}>
                {msg.role === 'assistant' && (
                  <Avatar size={32} style={{ backgroundColor: '#0D9488', flexShrink: 0 }}>
                    <Bot size={18} />
                  </Avatar>
                )}
                <div
                  className={msg.role === 'assistant' ? 'markdown-body' : ''}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    backgroundColor: msg.role === 'user' ? '#0D9488' : '#F1F5F9',
                    color: msg.role === 'user' ? '#fff' : '#1E293B',
                    maxWidth: msg.role === 'assistant' ? '100%' : undefined,
                    overflow: 'hidden',
                  }}
                >
                  {msg.role === 'user' ? (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match;
                          return isInline ? (
                            <code
                              style={{
                                background: '#E2E8F0',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 13,
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre({ children }) {
                          return (
                            <pre
                              style={{
                                background: '#1E293B',
                                padding: 8,
                                borderRadius: 6,
                                overflow: 'auto',
                                margin: '4px 0',
                                maxWidth: '100%',
                                fontSize: 12,
                              }}
                            >
                              {children}
                            </pre>
                          );
                        },
                        p({ children }) {
                          return <p style={{ margin: '2px 0' }}>{children}</p>;
                        },
                        ul({ children }) {
                          return <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul>;
                        },
                        ol({ children }) {
                          return <ol style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ol>;
                        },
                        li({ children }) {
                          return <li style={{ margin: '1px 0' }}>{children}</li>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
                {msg.role === 'user' && (
                  <Avatar size={32} style={{ backgroundColor: '#6366F1', flexShrink: 0 }}>
                    <User size={18} />
                  </Avatar>
                )}
              </Space>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Spin />
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #E2E8F0' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="描述你的视频处理需求..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ borderRadius: '8px 0 0 8px' }}
          />
          <Button
            type="primary"
            icon={<Send size={16} />}
            onClick={handleSend}
            loading={isLoading}
            style={{ borderRadius: '0 8px 8px 0', height: 'auto' }}
          />
        </Space.Compact>
      </div>
    </Card>
  );
}