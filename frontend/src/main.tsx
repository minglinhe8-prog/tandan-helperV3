import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#00A65E',
          borderRadius: 8,
          colorLink: '#00A65E',
          colorLinkHover: '#00804A',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: {
            colorPrimary: '#00A65E',
            colorPrimaryHover: '#00804A',
            colorPrimaryActive: '#006B3D',
            borderRadius: 8,
          },
          Card: { borderRadiusLG: 12 },
          Select: { borderRadius: 6 },
          Input: { borderRadius: 6 },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
