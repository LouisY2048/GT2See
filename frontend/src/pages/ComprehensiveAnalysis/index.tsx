import { useState, useEffect, useMemo } from 'react'
import { Card, Table, Select, Space, Spin, message, Row, Col, Statistic, Tag, Tooltip, InputNumber, Alert, Modal, AutoComplete } from 'antd'
import { useTranslation } from 'react-i18next'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip 
} from 'recharts'
import { WarningOutlined, TeamOutlined } from '@ant-design/icons'
import { comprehensiveApi, gameDataApi, exchangeApi } from '../../services/api'
import { useTranslationData } from '../../hooks/useTranslationData'
import type { Building, Material } from '../../types'
import { formatPrice } from '../../utils/format'

const { Option } = Select

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140']

// 受肥力/丰度影响的建筑
const INFLUENCED_BUILDINGS = {
  fertility: ['Farm'],
  abundance: ['Mine', 'Pump', 'Gas Collector']
}

interface ComprehensiveProfit {
  recipeId: number
  recipeName: string
  buildingId: number
  buildingName: string
  inputCost: number | null
  outputValue: number | null
  totalProfit: number | null
  profitPerHour: number | null
  workforceCost: number | null
  workforceCostPerHour: number | null
  comprehensiveProfitPerHour: number | null
  comprehensiveTotalProfit: number | null
  timeHours: number
  priceAvailable: boolean
  workforceCostAvailable: boolean
  expansionPenalty: number
  unavailableMaterials?: Array<any>
  unavailableWorkforceMaterials?: Array<any>
  inputDetails?: Array<{
    materialId: number
    materialName: string
    amount: number
    unitPrice: number
    totalCost: number
  }>
  outputDetails: {
    materialId: number
    materialName?: string
    amount: number
    unitPrice: number
    totalValue: number | null
  }
  workforceDetails?: Array<{
    workforceType: string
    workerCount: number
    costAvailable: boolean
    totalCost: number | null
    consumables: Array<{
      materialId: number
      materialName: string
      essential: boolean
      cycleAmount: number
      unitPrice: number
      totalCost: number
    }>
  }>
}

const ComprehensiveAnalysis = () => {
  const { t } = useTranslation()
  const { getTranslatedName } = useTranslationData()
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveProfit[]>([])
  const [filteredData, setFilteredData] = useState<ComprehensiveProfit[]>([])
  const [sortBy, setSortBy] = useState('comprehensiveProfitPerHour')
  const [buildingFilter, setBuildingFilter] = useState<number | undefined>(undefined)
  const [totalPopulation, setTotalPopulation] = useState<number>(0)
  const [fertilityAbundance, setFertilityAbundance] = useState<number>(100)
  const [selectedRecipe, setSelectedRecipe] = useState<ComprehensiveProfit | null>(null)
  const [marketLoading, setMarketLoading] = useState<boolean>(false)
  const [marketInfo, setMarketInfo] = useState<{ avgQtySoldDaily: number | null; avgPrice: number | null; marketSize: number | null } | null>(null)
  const [searchText, setSearchText] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  
  // 响应式检测
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

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

      await fetchComprehensiveData(sortBy, buildingFilter, totalPopulation, fertilityAbundance)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error(t('comprehensive.loadingError'))
    } finally {
      setLoading(false)
    }
  }

  const fetchComprehensiveData = async (sort: string, building?: number, population = 0, fertAbund = 100) => {
    try {
      const response = await comprehensiveApi.analyzeRecipeProfits(sort, building, population, fertAbund)
      const data = (response as any).comprehensiveAnalysis || []
      setComprehensiveData(data)
      // 应用当前搜索过滤
      applyFilters(data, searchText)
    } catch (error) {
      console.error('Failed to fetch comprehensive data:', error)
      message.error(t('comprehensive.profitError'))
    }
  }

  // 应用搜索过滤
  const applyFilters = (data: ComprehensiveProfit[], search: string) => {
    if (!search.trim()) {
      setFilteredData(data)
      return
    }
    
    const searchLower = search.toLowerCase().trim()
    const filtered = data.filter(item => {
      // 搜索翻译后的配方名称
      const recipeName = getRecipeName(item)
      return recipeName.toLowerCase().includes(searchLower)
    })
    setFilteredData(filtered)
  }

  // 获取建筑名称（支持中英文切换）
  const getBuildingName = (buildingId: number) => {
    const building = buildings.find(b => b.id === buildingId)
    const enName = building?.name || `Building ${buildingId}`
    if (!enName) return `Building ${buildingId}`
    try {
      return getTranslatedName(enName)
    } catch (error) {
      console.warn('Translation error for building:', enName, error)
      return enName
    }
  }
  
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

  // 获取配方名称（支持中英文切换）
  // 格式：输出产品（第一种输入产品）
  const getRecipeName = (recipe: ComprehensiveProfit) => {
    try {
      const outputName = getMaterialName(recipe.outputDetails.materialId)
      if (recipe.inputDetails && recipe.inputDetails.length > 0) {
        const firstInputName = getMaterialName(recipe.inputDetails[0].materialId)
        return `${outputName}（${firstInputName}）`
      }
      return outputName
    } catch (error) {
      console.warn('Translation error for recipe:', recipe.recipeName, error)
      return recipe.recipeName
    }
  }

  // 生成自动完成选项（模糊匹配）
  const autocompleteOptions = useMemo(() => {
    if (!searchText.trim()) {
      return []
    }
    
    const searchLower = searchText.toLowerCase().trim()
    const matchedRecipes = comprehensiveData
      .filter(item => {
        // 搜索翻译后的配方名称
        const recipeName = getRecipeName(item)
        return recipeName.toLowerCase().includes(searchLower)
      })
      .slice(0, 10) // 最多显示10个选项
    
    return matchedRecipes.map(item => {
      const recipeName = getRecipeName(item)
      return {
        value: recipeName,
        label: (
          <div>
            <span>{recipeName}</span>
            <span style={{ color: '#999', marginLeft: 8, fontSize: '12px' }}>
              {getBuildingName(item.buildingId)}
            </span>
          </div>
        ),
      }
    })
  }, [searchText, comprehensiveData, buildings])

  // 搜索文本变化时应用过滤
  useEffect(() => {
    applyFilters(comprehensiveData, searchText)
  }, [searchText, comprehensiveData])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (buildings.length > 0) {
      fetchComprehensiveData(sortBy, buildingFilter, totalPopulation, fertilityAbundance)
    }
  }, [sortBy, buildingFilter, totalPopulation, fertilityAbundance])

  // 加载选中配方产物的市场规模
  useEffect(() => {
    const loadMarket = async () => {
      if (!selectedRecipe) {
        setMarketInfo(null)
        return
      }
      const matId = selectedRecipe.outputDetails.materialId
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

  const getMaterialTier = (materialId: number): string => {
    const material = materials.find(m => m.id === materialId)
    if (material && material.tier) {
      return `T${material.tier}`
    }
    return 'N/A'
  }

  const isBuildingInfluenced = (buildingId: number): boolean => {
    const buildingName = getBuildingName(buildingId)
    return [...INFLUENCED_BUILDINGS.fertility, ...INFLUENCED_BUILDINGS.abundance].some(
      name => buildingName.includes(name)
    )
  }

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

  // 表格列定义（响应式）
  const columns = [
    {
      title: t('comprehensive.columns.recipeName'),
      dataIndex: 'recipeName',
      key: 'recipeName',
      fixed: 'left' as const,
      width: isMobile ? 150 : 200,
      render: (_: string, record: ComprehensiveProfit) => getRecipeName(record),
    },
    {
      title: t('comprehensive.columns.outputTier'),
      key: 'outputTier',
      width: isMobile ? 80 : 100,
      render: (_: any, record: ComprehensiveProfit) => {
        const tier = getMaterialTier(record.outputDetails.materialId)
        const tierNum = tier.replace('T', '')
        const color = tierNum === '1' ? 'default' : tierNum === '2' ? 'blue' : tierNum === '3' ? 'purple' : tierNum === '4' ? 'gold' : 'default'
        return <Tag color={color}>{tier}</Tag>
      },
    },
    {
      title: t('comprehensive.columns.building'),
      dataIndex: 'buildingId',
      key: 'buildingId',
      width: isMobile ? 120 : 150,
      render: (buildingId: number) => getBuildingName(buildingId),
    },
    {
      title: t('comprehensive.columns.recipeProfitPerHour'),
      dataIndex: 'profitPerHour',
      key: 'profitPerHour',
      width: isMobile ? 120 : 140,
      render: (profit: number | null, record: ComprehensiveProfit) => {
        if (!record.priceAvailable || profit === null) {
          return <Tag color="default">{t('common.unknown')}</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322', fontSize: isMobile ? '12px' : '14px' }}>
            {formatPrice(profit)}/h
          </span>
        )
      },
    },
    {
      title: t('comprehensive.columns.laborCostPerHour'),
      dataIndex: 'workforceCostPerHour',
      key: 'workforceCostPerHour',
      width: isMobile ? 130 : 150,
      render: (cost: number | null, record: ComprehensiveProfit) => {
        if (!record.workforceCostAvailable || cost === null) {
          return <Tag icon={<WarningOutlined />} color="warning">{t('common.unknown')}</Tag>
        }
        return <span style={{ color: '#fa8c16', fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(cost)}/h</span>
      },
    },
    {
      title: t('comprehensive.columns.comprehensiveProfitPerHour'),
      dataIndex: 'comprehensiveProfitPerHour',
      key: 'comprehensiveProfitPerHour',
      width: isMobile ? 130 : 150,
      render: (profit: number | null, record: ComprehensiveProfit) => {
        if (!record.priceAvailable || !record.workforceCostAvailable || profit === null) {
          return <Tag color="default">{t('common.unknown')}</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold', fontSize: isMobile ? '13px' : '15px' }}>
            {formatPrice(profit)}/h
          </span>
        )
      },
    },
    {
      title: t('common.viewDetails'),
      key: 'action',
      width: isMobile ? 80 : 100,
      fixed: 'right' as const,
      render: (_: any, record: ComprehensiveProfit) => (
        <a onClick={() => setSelectedRecipe(record)} style={{ fontSize: isMobile ? '12px' : '14px' }}>{t('common.viewDetails')}</a>
      ),
    },
  ]

  // 计算统计数据（使用过滤后的数据）
  const availableData = filteredData.filter(r => r.priceAvailable && r.workforceCostAvailable && r.comprehensiveProfitPerHour !== null)
  const stats = {
    totalRecipes: filteredData.length,
    profitableRecipes: availableData.filter(r => r.comprehensiveProfitPerHour! > 0).length,
    avgComprehensiveProfit: availableData.length > 0
      ? availableData.reduce((sum, r) => sum + r.comprehensiveProfitPerHour!, 0) / availableData.length
      : 0,
    maxComprehensiveProfit: availableData.length > 0
      ? Math.max(...availableData.map(r => r.comprehensiveProfitPerHour!))
      : 0,
  }

  return (
    <div>
      <h1 style={{ marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? '20px' : '24px' }}>{t('comprehensive.title')}</h1>

      {/* 说明 */}
      <Alert
        message={t('comprehensive.descriptionTitle')}
        description={t('comprehensive.description')}
        type="info"
        showIcon
        style={{ marginBottom: isMobile ? 16 : 24 }}
      />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('comprehensive.stats.totalRecipes')}
              value={stats.totalRecipes}
              suffix={t('comprehensive.unitCount')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('comprehensive.stats.profitableRecipes')}
              value={stats.profitableRecipes}
              suffix={t('comprehensive.unitCount')}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('comprehensive.stats.avgComprehensiveProfit')}
              value={formatPrice(stats.avgComprehensiveProfit, false)}
              prefix="$"
              suffix={t('comprehensive.units.perHour')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('comprehensive.stats.maxComprehensiveProfit')}
              value={formatPrice(stats.maxComprehensiveProfit, false)}
              prefix="$"
              suffix={t('comprehensive.units.perHour')}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和参数 */}
      <Card style={{ marginBottom: 16 }}>
        <Space 
          direction={isMobile ? 'vertical' : 'horizontal'} 
          wrap 
          size={isMobile ? 'middle' : 'large'}
          style={{ width: '100%' }}
        >
          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('comprehensive.filters.searchRecipe')}：</span>
            <AutoComplete
              placeholder={t('comprehensive.filters.searchPlaceholder')}
              value={searchText}
              onChange={(value) => setSearchText(value)}
              onSearch={(value) => setSearchText(value)}
              options={autocompleteOptions}
              allowClear
              style={{ width: isMobile ? '100%' : 300 }}
              filterOption={false} // 禁用默认过滤，使用自定义逻辑
              onSelect={(value) => {
                setSearchText(value)
              }}
            />
          </Space>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('comprehensive.filters.sortBy')}：</span>
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: isMobile ? '100%' : 180 }}
            >
              <Option value="comprehensiveProfitPerHour">{t('comprehensive.filters.sortOptions.comprehensiveProfitPerHour')}</Option>
              <Option value="comprehensiveTotalProfit">{t('comprehensive.filters.sortOptions.comprehensiveTotalProfit')}</Option>
              <Option value="profitPerHour">{t('comprehensive.filters.sortOptions.profitPerHour')}</Option>
            </Select>
          </Space>

          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('comprehensive.filters.buildingFilter')}：</span>
            <Select
              value={buildingFilter}
              onChange={(value) => {
                setBuildingFilter(value)
                if (!value || !isBuildingInfluenced(value)) {
                  setFertilityAbundance(100)
                }
              }}
              style={{ width: isMobile ? '100%' : 200 }}
              allowClear
              placeholder={t('comprehensive.filters.allBuildings')}
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
          </Space>

          {buildingFilter && isBuildingInfluenced(buildingFilter) && (
            <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
              <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{getInfluenceType(buildingFilter)}{t('comprehensive.filters.value')}：</span>
              <InputNumber
                value={fertilityAbundance}
                onChange={(value) => setFertilityAbundance(value || 100)}
                min={0}
                max={1000}
                step={10}
                style={{ width: isMobile ? '100%' : 120 }}
                addonAfter="%"
              />
            </Space>
          )}

          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <TeamOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
            <span style={{ minWidth: isMobile ? 'auto' : 60 }}>{t('comprehensive.filters.totalPopulation')}：</span>
            <InputNumber
              value={totalPopulation}
              onChange={(value) => setTotalPopulation(value || 0)}
              min={0}
              max={100000}
              step={100}
              style={{ width: isMobile ? '100%' : 150 }}
              placeholder="0"
            />
            {totalPopulation > 2000 && (
              <Tooltip title={t('comprehensive.filters.expansionPenalty', { penalty: ((totalPopulation - 2000) / 10000).toFixed(1) })}>
                <Tag color="orange">
                  <WarningOutlined /> {t('comprehensive.filters.expansionPenaltyActive')}
                </Tag>
              </Tooltip>
            )}
          </Space>
        </Space>
      </Card>

      {/* 配方列表 */}
      <Card title={t('comprehensive.recipeList')}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="recipeId"
            pagination={{
              pageSize: isMobile ? 10 : 20,
              showTotal: (total) => t('comprehensive.paginationTotal', { total }),
              showSizeChanger: !isMobile,
              simple: isMobile,
            }}
            scroll={{ x: isMobile ? 800 : 1300 }}
            size={isMobile ? 'small' : 'middle'}
          />
        </Spin>
      </Card>

      {/* 配方详情弹窗 */}
      <Modal
        title={selectedRecipe ? `${getRecipeName(selectedRecipe)} - ${t('comprehensive.details.title')}` : ''}
        open={!!selectedRecipe}
        onCancel={() => setSelectedRecipe(null)}
        footer={null}
        width={isMobile ? '95%' : isTablet ? 900 : 1400}
        style={{ top: isMobile ? 10 : 20 }}
        styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 120px)' : 'auto', overflowY: 'auto' } }}
      >
        {selectedRecipe && (
          <Row gutter={[16, 16]}>
            {/* 左侧：输入输出详情 */}
            <Col xs={24} md={12}>
              <Card size="small" title={t('comprehensive.details.recipeInfo')} style={{ marginBottom: 16 }}>
                <p><strong>{t('comprehensive.details.building')}：</strong>{selectedRecipe.buildingName}</p>
                <p><strong>{t('comprehensive.details.productionTime')}：</strong>{selectedRecipe.timeHours.toFixed(2)} {t('recipes.units.hours')}</p>
                <p><strong>{t('comprehensive.details.output')}：</strong>{getMaterialName(selectedRecipe.outputDetails.materialId)} × {selectedRecipe.outputDetails.amount}</p>
              </Card>

              {/* 输入材料 */}
              {selectedRecipe.inputDetails && selectedRecipe.inputDetails.length > 0 && (
                <Card size="small" title={t('comprehensive.details.inputMaterials')} style={{ marginBottom: 16 }}>
                  <Table
                    columns={[
                      { title: t('comprehensive.details.material'), dataIndex: 'materialName', key: 'materialName' },
                      { title: t('comprehensive.details.quantity'), dataIndex: 'amount', key: 'amount' },
                      { title: t('comprehensive.details.unitPrice'), dataIndex: 'unitPrice', key: 'unitPrice', render: (price: number) => formatPrice(price) },
                      { title: t('comprehensive.details.totalCost'), dataIndex: 'totalCost', key: 'totalCost', render: (cost: number) => formatPrice(cost) },
                      { 
                        title: t('comprehensive.details.proportion'), 
                        key: 'costPercentage',
                        render: (_: any, record: any) => {
                          if (!selectedRecipe.priceAvailable || !selectedRecipe.inputCost) {
                            return '-'
                          }
                          const percentage = (record.totalCost / selectedRecipe.inputCost) * 100
                          return (
                            <Tag color={percentage > 30 ? 'red' : percentage > 15 ? 'orange' : 'green'}>
                              {percentage.toFixed(2)}%
                            </Tag>
                          )
                        }
                      },
                    ]}
                    dataSource={selectedRecipe.inputDetails}
                    rowKey="materialId"
                    pagination={false}
                    size="small"
                  />
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <strong>{t('comprehensive.details.inputTotalCost')}：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.inputCost !== null 
                      ? formatPrice(selectedRecipe.inputCost) 
                      : t('common.unknown')}
                  </div>
                </Card>
              )}

              {/* 劳动力消耗 */}
              {selectedRecipe.workforceDetails && selectedRecipe.workforceDetails.length > 0 && (
                <Card size="small" title={t('comprehensive.details.workforceConsumption')} style={{ marginBottom: 16 }}>
                  {selectedRecipe.workforceDetails.map((workforce, idx) => (
                    <div key={idx} style={{ marginBottom: 16 }}>
                      <h4>{workforce.workforceType} × {workforce.workerCount}{t('comprehensive.details.people')}</h4>
                      <Table
                        columns={[
                          { 
                            title: t('comprehensive.details.consumable'), 
                            dataIndex: 'materialName', 
                            key: 'materialName',
                            render: (name: string, record: any) => (
                              <Space>
                                {name}
                                {record.essential && <Tag color="red" style={{ fontSize: '10px' }}>{t('comprehensive.details.essential')}</Tag>}
                              </Space>
                            )
                          },
                          { 
                            title: t('comprehensive.details.cycleConsumption'), 
                            dataIndex: 'cycleAmount', 
                            key: 'cycleAmount',
                            render: (amount: number) => amount.toFixed(2)
                          },
                          { title: t('comprehensive.details.unitPrice'), dataIndex: 'unitPrice', key: 'unitPrice', render: (price: number) => formatPrice(price) },
                          { title: t('comprehensive.details.totalCost'), dataIndex: 'totalCost', key: 'totalCost', render: (cost: number) => formatPrice(cost) },
                        ]}
                        dataSource={workforce.consumables}
                        rowKey="materialId"
                        pagination={false}
                        size="small"
                      />
                      {workforce.costAvailable && (
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                          <strong>{workforce.workforceType}{t('comprehensive.details.cost')}：</strong>
                          {workforce.totalCost !== null ? formatPrice(workforce.totalCost) : t('common.unknown')}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
                    <strong style={{ fontSize: '16px' }}>{t('comprehensive.details.totalWorkforceCost')}：</strong>
                    <span style={{ fontSize: '18px', color: '#fa8c16', fontWeight: 'bold', marginLeft: 8 }}>
                      {selectedRecipe.workforceCostAvailable && selectedRecipe.workforceCost !== null
                        ? formatPrice(selectedRecipe.workforceCost)
                        : t('common.unknown')}
                    </span>
                  </div>
                  {selectedRecipe.expansionPenalty > 1.0 && (
                    <Alert
                      message={t('comprehensive.details.expansionPenalty', { penalty: ((selectedRecipe.expansionPenalty - 1) * 100).toFixed(1) })}
                      description={t('comprehensive.details.expansionPenaltyDesc', { totalPopulation })}
                      type="warning"
                      showIcon
                      style={{ marginTop: 12 }}
                    />
                  )}
                </Card>
              )}
            </Col>

            {/* 右侧：收益分析和饼图 */}
            <Col xs={24} md={12}>
              <Card size="small" title={t('comprehensive.details.profitAnalysis')} style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div style={{ 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('comprehensive.details.outputValue')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.outputValue !== null 
                        ? formatPrice(selectedRecipe.outputValue) 
                        : t('common.unknown')}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('comprehensive.details.recipeProfitPerHour')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.profitPerHour !== null 
                        ? formatPrice(selectedRecipe.profitPerHour) 
                        : t('common.unknown')}/h
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    background: selectedRecipe.comprehensiveProfitPerHour && selectedRecipe.comprehensiveProfitPerHour > 0
                      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('comprehensive.details.comprehensiveProfitPerHour')}</div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold', 
                      color: selectedRecipe.comprehensiveProfitPerHour && selectedRecipe.comprehensiveProfitPerHour > 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.workforceCostAvailable && selectedRecipe.comprehensiveProfitPerHour !== null
                        ? formatPrice(selectedRecipe.comprehensiveProfitPerHour)
                        : t('common.unknown')}/h
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                      {t('comprehensive.details.formula')}
                    </div>
                  </div>
                </Space>
              </Card>

              {/* 市场规模（fancy 样式） */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f5ff 60%, #e0f7fa 100%)',
                  border: '1px solid #e6f4ff'
                }}>
                  <Row gutter={16} align="middle">
                    <Col span={12}>
                      <div style={{ color: '#4082f4', fontWeight: 600, marginBottom: 4 }}>{t('comprehensive.details.marketSize')}</div>
                      {marketLoading ? (
                        <Spin size="small" />
                      ) : marketInfo && marketInfo.marketSize !== null ? (
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#1554d1' }}>
                          {formatPrice(marketInfo.marketSize)}
                        </div>
                      ) : (
                        <Tag color="default">{t('comprehensive.details.noMarketData')}</Tag>
                      )}
                    </Col>
                    <Col span={12}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e6f4ff',
                          borderRadius: 10,
                          padding: '8px 12px',
                          minWidth: 160
                        }}>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{t('comprehensive.details.avgDailySales')}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff' }}>
                            {marketInfo?.avgQtySoldDaily != null ? marketInfo.avgQtySoldDaily.toLocaleString() : '-'} {t('comprehensive.details.unitsPerDay')}
                          </div>
                        </div>
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e6f4ff',
                          borderRadius: 10,
                          padding: '8px 12px',
                          minWidth: 160
                        }}>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{t('comprehensive.details.avgPrice')}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>
                            {marketInfo?.avgPrice != null ? `${formatPrice(marketInfo.avgPrice)} ${t('comprehensive.details.perUnit')}` : '-'}
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>

              {/* 成本分布饼图 - 按输入原料和劳动力消耗品划分 */}
              {selectedRecipe.priceAvailable && selectedRecipe.workforceCostAvailable && (
                <Card size="small" title={t('comprehensive.details.costDistribution')}>
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const costData: Array<{name: string, value: number, category: string}> = []
                          
                          // 添加输入材料成本
                          if (selectedRecipe.inputDetails) {
                            selectedRecipe.inputDetails.forEach(input => {
                              costData.push({
                                name: `${input.materialName} (${t('comprehensive.details.costDistributionInputMaterials')})`,
                                value: input.totalCost,
                                category: 'input'
                              })
                            })
                          }
                          
                          // 添加劳动力消耗品成本（只显示Essential的）
                          if (selectedRecipe.workforceDetails) {
                            selectedRecipe.workforceDetails.forEach(workforce => {
                              if (workforce.consumables) {
                                workforce.consumables
                                  .filter(c => c.essential) // 只显示必需消耗品
                                  .forEach(consumable => {
                                    costData.push({
                                      name: `${consumable.materialName} (${workforce.workforceType})`,
                                      value: consumable.totalCost,
                                      category: 'workforce'
                                    })
                                  })
                              }
                            })
                          }
                          
                          return costData.filter(item => item.value > 0)
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={(entry) => {
                          const name = entry.name.length > 15 ? entry.name.substring(0, 13) + '...' : entry.name
                          return name
                        }}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(() => {
                          const costData: Array<{value: number}> = []
                          if (selectedRecipe.inputDetails) {
                            selectedRecipe.inputDetails.forEach(input => {
                              if (input.totalCost > 0) {
                                costData.push({ value: input.totalCost })
                              }
                            })
                          }
                          if (selectedRecipe.workforceDetails) {
                            selectedRecipe.workforceDetails.forEach(workforce => {
                              if (workforce.consumables) {
                                workforce.consumables
                                  .filter(c => c.essential && c.totalCost > 0)
                                  .forEach(consumable => {
                                    costData.push({ value: consumable.totalCost })
                                  })
                              }
                            })
                          }
                          return costData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))
                        })()}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [formatPrice(value), t('comprehensive.details.cost')]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        formatter={(value) => {
                          // 缩短图例文字
                          return value.length > 20 ? value.substring(0, 18) + '...' : value
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('comprehensive.details.costDistributionInputMaterials')}</div>
                        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#1890ff' }}>
                          {formatPrice(selectedRecipe.inputCost || 0)}
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('comprehensive.details.costDistributionLabor')}</div>
                        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                          {formatPrice(selectedRecipe.workforceCost || 0)}
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('comprehensive.details.costDistributionTotalCost')}</div>
                        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#f5222d' }}>
                          {formatPrice((selectedRecipe.inputCost || 0) + (selectedRecipe.workforceCost || 0))}
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  )
}

export default ComprehensiveAnalysis

