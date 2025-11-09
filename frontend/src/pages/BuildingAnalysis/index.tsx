import { useState, useEffect } from 'react'
import { Card, Table, Space, Spin, message, Row, Col, Statistic, Tag, Tooltip, Alert, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
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
import { useTranslationData } from '../../hooks/useTranslationData'
import type { BuildingCost, Material } from '../../types'
import { formatPrice, formatNumber } from '../../utils/format'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140']

const BuildingAnalysis = () => {
  const { t } = useTranslation()
  const { getTranslatedName, loading: translationLoading } = useTranslationData()
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
      message.error(t('buildings.loadingError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 获取材料名称（支持中英文切换）
  const getMaterialName = (materialId: number) => {
    const material = materials.find(m => m.id === materialId)
    const enName = material?.sName || material?.name || `Material ${materialId}`
    if (!enName) return `Material ${materialId}`
    try {
      return getTranslatedName(enName)
    } catch (error) {
      console.warn('Translation error for material:', enName, error)
      return enName
    }
  }
  
  // 获取建筑名称（支持中英文切换）
  const getBuildingName = (buildingName: string) => {
    if (!buildingName) return 'Unknown Building'
    try {
      return getTranslatedName(buildingName)
    } catch (error) {
      console.warn('Translation error for building:', buildingName, error)
      return buildingName
    }
  }

  // 表格列定义（响应式）
  const columns = [
    {
      title: t('buildings.columns.buildingName'),
      dataIndex: 'buildingName',
      key: 'buildingName',
      fixed: 'left' as const,
      width: isMobile ? 150 : 200,
      render: (name: string) => getBuildingName(name),
    },
    {
      title: t('buildings.columns.totalCost'),
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
            <Tooltip title={t('buildings.tooltips.noMarketData')}>
              <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
            </Tooltip>
          )
        }
        return <span style={{ fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(cost)}</span>
      },
    },
    {
      title: t('buildings.columns.materialCount'),
      key: 'materialCount',
      width: isMobile ? 100 : 120,
      render: (_: any, record: BuildingCost) => (
        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{record.materialCosts.length}</span>
      ),
    },
    {
      title: t('common.viewDetails'),
      key: 'action',
      width: isMobile ? 80 : 100,
      render: (_: any, record: BuildingCost) => (
        <a onClick={() => setSelectedBuilding(record)} style={{ fontSize: isMobile ? '12px' : '14px' }}>{t('common.viewDetails')}</a>
      ),
    },
  ]

  // 材料成本表格列
  const materialColumns = [
    {
      title: t('buildings.details.materialName'),
      dataIndex: 'materialId',
      key: 'materialId',
      render: (id: number, record: any) => {
        const name = getMaterialName(id)
        return (
          <Space>
            <strong>{name}</strong>
            {!record.priceAvailable && (
              <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: '11px' }}>
                {t('buildings.details.priceUnknown')}
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: t('buildings.details.quantity'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>{formatNumber(amount)}</span>
      ),
    },
    {
      title: t('buildings.details.unitPrice'),
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
      title: t('buildings.details.totalCost'),
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
      title: t('buildings.details.percentage'),
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
          {t('buildings.title')}
        </h1>
        <p style={{ color: '#8c8c8c', fontSize: isMobile ? '14px' : '16px' }}>
          {t('buildings.subtitle')}
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="slide-in-left">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('buildings.stats.totalBuildings')}</span>}
              value={stats.totalBuildings}
              suffix={t('buildings.unitCount')}
              prefix={<BuildOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('buildings.stats.avgCost')}</span>}
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
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('buildings.stats.maxCost')}</span>}
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
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('buildings.stats.minCost')}</span>}
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
        title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('buildings.buildingList')}</span>}
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
              showTotal: (total) => t('buildings.paginationTotal', { total }),
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
        title={selectedBuilding ? `${getBuildingName(selectedBuilding.buildingName)} - ${t('buildings.details.title')}` : ''}
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
              <Card title={t('buildings.details.materials')} size="small">
                {!selectedBuilding.priceAvailable && selectedBuilding.unavailableMaterials && selectedBuilding.unavailableMaterials.length > 0 && (
                  <Alert
                    message={t('buildings.details.cannotCalculate')}
                    description={
                      <div>
                        <p style={{ marginBottom: 8 }}>{t('buildings.details.noMarketData')}</p>
                        <p style={{ marginBottom: 8 }}>{t('buildings.details.missingMaterials')}</p>
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
                  <div style={{ color: '#8c8c8c', marginBottom: 8 }}>{t('buildings.details.totalCost')}</div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold',
                    color: selectedBuilding.priceAvailable ? '#f5222d' : '#faad14'
                  }}>
                    {selectedBuilding.priceAvailable ? formatPrice(selectedBuilding.totalCost) : t('common.unknown')}
                  </div>
                </div>
              </Card>
            </Col>
            {selectedBuilding.priceAvailable && (
              <Col xs={24} md={12}>
                <Card title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>{t('buildings.details.costDistribution')}</span>} size="small">
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
                        formatter={(value: number) => [formatPrice(value), t('buildings.details.cost')]}
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

