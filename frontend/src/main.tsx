import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import App from './App'
import './i18n'
import './index.css'
import './styles/animations.css'

const AppWithLocale = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'zh-CN')
  const antdLocale = language === 'en-US' ? enUS : zhCN

  // 监听 localStorage 中的语言变化
  useEffect(() => {
    // 监听自定义语言变化事件
    const handleLanguageChange = (e: CustomEvent<string>) => {
      setLanguage(e.detail)
    }

    // 监听 storage 事件（跨标签页）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language' && e.newValue) {
        setLanguage(e.newValue)
      }
    }

    window.addEventListener('languagechange', handleLanguageChange as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <ConfigProvider 
      locale={antdLocale} 
      key={language} // 添加 key 以强制重新渲染 ConfigProvider
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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithLocale />
  </React.StrictMode>,
)

