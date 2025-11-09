import { useState, useEffect } from 'react'
import { Button, Row, Col, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RocketOutlined, StarOutlined, GlobalOutlined } from '@ant-design/icons'

const Landing = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [language, setLanguage] = useState(i18n.language)

  useEffect(() => {
    setLanguage(i18n.language)
  }, [i18n.language])

  const handleLanguageChange = () => {
    const newLanguage = language === 'zh-CN' ? 'en-US' : 'zh-CN'
    setLanguage(newLanguage)
    i18n.changeLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
    // 触发自定义事件通知 ConfigProvider 更新
    window.dispatchEvent(new CustomEvent('languagechange', { detail: newLanguage }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #000 0%, #05070d 100%)',
      padding: '64px 32px'
    }}>
      {/* 右上角语言切换按钮 */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '32px',
        zIndex: 1000,
      }}>
        <Button
          type="text"
          icon={<GlobalOutlined style={{ 
            color: '#8ec7ff', 
            fontSize: '18px',
            transition: 'transform 0.3s ease',
          }} />}
          onClick={handleLanguageChange}
          style={{
            color: '#8ec7ff',
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
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 163, 255, 0.3)'
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
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease',
          }}>
            {language === 'zh-CN' ? 'EN' : '中文'}
          </span>
        </Button>
      </div>
      {/* 动态星空背景 */}
      <style>{`
        @keyframes drift {
          0% { transform: translateY(0px); opacity: 0.8; }
          50% { transform: translateY(-20px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 0.8; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0)) ,\
           radial-gradient(1.5px 1.5px at 60% 20%, rgba(255,255,255,0.7), rgba(255,255,255,0)) ,\
           radial-gradient(1.2px 1.2px at 80% 70%, rgba(255,255,255,0.6), rgba(255,255,255,0)) ,\
           radial-gradient(1.8px 1.8px at 30% 80%, rgba(255,255,255,0.7), rgba(255,255,255,0))',
        animation: 'twinkle 3.5s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        left: '-10%',
        top: '20%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 50%, rgba(25,167,255,0.12), rgba(25,167,255,0))',
        filter: 'blur(12px)',
        animation: 'drift 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        right: '-8%',
        top: '-5%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.12), rgba(14,165,233,0))',
        filter: 'blur(10px)',
        animation: 'drift 10s ease-in-out infinite'
      }} />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero */}
        <style>{`
          @keyframes titleShine {
            0% { text-shadow: 0 0 12px rgba(26,163,255,0.35), 0 0 24px rgba(26,163,255,0.15); }
            50% { text-shadow: 0 0 22px rgba(26,163,255,0.6), 0 0 44px rgba(26,163,255,0.3); }
            100% { text-shadow: 0 0 12px rgba(26,163,255,0.35), 0 0 24px rgba(26,163,255,0.15); }
          }
          @keyframes horizonGlow {
            0% { opacity: .4; transform: translateY(0) scaleX(1); }
            50% { opacity: .9; transform: translateY(-6px) scaleX(1.05); }
            100% { opacity: .4; transform: translateY(0) scaleX(1); }
          }
        `}</style>
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '56px',
            width: 520,
            height: 140,
            transform: 'translateX(-50%)',
            background: 'radial-gradient(closest-side, rgba(26,163,255,0.45), rgba(26,163,255,0.1), rgba(0,0,0,0))',
            filter: 'blur(10px)',
            borderTop: '1px solid #fff',
            borderRadius: '50% / 30%',
            animation: 'horizonGlow 5.5s ease-in-out infinite'
          }} />
          <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: 1, color: '#1aa3ff', animation: 'titleShine 3.8s ease-in-out infinite' }}>
            {t('landing.title')}
          </div>
          <div style={{ color: '#8ec7ff', marginTop: 8, fontSize: 16 }}>
            {t('landing.subtitle')}
          </div>
        </div>

        {/* GT2See 专属大框 */}
        <div style={{
          border: '2px solid #fff',
          borderRadius: 16,
          padding: 24,
          background: 'rgba(255,255,255,0.02)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          marginBottom: 24
        }}>
          <Row align="middle" gutter={[24, 24]}>
            <Col flex="auto">
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1aa3ff' }}>{t('landing.appTitle')}</div>
              <div style={{ color: '#8ec7ff', marginTop: 6 }}>{t('landing.appDescription')}</div>
            </Col>
            <Col>
              <Space size={12} wrap>
                <Button type="primary" size="large" shape="round" icon={<RocketOutlined />} onClick={() => navigate('/market')}
                  style={{
                    background: 'linear-gradient(135deg, #1aa3ff 0%, #0a66ff 100%)',
                    border: '1px solid #fff',
                    boxShadow: '0 8px 24px rgba(26,163,255,0.35)'
                  }}
                >
                  {t('landing.enterApp')}
                </Button>
                <Button size="large" shape="round" icon={<StarOutlined />} onClick={() => window.open('https://wiki.galactictycoons.com', '_blank')}
                  style={{ color: '#8ec7ff', borderColor: '#fff', background: 'rgba(255,255,255,0.02)' }}
                >
                  {t('landing.officialDocs')}
                </Button>
                <Button size="large" shape="round" onClick={() => window.open('https://g2.galactictycoons.com/', '_blank')}
                  style={{ color: '#8ec7ff', borderColor: '#fff', background: 'rgba(255,255,255,0.02)' }}
                >
                  {t('landing.enterGame')}
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div style={{ color: '#8ec7ff', textAlign: 'center', marginBottom: 32 }}>{t('landing.toBeContinued')}</div>

        {/* 可扩展区（当前隐藏卡片，仅保留提示） */}
      </div>
    </div>
  )
}

export default Landing


