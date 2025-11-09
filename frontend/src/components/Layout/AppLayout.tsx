import { useState, useEffect } from 'react'
import { Layout, Menu, Drawer, Button } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  StockOutlined,
  HomeOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  FundOutlined,
  MenuOutlined,
  GlobalOutlined as LanguageOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Header, Content, Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [language, setLanguage] = useState(i18n.language)
  const navigate = useNavigate()
  const location = useLocation()
  
  // 同步语言状态
  useEffect(() => {
    setLanguage(i18n.language)
  }, [i18n.language])

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setDrawerVisible(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key)
    if (isMobile) {
      setDrawerVisible(false)
    }
  }

  const handleLanguageChange = () => {
    const newLanguage = language === 'zh-CN' ? 'en-US' : 'zh-CN'
    setLanguage(newLanguage)
    i18n.changeLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
    // 触发自定义事件通知 ConfigProvider 更新
    window.dispatchEvent(new CustomEvent('languagechange', { detail: newLanguage }))
  }

  const menuItems: MenuItem[] = [
    {
      key: '/market',
      icon: <StockOutlined />,
      label: t('layout.marketOverview'),
    },
    {
      key: '/buildings',
      icon: <HomeOutlined />,
      label: t('layout.buildingAnalysis'),
    },
    {
      key: '/recipes',
      icon: <ExperimentOutlined />,
      label: t('layout.recipeAnalysis'),
    },
    {
      key: '/comprehensive',
      icon: <FundOutlined />,
      label: t('layout.comprehensiveAnalysis'),
    },
    {
      key: '/systems',
      icon: <GlobalOutlined />,
      label: t('layout.systemPlanning'),
    },
  ]

  return (
    <Layout className="app-layout" style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px',
        background: 'linear-gradient(135deg, rgba(17, 25, 40, 0.95) 0%, rgba(27, 38, 59, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        height: isMobile ? '56px' : '72px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '16px',
        }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: 'white', fontSize: '20px' }} />}
              onClick={() => setDrawerVisible(true)}
              style={{ marginRight: 8 }}
            />
          )}
          <div 
            onClick={() => navigate('/portal')}
            style={{ 
              color: 'white', 
              fontSize: isMobile ? '20px' : '28px', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '16px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: '4px 8px',
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <CalculatorOutlined style={{ 
              fontSize: isMobile ? '24px' : '32px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.5))',
            }} />
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>GT2See</span>
          </div>
          {!isMobile && (
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '14px', 
              marginLeft: '24px',
              letterSpacing: '0.5px',
            }}>
              {t('layout.title')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="text"
            icon={<LanguageOutlined style={{ 
              color: 'white', 
              fontSize: '18px',
              transition: 'transform 0.3s ease',
            }} />}
            onClick={handleLanguageChange}
            className="language-switch-btn"
            style={{
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
              const icon = e.currentTarget.querySelector('svg')
              if (icon) {
                icon.style.transform = 'rotate(15deg)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
              const icon = e.currentTarget.querySelector('svg')
              if (icon) {
                icon.style.transform = 'rotate(0deg)'
              }
            }}
          >
            <span style={{ 
              marginLeft: '6px',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
            }}>
              {language === 'zh-CN' ? 'EN' : '中文'}
            </span>
          </Button>
        </div>
      </Header>
      <Layout style={{ background: 'transparent' }}>
        {/* 桌面端侧边栏 */}
        {!isMobile && (
          <Sider 
            collapsible 
            collapsed={collapsed} 
            onCollapse={setCollapsed}
            style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRight: '1px solid rgba(0, 0, 0, 0.06)',
              marginTop: '16px',
              marginLeft: '16px',
              marginBottom: '16px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ 
                height: '100%', 
                borderRight: 0,
                background: 'transparent',
                fontSize: '15px',
              }}
            />
          </Sider>
        )}
        
        {/* 移动端抽屉 */}
        {isMobile && (
          <Drawer
            title={t('layout.menu')}
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            bodyStyle={{ padding: 0 }}
            width={280}
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ 
                height: '100%', 
                borderRight: 0,
                background: 'transparent',
                fontSize: '15px',
              }}
            />
          </Drawer>
        )}

        <Layout style={{ padding: isMobile ? '8px' : '16px 16px 16px 0', background: 'transparent' }}>
          <Content
            style={{
              padding: isMobile ? 16 : 32,
              margin: 0,
              minHeight: 280,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: isMobile ? 12 : 20,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default AppLayout

