import { useState, useEffect } from 'react'
import { Card, Table, Select, Space, Spin, message, Row, Col, Statistic, Tag, InputNumber, Button, Divider, Input } from 'antd'
import { PlusOutlined, DeleteOutlined, SearchOutlined, RocketOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { analyzerApi, gameDataApi } from '../../services/api'
import type { Material, SystemAnalysis } from '../../types'

const { Option } = Select

interface MaterialFilter {
  materialId: number
  minAbundance: number
}

interface AdvancedSearchResult {
  systemId: number
  systemName: string
  x: number
  y: number
  distanceToExchange: number
  planetCount: number
  maxFertility: number
  resources: Array<{
    materialId: number
    totalAbundance: number
    planetCount: number
    maxAbundance: number
  }>
}

const SystemPlanning = () => {
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [systemAnalysis, setSystemAnalysis] = useState<SystemAnalysis[]>([])
  
  // 高级搜索状态
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedSearchResults, setAdvancedSearchResults] = useState<AdvancedSearchResult[]>([])
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false)
  const [materialFilters, setMaterialFilters] = useState<MaterialFilter[]>([])
  const [maxDistance, setMaxDistance] = useState<number | undefined>(undefined)
  const [minFertility, setMinFertility] = useState<number | undefined>(undefined)
  const [exchangeX, setExchangeX] = useState<number>(3334.0)
  const [exchangeY, setExchangeY] = useState<number>(1425.0)
  
  // 星系搜索状态
  const [systemSearchText, setSystemSearchText] = useState<string>('')

  // 获取数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const [materialsRes, analysisRes] = await Promise.all([
        gameDataApi.getMaterials(),
        analyzerApi.analyzeSystems(exchangeX, exchangeY)
      ])

      setMaterials((materialsRes as any).materials || [])
      // 过滤掉行星数为0的星系
      const filteredAnalysis = ((analysisRes as any).systemAnalysis || []).filter(
        (system: SystemAnalysis) => system.planetCount > 0
      )
      setSystemAnalysis(filteredAnalysis)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [exchangeX, exchangeY])


  // 获取材料名称
  const getMaterialName = (materialId: number) => {
    const material = materials.find(m => m.id === materialId)
    return material?.name || `Material ${materialId}`
  }

  // 高级搜索
  const handleAdvancedSearch = async () => {
    setAdvancedSearchLoading(true)
    try {
      const response = await analyzerApi.advancedSearch({
        maxDistance,
        materialFilters: materialFilters.length > 0 ? materialFilters : undefined,
        minFertility,
        exchangeX,
        exchangeY
      })
      setAdvancedSearchResults((response as any).results || [])
      message.success(`找到 ${(response as any).total || 0} 个符合条件的星系`)
    } catch (error) {
      console.error('Failed to perform advanced search:', error)
      message.error('高级搜索失败')
    } finally {
      setAdvancedSearchLoading(false)
    }
  }

  // 添加材料筛选条件
  const addMaterialFilter = () => {
    setMaterialFilters([...materialFilters, { materialId: 0, minAbundance: 0 }])
  }

  // 删除材料筛选条件
  const removeMaterialFilter = (index: number) => {
    setMaterialFilters(materialFilters.filter((_, i) => i !== index))
  }

  // 更新材料筛选条件
  const updateMaterialFilter = (index: number, field: 'materialId' | 'minAbundance', value: number) => {
    const newFilters = [...materialFilters]
    newFilters[index] = { ...newFilters[index], [field]: value }
    setMaterialFilters(newFilters)
  }

  // 星系分析表格列
  const systemColumns = [
    {
      title: '星系名称',
      dataIndex: 'systemName',
      key: 'systemName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: '到交易所距离（预估，仅做参考）',
      dataIndex: 'distanceToExchange',
      key: 'distanceToExchange',
      width: 200,
      render: (distance: number | undefined) => {
        if (distance === undefined || distance === null) return '-'
        return `${distance.toFixed(2)} 光年`
      },
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => {
        const aDist = a.distanceToExchange || 0
        const bDist = b.distanceToExchange || 0
        return aDist - bDist
      },
    },
    {
      title: '行星数量',
      dataIndex: 'planetCount',
      key: 'planetCount',
      width: 120,
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => a.planetCount - b.planetCount,
    },
    {
      title: '资源种类',
      key: 'resourceCount',
      width: 120,
      render: (_: any, record: SystemAnalysis) => record.resources.length,
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => a.resources.length - b.resources.length,
    },
    {
      title: '总资源丰度',
      key: 'totalAbundance',
      width: 150,
      render: (_: any, record: SystemAnalysis) => {
        const total = record.resources.reduce((sum, r) => sum + r.totalAbundance, 0)
        return total.toLocaleString()
      },
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => {
        const aTotal = a.resources.reduce((sum, r) => sum + r.totalAbundance, 0)
        const bTotal = b.resources.reduce((sum, r) => sum + r.totalAbundance, 0)
        return aTotal - bTotal
      },
    },
  ]

  // 高级搜索结果表格列
  const advancedSearchColumns = [
    {
      title: '星系名称',
      dataIndex: 'systemName',
      key: 'systemName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: '到交易所距离（预估，仅做参考）',
      dataIndex: 'distanceToExchange',
      key: 'distanceToExchange',
      width: 200,
      render: (distance: number) => `${distance.toFixed(2)} 光年`,
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.distanceToExchange - b.distanceToExchange,
    },
    {
      title: '行星数量',
      dataIndex: 'planetCount',
      key: 'planetCount',
      width: 120,
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.planetCount - b.planetCount,
    },
    {
      title: '最大肥力',
      dataIndex: 'maxFertility',
      key: 'maxFertility',
      width: 120,
      render: (fertility: number) => (
        <Tag color={fertility >= 100 ? 'green' : fertility > 0 ? 'orange' : 'default'}>
          {fertility}
        </Tag>
      ),
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.maxFertility - b.maxFertility,
    },
    {
      title: '资源种类',
      key: 'resourceCount',
      width: 120,
      render: (_: any, record: AdvancedSearchResult) => record.resources.length,
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.resources.length - b.resources.length,
    },
  ]

  // 计算统计数据
  const stats = {
    totalSystems: systemAnalysis.length,
    totalPlanets: systemAnalysis.reduce((sum, s) => sum + s.planetCount, 0),
    avgPlanetsPerSystem: systemAnalysis.length > 0
      ? systemAnalysis.reduce((sum, s) => sum + s.planetCount, 0) / systemAnalysis.length
      : 0,
    totalResourceTypes: new Set(
      systemAnalysis.flatMap(s => s.resources.map(r => r.materialId))
    ).size,
  }

  // 过滤星系（根据搜索文本）
  const filteredSystemAnalysis = systemAnalysis.filter((system) => {
    if (!systemSearchText) return true
    const searchLower = systemSearchText.toLowerCase()
    return system.systemName.toLowerCase().includes(searchLower)
  })


  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>星系规划</h1>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="星系总数"
              value={stats.totalSystems}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="行星总数"
              value={stats.totalPlanets}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均行星数"
              value={stats.avgPlanetsPerSystem}
              precision={1}
              suffix="个/星系"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="资源种类"
              value={stats.totalResourceTypes}
              suffix="种"
            />
          </Card>
        </Col>
      </Row>

      {/* 高级搜索 */}
      <Card 
        title="高级星系搜索" 
        style={{ marginBottom: 24 }}
      >
        <Row justify="center" style={{ marginBottom: 12 }}>
          <Col>
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={showAdvancedSearch ? <ArrowUpOutlined /> : <RocketOutlined />}
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              style={{
                background: showAdvancedSearch
                  ? 'linear-gradient(135deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%)'
                  : 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                border: 'none',
                boxShadow: showAdvancedSearch
                  ? '0 12px 24px rgba(200, 80, 192, 0.35)'
                  : '0 12px 24px rgba(0, 102, 255, 0.35)',
                color: '#fff',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {showAdvancedSearch ? '收起探索面板' : '开启星际探索'}
            </Button>
          </Col>
        </Row>
        {showAdvancedSearch && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Row gutter={16}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <span>最大距离（光年）：</span>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    placeholder="不限制"
                    value={maxDistance}
                    onChange={(value) => setMaxDistance(value || undefined)}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <span>最小肥力阈值：</span>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={1000}
                    placeholder="不限制"
                    value={minFertility}
                    onChange={(value) => setMinFertility(value || undefined)}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <span>交易所坐标（默认即为目前交易所位置）：</span>
                  <Space>
                    <InputNumber
                      style={{ width: 100 }}
                      placeholder="X"
                      value={exchangeX}
                      onChange={(value) => setExchangeX(value || 0)}
                    />
                    <InputNumber
                      style={{ width: 100 }}
                      placeholder="Y"
                      value={exchangeY}
                      onChange={(value) => setExchangeY(value || 0)}
                    />
                  </Space>
                </Space>
              </Col>
            </Row>

            <Divider orientation="left">材料筛选条件</Divider>
            
            {materialFilters.map((filter, index) => (
              <Row key={index} gutter={16} align="middle">
                <Col span={10}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择材料"
                    value={filter.materialId || undefined}
                    onChange={(value) => updateMaterialFilter(index, 'materialId', value)}
                    showSearch
                    filterOption={(input, option) => {
                      const label = option?.label || option?.children
                      if (typeof label === 'string') {
                        return label.toLowerCase().includes(input.toLowerCase())
                      }
                      if (typeof label === 'object' && label !== null) {
                        const labelStr = String(label)
                        return labelStr.toLowerCase().includes(input.toLowerCase())
                      }
                      return false
                    }}
                  >
                    {materials.map(material => (
                      <Option key={material.id} value={material.id}>
                        {material.name}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={8}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    placeholder="最小丰度"
                    value={filter.minAbundance}
                    onChange={(value) => updateMaterialFilter(index, 'minAbundance', value || 0)}
                  />
                </Col>
                <Col span={6}>
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => removeMaterialFilter(index)}
                  >
                    删除
                  </Button>
                </Col>
              </Row>
            ))}

            <Button
              icon={<PlusOutlined />}
              onClick={addMaterialFilter}
              style={{ width: '100%' }}
            >
              添加材料筛选条件
            </Button>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAdvancedSearch}
              loading={advancedSearchLoading}
              style={{ width: '100%' }}
            >
              开始搜索
            </Button>

            {advancedSearchResults.length > 0 && (
              <div>
                <h3>搜索结果（共 {advancedSearchResults.length} 个星系）</h3>
                <Table
                  columns={advancedSearchColumns}
                  dataSource={advancedSearchResults}
                  rowKey="systemId"
                  pagination={{
                    pageSize: 15,
                    showTotal: (total) => `共 ${total} 个星系`,
                  }}
                  scroll={{ x: 1000 }}
                  expandable={{
                    expandedRowRender: (record: AdvancedSearchResult) => (
                      <div style={{ padding: '8px 24px' }}>
                        <h4>资源详情：</h4>
                        <Row gutter={[8, 8]}>
                          {record.resources.map(resource => (
                            <Col key={resource.materialId} span={8}>
                              <Tag color="blue">
                                {getMaterialName(resource.materialId)}: 
                                总丰度 {resource.totalAbundance.toLocaleString()}, 
                                最大丰度 {resource.maxAbundance.toLocaleString()}, 
                                {resource.planetCount}个行星
                              </Tag>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ),
                  }}
                />
              </div>
            )}
          </Space>
        )}
      </Card>

      {/* 星系分析列表 */}
      <Card title="星系资源分析" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            placeholder="搜索星系名称..."
            prefix={<SearchOutlined />}
            value={systemSearchText}
            onChange={(e) => setSystemSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Spin spinning={loading}>
            <Table
              columns={systemColumns}
              dataSource={filteredSystemAnalysis}
              rowKey="systemId"
              pagination={{
                pageSize: 15,
                showTotal: (total) => `共 ${total} 个星系`,
              }}
              expandable={{
                expandedRowRender: (record: SystemAnalysis) => (
                  <div style={{ padding: '8px 24px' }}>
                    <h4>资源详情：</h4>
                    <Row gutter={[8, 8]}>
                      {record.resources.map(resource => (
                        <Col key={resource.materialId} span={8}>
                          <Tag color="blue">
                            {getMaterialName(resource.materialId)}: {resource.totalAbundance.toLocaleString()} (
                            {resource.planetCount}个行星)
                          </Tag>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ),
              }}
            />
          </Spin>
        </Space>
      </Card>

    </div>
  )
}

export default SystemPlanning

