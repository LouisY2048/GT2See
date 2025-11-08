import { useState, useEffect } from 'react'
import { Card, Table, Space, Spin, message, Row, Col, Statistic, Tag, Tooltip, Alert, Modal } from 'antd'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip
} from 'recharts'
import { 
  HomeOutlined,
  DollarOutlined,
  BuildOutlined,
  ToolOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { calculatorApi, gameDataApi } from '../../services/api'
import type { BuildingCost, Material } from '../../types'
import { formatPrice, formatNumber } from '../../utils/format'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140']

const BuildingAnalysis = () => {
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [buildingCosts, setBuildingCosts] = useState<BuildingCost[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingCost | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // 响应式检测
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 获取数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const [materialsRes, costsRes] = await Promise.all([
        gameDataApi.getMaterials(),
        calculatorApi.calculateBuildingCosts()
      ])

      setMaterials((materialsRes as any).materials || [])
      setBuildingCosts((costsRes as any).buildingCosts || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 获取材料名称
  const getMaterialName = (materialId: number) => {
    const material = materials.find(m => m.id === materialId)
    return material?.name || `Material ${materialId}`
  }

  // 表格列定义（响应式）
  const columns = [
    {
      title: '建筑名称',
      dataIndex: 'buildingName',
      key: 'buildingName',
      fixed: 'left' as const,
      width: isMobile ? 150 : 200,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: isMobile ? 140 : 180,
      sorter: (a: BuildingCost, b: BuildingCost) => {
        // 价格不可用的排到最后
        if (!a.priceAvailable && !b.priceAvailable) return 0
        if (!a.priceAvailable) return 1
        if (!b.priceAvailable) return -1
        return a.totalCost - b.totalCost
      },
      render: (cost: number, record: BuildingCost) => {
        if (!record.priceAvailable) {
          return (
            <Tooltip title="市场中缺乏相应原料">
              <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: isMobile ? '11px' : '12px' }}>未知</Tag>
            </Tooltip>
          )
        }
        return <span style={{ fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(cost)}</span>
      },
    },
    {
      title: '材料种类',
      key: 'materialCount',
      width: isMobile ? 100 : 120,
      render: (_: any, record: BuildingCost) => (
        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{record.materialCosts.length}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 80 : 100,
      render: (_: any, record: BuildingCost) => (
        <a onClick={() => setSelectedBuilding(record)} style={{ fontSize: isMobile ? '12px' : '14px' }}>查看详情</a>
      ),
    },
  ]

  // 材料成本表格列
  const materialColumns = [
    {
      title: '材料名称',
      dataIndex: 'materialId',
      key: 'materialId',
      render: (id: number, record: any) => {
        const name = getMaterialName(id)
        return (
          <Space>
            <strong>{name}</strong>
            {!record.priceAvailable && (
              <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: '11px' }}>
                价格未知
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '数量',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>{formatNumber(amount)}</span>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number, record: any) => {
        if (!record.priceAvailable) {
          return <Tag color="default">N/A</Tag>
        }
        return <span style={{ color: '#1890ff' }}>{formatPrice(price)}</span>
      },
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number, record: any) => {
        if (!record.priceAvailable) {
          return <Tag color="default">N/A</Tag>
        }
        return (
          <strong style={{ color: '#f5222d', fontSize: '15px' }}>
            {formatPrice(cost)}
          </strong>
        )
      },
    },
    {
      title: '占比',
      dataIndex: 'costPercentage',
      key: 'costPercentage',
      render: (percentage: number, record: any) => {
        if (!record.priceAvailable || percentage === 0) {
          return <Tag color="default">N/A</Tag>
        }
        return (
          <Tooltip title={`${percentage.toFixed(4)}%`}>
            <Tag color={percentage > 20 ? 'red' : percentage > 10 ? 'orange' : 'green'}>
              {percentage.toFixed(2)}%
            </Tag>
          </Tooltip>
        )
      },
    },
  ]

  // 准备饼图数据（仅包含价格可用的材料）
  const pieChartData = selectedBuilding && selectedBuilding.priceAvailable
    ? selectedBuilding.materialCosts
        .filter(cost => cost.priceAvailable !== false && cost.totalCost > 0)
        .map(cost => ({
          name: getMaterialName(cost.materialId),
          value: cost.totalCost,
        }))
    : []

  // 计算统计数据（仅包含价格可用的建筑）
  const availableBuildings = buildingCosts.filter(b => b.priceAvailable)
  const stats = {
    totalBuildings: buildingCosts.length,
    availableBuildings: availableBuildings.length,
    avgCost: availableBuildings.length > 0
      ? availableBuildings.reduce((sum, b) => sum + b.totalCost, 0) / availableBuildings.length
      : 0,
    maxCost: availableBuildings.length > 0
      ? Math.max(...availableBuildings.map(b => b.totalCost))
      : 0,
    minCost: availableBuildings.length > 0
      ? Math.min(...availableBuildings.map(b => b.totalCost))
      : 0,
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: isMobile ? 16 : 32 }}>
        <h1 style={{ 
          fontSize: isMobile ? '24px' : '32px', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          建筑分析
        </h1>
        <p style={{ color: '#8c8c8c', fontSize: isMobile ? '14px' : '16px' }}>
          建筑建造成本计算 · 材料分解与对比
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="slide-in-left">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>建筑总数</span>}
              value={stats.totalBuildings}
              suffix="个"
              prefix={<BuildOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>平均成本</span>}
              value={stats.avgCost / 100}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>最高成本</span>}
              value={stats.maxCost / 100}
              precision={2}
              prefix={<HomeOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>最低成本</span>}
              value={stats.minCost / 100}
              precision={2}
              prefix={<ToolOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 建筑列表 */}
      <Card 
        title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>建筑成本列表</span>}
        style={{ marginBottom: 24 }}
        className="slide-in-right"
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={buildingCosts}
            rowKey="buildingId"
            pagination={{
              pageSize: isMobile ? 10 : 15,
              showTotal: (total) => `共 ${total} 个建筑`,
              showSizeChanger: !isMobile,
              pageSizeOptions: ['10', '15', '20', '50'],
              simple: isMobile,
            }}
            scroll={{ x: isMobile ? 600 : 800 }}
            size={isMobile ? 'small' : 'middle'}
          />
        </Spin>
      </Card>

      {/* 建筑详情弹窗 */}
      <Modal
        title={selectedBuilding ? `${selectedBuilding.buildingName} - 详细信息` : ''}
        open={!!selectedBuilding}
        onCancel={() => setSelectedBuilding(null)}
        footer={null}
        width={isMobile ? '95%' : (selectedBuilding?.priceAvailable ? 1200 : 800)}
        style={{ top: isMobile ? 10 : 20 }}
        styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 120px)' : 'auto', overflowY: 'auto' } }}
      >
        {selectedBuilding && (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={selectedBuilding.priceAvailable ? 12 : 24}>
              <Card title="材料成本详情" size="small">
                {!selectedBuilding.priceAvailable && selectedBuilding.unavailableMaterials && selectedBuilding.unavailableMaterials.length > 0 && (
                  <Alert
                    message="无法计算建造成本"
                    description={
                      <div>
                        <p style={{ marginBottom: 8 }}>市场中缺乏相应原料，暂时无法提供信息。</p>
                        <p style={{ marginBottom: 8 }}>缺少价格的材料：</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {selectedBuilding.unavailableMaterials.map(mat => (
                            <Tag key={mat.materialId} color="warning">
                              {mat.materialNameZh || mat.materialName}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    }
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Table
                  columns={materialColumns}
                  dataSource={selectedBuilding.materialCosts}
                  rowKey="materialId"
                  pagination={false}
                  size="small"
                />
                <div style={{ 
                  marginTop: 16, 
                  padding: '16px', 
                  background: selectedBuilding.priceAvailable 
                    ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    : 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#8c8c8c', marginBottom: 8 }}>总建造成本</div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold',
                    color: selectedBuilding.priceAvailable ? '#f5222d' : '#faad14'
                  }}>
                    {selectedBuilding.priceAvailable ? formatPrice(selectedBuilding.totalCost) : '未知'}
                  </div>
                </div>
              </Card>
            </Col>
            {selectedBuilding.priceAvailable && (
              <Col xs={24} md={12}>
                <Card title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>成本占比分布</span>} size="small">
                  <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={(entry) => `${entry.name.length > 15 ? entry.name.substring(0, 12) + '...' : entry.name}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [formatPrice(value), '成本']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                      />
                      <Legend 
                        formatter={(value, entry: any) => {
                          const percent = ((entry.payload.value / selectedBuilding.totalCost) * 100).toFixed(1)
                          return `${value} (${percent}%)`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Modal>
    </div>
  )
}

export default BuildingAnalysis

