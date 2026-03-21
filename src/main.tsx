import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/global.css';

const theme = {
  token: {
    colorPrimary: '#0D9488',
    colorSuccess: '#22C55E',
    colorWarning: '#F97316',
    colorError: '#EF4444',
    colorInfo: '#0D9488',
    borderRadius: 8,
    fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);