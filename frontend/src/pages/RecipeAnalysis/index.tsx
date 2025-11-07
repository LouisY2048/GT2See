import { useState, useEffect } from 'react'
import { Card, Table, Select, Space, Spin, message, Row, Col, Statistic, Tag, Tooltip, Alert, InputNumber, Modal } from 'antd'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { WarningOutlined } from '@ant-design/icons'
import { calculatorApi, gameDataApi, exchangeApi } from '../../services/api'
import type { Building, RecipeProfit, Material } from '../../types'
import { formatPrice } from '../../utils/format'

const { Option } = Select

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140']

// 受肥力/丰度影响的建筑
const INFLUENCED_BUILDINGS = {
  fertility: ['Farm'],
  abundance: ['Mine', 'Pump', 'Gas Collector']
}

const RecipeAnalysis = () => {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [recipeProfits, setRecipeProfits] = useState<RecipeProfit[]>([])
  const [filteredProfits, setFilteredProfits] = useState<RecipeProfit[]>([])
  const [sortBy, setSortBy] = useState('profitPerHour')
  const [buildingFilter, setBuildingFilter] = useState<number | undefined>(undefined)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeProfit | null>(null)
  const [fertilityAbundance, setFertilityAbundance] = useState<number>(100)
  const [marketLoading, setMarketLoading] = useState<boolean>(false)
  const [marketInfo, setMarketInfo] = useState<{ avgQtySoldDaily: number | null; avgPrice: number | null; marketSize: number | null } | null>(null)

  // 获取数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const [buildingsRes, materialsRes] = await Promise.all([
        gameDataApi.getBuildings(),
        gameDataApi.getMaterials()
      ])

      setBuildings((buildingsRes as any).buildings || [])
      setMaterials((materialsRes as any).materials || [])

      // 获取配方收益数据
      await fetchProfits(sortBy, buildingFilter)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取收益数据（获取所有配方，不限制数量）
  const fetchProfits = async (sort: string, building?: number, fertAbund?: number) => {
    try {
      const profitsRes = await calculatorApi.calculateRecipeProfits(sort, building, undefined, fertAbund)
      const profits = (profitsRes as any).recipeProfits || []
      setRecipeProfits(profits)
      setFilteredProfits(profits)
    } catch (error) {
      console.error('Failed to fetch profits:', error)
      message.error('加载收益数据失败')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 排序和筛选变化时重新获取数据
  useEffect(() => {
    if (buildings.length > 0) {
      fetchProfits(sortBy, buildingFilter, fertilityAbundance)
    }
  }, [sortBy, buildingFilter, fertilityAbundance])

  // 加载选中配方产物的市场规模（avgQtySoldDaily * avgPrice）
  useEffect(() => {
    const loadMarket = async () => {
      if (!selectedRecipe) {
        setMarketInfo(null)
        return
      }
      const matId = selectedRecipe.outputDetails.materialId
      if (!matId) {
        setMarketInfo(null)
        return
      }
      try {
        setMarketLoading(true)
        const details = await exchangeApi.getMaterialDetails(matId)
        const avgQty = (details as any)?.avgQtySoldDaily
        const avgPrice = (details as any)?.avgPrice
        if (typeof avgQty === 'number' && typeof avgPrice === 'number' && avgQty >= 0 && avgPrice >= 0) {
          setMarketInfo({ avgQtySoldDaily: avgQty, avgPrice, marketSize: Math.round(avgQty * avgPrice) })
        } else {
          setMarketInfo({ avgQtySoldDaily: null, avgPrice: null, marketSize: null })
        }
      } catch (e) {
        setMarketInfo({ avgQtySoldDaily: null, avgPrice: null, marketSize: null })
      } finally {
        setMarketLoading(false)
      }
    }
    loadMarket()
  }, [selectedRecipe])

  // 获取材料名称
  const getMaterialName = (materialId: number) => {
    const material = materials.find(m => m.id === materialId)
    return material?.name || `Material ${materialId}`
  }

  // 获取材料级别（Tier）
  const getMaterialTier = (materialId: number): string => {
    const material = materials.find(m => m.id === materialId)
    if (material && material.tier) {
      return `T${material.tier}`
    }
    return 'N/A'
  }

  // 获取建筑名称
  const getBuildingName = (buildingId: number) => {
    const building = buildings.find(b => b.id === buildingId)
    return building?.name || `Building ${buildingId}`
  }

  // 检查建筑是否受肥力/丰度影响
  const isBuildingInfluenced = (buildingId: number): boolean => {
    const buildingName = getBuildingName(buildingId)
    return [...INFLUENCED_BUILDINGS.fertility, ...INFLUENCED_BUILDINGS.abundance].some(
      name => buildingName.includes(name)
    )
  }

  // 获取影响类型标签
  const getInfluenceType = (buildingId: number): string => {
    const buildingName = getBuildingName(buildingId)
    if (INFLUENCED_BUILDINGS.fertility.some(name => buildingName.includes(name))) {
      return '肥力'
    }
    if (INFLUENCED_BUILDINGS.abundance.some(name => buildingName.includes(name))) {
      return '丰度'
    }
    return ''
  }

  // 表格列定义
  const columns = [
    {
      title: '配方名称',
      dataIndex: 'recipeName',
      key: 'recipeName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: '产物级别',
      key: 'outputTier',
      width: 100,
      render: (_: any, record: RecipeProfit) => {
        const tier = getMaterialTier(record.outputDetails.materialId)
        const tierNum = tier.replace('T', '')
        const color = tierNum === '1' ? 'default' : tierNum === '2' ? 'blue' : tierNum === '3' ? 'purple' : tierNum === '4' ? 'gold' : 'default'
        return <Tag color={color}>{tier}</Tag>
      },
    },
    {
      title: '建筑',
      dataIndex: 'buildingId',
      key: 'buildingId',
      width: 150,
      render: (id: number) => getBuildingName(id),
    },
    {
      title: '生产时间',
      dataIndex: 'timeHours',
      key: 'timeHours',
      width: 120,
      render: (hours: number) => `${hours.toFixed(2)}小时`,
    },
    {
      title: '输入成本',
      dataIndex: 'inputCost',
      key: 'inputCost',
      width: 120,
      render: (cost: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || cost === null) {
          return <Tag color="default">未知</Tag>
        }
        return formatPrice(cost)
      },
    },
    {
      title: '输出价值',
      dataIndex: 'outputValue',
      key: 'outputValue',
      width: 120,
      render: (value: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || value === null) {
          return <Tag color="default">未知</Tag>
        }
        return formatPrice(value)
      },
    },
    {
      title: '总收益',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 120,
      render: (profit: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || profit === null) {
          return <Tag color="default">未知</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
            {formatPrice(profit)}
          </span>
        )
      },
    },
    {
      title: '每小时收益',
      dataIndex: 'profitPerHour',
      key: 'profitPerHour',
      width: 130,
      render: (profit: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || profit === null) {
          return <Tag color="default">未知</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322' }}>
            {formatPrice(profit)}/小时
          </span>
        )
      },
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 120,
      render: (roi: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable) {
          return (
            <Tooltip title="价格数据不可用">
              <Tag icon={<WarningOutlined />} color="warning">未知</Tag>
            </Tooltip>
          )
        }
        if (roi === null || roi === Infinity) {
          return <Tag color="gold">N/A</Tag>
        }
        return (
          <Tag color={roi > 50 ? 'green' : roi > 0 ? 'blue' : 'red'}>
            {roi.toFixed(2)}%
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: RecipeProfit) => (
        <a onClick={() => setSelectedRecipe(record)}>查看详情</a>
      ),
    },
  ]

  // 输入材料表格列
  const inputColumns = [
    {
      title: '材料名称',
      dataIndex: 'materialId',
      key: 'materialId',
      render: (id: number) => getMaterialName(id),
    },
    {
      title: '数量',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => formatPrice(price),
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => formatPrice(cost),
    },
    {
      title: '占比',
      key: 'costPercentage',
      render: (_: any, record: any) => {
        if (!selectedRecipe || !selectedRecipe.priceAvailable || !selectedRecipe.inputCost) {
          return '-'
        }
        const percentage = (record.totalCost / selectedRecipe.inputCost) * 100
        return (
          <Tag color={percentage > 30 ? 'red' : percentage > 15 ? 'orange' : 'green'}>
            {percentage.toFixed(2)}%
          </Tag>
        )
      },
    },
  ]

  // 计算统计数据（过滤掉价格不可用的）
  const availableProfits = recipeProfits.filter(r => r.priceAvailable && r.totalProfit !== null)
  const stats = {
    totalRecipes: recipeProfits.length,
    profitableRecipes: availableProfits.filter(r => r.totalProfit! > 0).length,
    avgProfit: availableProfits.length > 0
      ? availableProfits.reduce((sum, r) => sum + r.totalProfit!, 0) / availableProfits.length
      : 0,
    maxProfitPerHour: availableProfits.length > 0
      ? Math.max(...availableProfits.map(r => r.profitPerHour!))
      : 0,
  }

  // 准备柱状图数据（前10个配方，仅包含价格可用的）
  const chartData = filteredProfits
    .filter(p => p.priceAvailable && p.totalProfit !== null && p.profitPerHour !== null)
    .slice(0, 10)
    .map(profit => ({
      name: profit.recipeName,
      totalProfit: profit.totalProfit,
      profitPerHour: profit.profitPerHour,
    }))

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>配方分析</h1>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="配方总数"
              value={stats.totalRecipes}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="盈利配方"
              value={stats.profitableRecipes}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均收益"
              value={formatPrice(stats.avgProfit, false)}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="最高时均收益"
              value={formatPrice(stats.maxProfitPerHour, false)}
              prefix="$"
              suffix="/小时"
            />
                </Card>
        </Col>
      </Row>

      {/* 收益图表 */}
      <Card title="收益排行 TOP 10" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis tickFormatter={(value) => formatPrice(value, false)} />
            <RechartsTooltip formatter={(value: number) => formatPrice(value)} />
            <Legend />
            <Bar dataKey="totalProfit" fill="#1890ff" name="总收益" />
            <Bar dataKey="profitPerHour" fill="#52c41a" name="每小时收益" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 筛选和排序 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>排序方式：</span>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 150 }}
          >
            <Option value="totalProfit">总收益</Option>
            <Option value="profitPerHour">每小时收益</Option>
            <Option value="roi">ROI</Option>
          </Select>
          <span>建筑筛选：</span>
          <Select
            value={buildingFilter}
            onChange={(value) => {
              setBuildingFilter(value)
              // 当切换建筑时，重置肥力/丰度值为100
              if (!value || !isBuildingInfluenced(value)) {
                setFertilityAbundance(100)
              }
            }}
            style={{ width: 200 }}
            allowClear
            placeholder="全部建筑"
          >
            {buildings
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(building => (
                <Option key={building.id} value={building.id}>
                  {building.name}
                </Option>
              ))
            }
          </Select>
          {buildingFilter && isBuildingInfluenced(buildingFilter) && (
            <>
              <span>{getInfluenceType(buildingFilter)}值：</span>
              <InputNumber
                value={fertilityAbundance}
                onChange={(value) => setFertilityAbundance(value || 100)}
                min={0}
                max={1000}
                step={10}
                style={{ width: 120 }}
                addonAfter="%"
              />
              <Tooltip title={`标准值为100。${getInfluenceType(buildingFilter)}值影响生产效率，例如150表示1.5倍效率（生产时间缩短到原来的67%）`}>
                <Tag color="blue">提示</Tag>
              </Tooltip>
            </>
          )}
        </Space>
      </Card>

      {/* 配方列表 */}
      <Card title="配方收益列表">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredProfits}
            rowKey="recipeId"
            pagination={{
              pageSize: 20,
              showTotal: (total) => `共 ${total} 个配方`,
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>

      {/* 配方详情弹窗 */}
      <Modal
        title={selectedRecipe ? `${selectedRecipe.recipeName} - 详细信息` : ''}
        open={!!selectedRecipe}
        onCancel={() => setSelectedRecipe(null)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        {selectedRecipe && (
          <>
            {!selectedRecipe.priceAvailable && selectedRecipe.unavailableMaterials && selectedRecipe.unavailableMaterials.length > 0 && (
              <Alert
                message="价格数据不完整"
                description={
                  <div>
                    <p style={{ marginBottom: 8 }}>以下材料缺少市场价格数据，收益计算可能不准确：</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedRecipe.unavailableMaterials.map(mat => (
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
            <Row gutter={16}>
              <Col span={12}>
                <h3>输入材料</h3>
                <Table
                  columns={inputColumns}
                  dataSource={selectedRecipe.inputDetails}
                  rowKey="materialId"
                  pagination={false}
                  size="small"
                />
                <div style={{ marginTop: 16 }}>
                  <strong>总输入成本：</strong>
                  {selectedRecipe.priceAvailable && selectedRecipe.inputCost !== null 
                    ? formatPrice(selectedRecipe.inputCost) 
                    : '未知'}
                </div>

                {/* 输入材料成本饼图 */}
                {selectedRecipe.priceAvailable && selectedRecipe.inputDetails && selectedRecipe.inputDetails.length > 0 && (
                  <Card size="small" style={{ marginTop: 16 }} title="输入材料成本分布">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={selectedRecipe.inputDetails.map(item => ({
                            name: getMaterialName(item.materialId),
                            value: item.totalCost
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={(entry) => `${entry.name.length > 12 ? entry.name.substring(0, 10) + '...' : entry.name}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {selectedRecipe.inputDetails.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => [formatPrice(value), '成本']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                        />
                        <Legend 
                          formatter={(value, entry: any) => {
                            const percent = ((entry.payload.value / selectedRecipe.inputCost!) * 100).toFixed(1)
                            return `${value} (${percent}%)`
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </Col>
              <Col span={12}>
                <h3>输出产品</h3>
                <Card size="small">
                  <p><strong>材料：</strong>{getMaterialName(selectedRecipe.outputDetails.materialId)}</p>
                  <p><strong>数量：</strong>{selectedRecipe.outputDetails.amount}</p>
                  <p><strong>单价：</strong>
                    {selectedRecipe.outputDetails.priceAvailable 
                      ? formatPrice(selectedRecipe.outputDetails.unitPrice) 
                      : '未知'}
                  </p>
                  <p><strong>总价值：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.outputDetails.totalValue !== null 
                      ? formatPrice(selectedRecipe.outputDetails.totalValue) 
                      : '未知'}
                  </p>
                </Card>
                <Card size="small" style={{ marginTop: 16 }}>
                  <h4>收益分析</h4>
                  <p><strong>生产时间：</strong>{selectedRecipe.timeHours.toFixed(2)} 小时</p>
                  <p><strong>总收益：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.totalProfit !== null ? (
                      <span style={{ color: selectedRecipe.totalProfit > 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
                        {formatPrice(selectedRecipe.totalProfit)}
                      </span>
                    ) : '未知'}
                  </p>
                  <p><strong>每小时收益：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.profitPerHour !== null ? (
                      <span style={{ color: selectedRecipe.profitPerHour > 0 ? '#3f8600' : '#cf1322' }}>
                        {formatPrice(selectedRecipe.profitPerHour)}
                      </span>
                    ) : '未知'}
                  </p>
                  <p><strong>ROI：</strong>
                    {selectedRecipe.roi === null || selectedRecipe.roi === Infinity 
                      ? 'N/A' 
                      : `${selectedRecipe.roi.toFixed(2)}%`}
                  </p>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0 12px' }} />
                  <h4 style={{ marginBottom: 8 }}>市场规模</h4>
                  {marketLoading ? (
                    <Spin size="small" />
                  ) : marketInfo && marketInfo.marketSize !== null ? (
                    <>
                      <p style={{ marginBottom: 4 }}><strong>平均日销量：</strong>{marketInfo.avgQtySoldDaily?.toLocaleString()} 单位/天</p>
                      <p style={{ marginBottom: 4 }}><strong>平均价格：</strong>{formatPrice(marketInfo.avgPrice!)} /单位</p>
                      <p style={{ marginBottom: 0 }}><strong>市场规模（按日）：</strong>
                        <span style={{ fontWeight: 'bold' }}>{formatPrice(marketInfo.marketSize)}</span>
                      </p>
                    </>
                  ) : (
                    <Tag color="default">暂无市场数据</Tag>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>
    </div>
  )
}

export default RecipeAnalysis

