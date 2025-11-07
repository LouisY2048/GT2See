import { Card, Row, Col, Button, Space, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { 
  StockOutlined,
  HomeOutlined,
  ExperimentOutlined,
  FundOutlined,
  GlobalOutlined,
  RocketOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons'

const Home = () => {
  const navigate = useNavigate()

  const go = (path: string) => navigate(path)

  return (
    <div className="fade-in">
      <div
        style={{
          margin: '-24px -24px 24px -24px',
          padding: '48px 32px',
          borderRadius: '16px',
          background:
            'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%), radial-gradient(1200px 600px at 100% 0%, rgba(79,172,254,0.15), rgba(0,0,0,0))',
          border: '1px solid rgba(102,126,234,0.25)'
        }}
      >
        <Row align="middle" gutter={[24, 24]}>
          <Col flex="auto">
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 0.5 }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                GT2See
              </span>
              <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 18, fontWeight: 600 }}>
                Galactic Tycoons · 数据与智能分析中心
              </span>
            </div>
            <div style={{ marginTop: 8, color: '#666' }}>
              市场 · 配方 · 建筑 · 人口 · 星系，一站式洞察与决策。
            </div>
            <Space size={12} style={{ marginTop: 24 }} wrap>
              <Button type="primary" size="large" shape="round" onClick={() => go('/market')}>
                立即查看市场
              </Button>
              <Button size="large" shape="round" onClick={() => go('/comprehensive')} icon={<RocketOutlined />}>
                探索综合收益
              </Button>
              <Tag color="purple" style={{ borderRadius: 999, padding: '6px 12px' }}>持续更新中</Tag>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable onClick={() => go('/market')} style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <StockOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>市场概览</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>全量材料价格总览、价差排序、快速定位交易机会。</div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable onClick={() => go('/buildings')} style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <HomeOutlined style={{ fontSize: 22, color: '#52c41a' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>建筑分析</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>建造成本明细与占比可视化，价格未知智能标注。</div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable onClick={() => go('/recipes')} style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <ExperimentOutlined style={{ fontSize: 22, color: '#fa8c16' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>配方分析</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>收益/时均收益/ROI，肥力与丰度动态效率，市场规模洞察。</div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable onClick={() => go('/comprehensive')} style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <FundOutlined style={{ fontSize: 22, color: '#722ed1' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>综合收益分析</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>劳动力消耗+扩张惩罚+配方收益，完整盈利评估与饼图。</div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable onClick={() => go('/systems')} style={{ borderRadius: 16 }}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <GlobalOutlined style={{ fontSize: 22, color: '#13c2c2' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>星系规划</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>高级搜索、丰度/肥力阈值与距离估算，筛到最佳目标。</div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card hoverable style={{ borderRadius: 16 }} onClick={() => {}}>
            <Space direction="vertical" size={8}>
              <Space size={10}>
                <AppstoreAddOutlined style={{ fontSize: 22, color: '#f5222d' }} />
                <span style={{ fontSize: 18, fontWeight: 700 }}>更多项目（预留）</span>
              </Space>
              <div style={{ color: '#8c8c8c' }}>为未来的分析模块与工具预留入口位，随时扩展。</div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Home


