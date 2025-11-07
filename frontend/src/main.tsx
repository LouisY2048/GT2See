import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN} 
      theme={{
        token: {
          colorPrimary: '#667eea',
          colorInfo: '#667eea',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#f5222d',
          borderRadius: 12,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        },
        components: {
          Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 4px 16px rgba(0, 0, 0, 0.08)',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Table: {
            borderRadius: 12,
            headerBg: '#fafafa',
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)

