import { Button, Row, Col, Card, Space, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { RocketOutlined, StarOutlined, AppstoreOutlined } from '@ant-design/icons'

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #000 0%, #05070d 100%)',
      padding: '64px 32px'
    }}>
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
            商业模拟工具平台
          </div>
          <div style={{ color: '#8ec7ff', marginTop: 8, fontSize: 16 }}>
            多项目数据与智能分析入口 · 与银河同速增长的商业洞察
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
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1aa3ff' }}>GT2See · 市场/生产分析套件</div>
              <div style={{ color: '#8ec7ff', marginTop: 6 }}>市场概览、建筑/配方/综合收益、星系规划，完整数据洞察。</div>
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
                  进入 GT2See
                </Button>
                <Button size="large" shape="round" icon={<StarOutlined />} onClick={() => window.open('https://wiki.galactictycoons.com', '_blank')}
                  style={{ color: '#8ec7ff', borderColor: '#fff', background: 'rgba(255,255,255,0.02)' }}
                >
                  官方文档
                </Button>
                <Button size="large" shape="round" onClick={() => window.open('https://g2.galactictycoons.com/', '_blank')}
                  style={{ color: '#8ec7ff', borderColor: '#fff', background: 'rgba(255,255,255,0.02)' }}
                >
                  进入游戏
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
        <div style={{ color: '#8ec7ff', textAlign: 'center', marginBottom: 32 }}>未完待续......</div>

        {/* 可扩展区（当前隐藏卡片，仅保留提示） */}
      </div>
    </div>
  )
}

export default Landing


