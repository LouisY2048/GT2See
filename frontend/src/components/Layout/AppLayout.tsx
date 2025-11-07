import { useState } from 'react'
import { Layout, Menu, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  StockOutlined,
  HomeOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  FundOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Header, Content, Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

const menuItems: MenuItem[] = [
  {
    key: '/market',
    icon: <StockOutlined />,
    label: '市场概览',
  },
  {
    key: '/buildings',
    icon: <HomeOutlined />,
    label: '建筑分析',
  },
  {
    key: '/recipes',
    icon: <ExperimentOutlined />,
    label: '配方分析',
  },
  {
    key: '/comprehensive',
    icon: <FundOutlined />,
    label: '综合收益分析',
  },
  {
    key: '/systems',
    icon: <GlobalOutlined />,
    label: '星系规划',
  },
]

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key)
  }

  return (
    <Layout className="app-layout" style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 32px',
        background: 'linear-gradient(135deg, rgba(17, 25, 40, 0.95) 0%, rgba(27, 38, 59, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        height: '72px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '28px', 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          <CalculatorOutlined style={{ 
            fontSize: '32px', 
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
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '14px', 
          marginLeft: '24px',
          letterSpacing: '0.5px',
        }}>
          Galactic Tycoons 市场分析工具
        </div>
      </Header>
      <Layout style={{ background: 'transparent' }}>
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
        <Layout style={{ padding: '16px 16px 16px 0', background: 'transparent' }}>
          <Content
            style={{
              padding: 32,
              margin: 0,
              minHeight: 280,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
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

