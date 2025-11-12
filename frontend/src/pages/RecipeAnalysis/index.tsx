import { useState, useEffect, useMemo } from 'react'
import { Card, Table, Select, Space, Spin, message, Row, Col, Statistic, Tag, Tooltip, Alert, InputNumber, Modal, AutoComplete } from 'antd'
import { useTranslation } from 'react-i18next'
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
import { useTranslationData } from '../../hooks/useTranslationData'
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
  const { t } = useTranslation()
  const { getTranslatedName } = useTranslationData()
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

      // 获取配方收益数据
      await fetchProfits(sortBy, buildingFilter)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error(t('recipes.loadingError'))
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
      applyFilters(profits, searchText)
    } catch (error) {
      console.error('Failed to fetch profits:', error)
      message.error(t('recipes.profitError'))
    }
  }

  // 应用搜索过滤
  const applyFilters = (profits: RecipeProfit[], search: string) => {
    if (!search.trim()) {
      setFilteredProfits(profits)
      return
    }
    
    const searchLower = search.toLowerCase().trim()
    const filtered = profits.filter(profit => {
      // 搜索翻译后的配方名称
      const recipeName = getRecipeName(profit)
      return recipeName.toLowerCase().includes(searchLower)
    })
    setFilteredProfits(filtered)
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
  const getRecipeName = (recipe: RecipeProfit) => {
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
    const matchedRecipes = recipeProfits
      .filter(profit => {
        // 搜索翻译后的配方名称
        const recipeName = getRecipeName(profit)
        return recipeName.toLowerCase().includes(searchLower)
      })
      .slice(0, 10) // 最多显示10个选项
    
    return matchedRecipes.map(profit => {
      const recipeName = getRecipeName(profit)
      return {
        value: recipeName,
        label: (
          <div>
            <span>{recipeName}</span>
            <span style={{ color: '#999', marginLeft: 8, fontSize: '12px' }}>
              {getBuildingName(profit.buildingId)}
            </span>
          </div>
        ),
      }
    })
  }, [searchText, recipeProfits, buildings])

  // 搜索文本变化时应用过滤
  useEffect(() => {
    applyFilters(recipeProfits, searchText)
  }, [searchText, recipeProfits])

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

  // 获取材料级别（Tier）
  const getMaterialTier = (materialId: number): string => {
    const material = materials.find(m => m.id === materialId)
    if (material && material.tier) {
      return `T${material.tier}`
    }
    return 'N/A'
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
      return t('buildings.influenceTypes.fertility')
    }
    if (INFLUENCED_BUILDINGS.abundance.some(name => buildingName.includes(name))) {
      return t('buildings.influenceTypes.abundance')
    }
    return ''
  }

  // 表格列定义（响应式）
  const columns = [
    {
      title: t('recipes.columns.recipeName'),
      dataIndex: 'recipeName',
      key: 'recipeName',
      fixed: 'left' as const,
      width: isMobile ? 150 : 200,
      render: (_: string, record: RecipeProfit) => getRecipeName(record),
    },
    {
      title: t('recipes.columns.outputTier'),
      key: 'outputTier',
      width: isMobile ? 80 : 100,
      render: (_: any, record: RecipeProfit) => {
        const tier = getMaterialTier(record.outputDetails.materialId)
        const tierNum = tier.replace('T', '')
        const color = tierNum === '1' ? 'default' : tierNum === '2' ? 'blue' : tierNum === '3' ? 'purple' : tierNum === '4' ? 'gold' : 'default'
        return <Tag color={color} style={{ fontSize: isMobile ? '11px' : '12px' }}>{tier}</Tag>
      },
    },
    {
      title: t('recipes.columns.building'),
      dataIndex: 'buildingId',
      key: 'buildingId',
      width: isMobile ? 120 : 150,
      render: (id: number) => <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{getBuildingName(id)}</span>,
    },
    {
      title: t('recipes.columns.productionTime'),
      dataIndex: 'timeHours',
      key: 'timeHours',
      width: isMobile ? 100 : 120,
      render: (hours: number) => <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{hours.toFixed(2)}{t('recipes.units.hours')}</span>,
    },
    {
      title: t('recipes.columns.inputCost'),
      dataIndex: 'inputCost',
      key: 'inputCost',
      width: isMobile ? 100 : 120,
      render: (cost: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || cost === null) {
          return <Tag color="default" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
        }
        return <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(cost)}</span>
      },
    },
    {
      title: t('recipes.columns.outputValue'),
      dataIndex: 'outputValue',
      key: 'outputValue',
      width: isMobile ? 100 : 120,
      render: (value: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || value === null) {
          return <Tag color="default" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
        }
        return <span style={{ fontSize: isMobile ? '12px' : '14px' }}>{formatPrice(value)}</span>
      },
    },
    {
      title: t('recipes.columns.totalProfit'),
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: isMobile ? 100 : 120,
      render: (profit: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || profit === null) {
          return <Tag color="default" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px' }}>
            {formatPrice(profit)}
          </span>
        )
      },
    },
    {
      title: t('recipes.columns.profitPerHour'),
      dataIndex: 'profitPerHour',
      key: 'profitPerHour',
      width: isMobile ? 110 : 130,
      render: (profit: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable || profit === null) {
          return <Tag color="default" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
        }
        return (
          <span style={{ color: profit > 0 ? '#3f8600' : '#cf1322', fontSize: isMobile ? '12px' : '14px' }}>
            {formatPrice(profit)}{t('recipes.units.perHour')}
          </span>
        )
      },
    },
    {
      title: t('recipes.columns.roi'),
      dataIndex: 'roi',
      key: 'roi',
      width: isMobile ? 80 : 120,
      render: (roi: number | null, record: RecipeProfit) => {
        if (!record.priceAvailable) {
          return (
            <Tooltip title={t('recipes.tooltips.priceUnavailable')}>
              <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.unknown')}</Tag>
            </Tooltip>
          )
        }
        if (roi === null || roi === Infinity) {
          return <Tag color="gold" style={{ fontSize: isMobile ? '11px' : '12px' }}>N/A</Tag>
        }
        return (
          <Tag color={roi > 50 ? 'green' : roi > 0 ? 'blue' : 'red'} style={{ fontSize: isMobile ? '11px' : '12px' }}>
            {roi.toFixed(2)}%
          </Tag>
        )
      },
    },
    {
      title: t('common.viewDetails'),
      key: 'action',
      width: isMobile ? 80 : 100,
      fixed: 'right' as const,
      render: (_: any, record: RecipeProfit) => (
        <a onClick={() => setSelectedRecipe(record)} style={{ fontSize: isMobile ? '12px' : '14px' }}>{t('common.viewDetails')}</a>
      ),
    },
  ]

  // 输入材料表格列
  const inputColumns = [
    {
      title: t('recipes.details.inputMaterials.materialName'),
      dataIndex: 'materialId',
      key: 'materialId',
      render: (id: number) => getMaterialName(id),
    },
    {
      title: t('recipes.details.inputMaterials.quantity'),
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: t('recipes.details.inputMaterials.unitPrice'),
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => formatPrice(price),
    },
    {
      title: t('recipes.details.inputMaterials.totalCost'),
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => formatPrice(cost),
    },
    {
      title: t('recipes.details.inputMaterials.proportion'),
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
      name: getRecipeName(profit),
      totalProfit: profit.totalProfit,
      profitPerHour: profit.profitPerHour,
    }))

  return (
    <div>
      <h1 style={{ marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? '20px' : '24px' }}>{t('recipes.title')}</h1>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('recipes.stats.totalRecipes')}
              value={stats.totalRecipes}
              suffix={t('recipes.unitCount')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('recipes.stats.profitableRecipes')}
              value={stats.profitableRecipes}
              suffix={t('recipes.unitCount')}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('recipes.stats.avgProfit')}
              value={formatPrice(stats.avgProfit, false)}
              prefix="$"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('recipes.stats.maxProfitPerHour')}
              value={formatPrice(stats.maxProfitPerHour, false)}
              prefix="$"
              suffix={t('recipes.units.perHour')}
            />
                </Card>
        </Col>
      </Row>

      {/* 收益图表 */}
      <Card title={t('recipes.top10Chart')} style={{ marginBottom: isMobile ? 16 : 24 }}>
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis tickFormatter={(value) => formatPrice(value, false)} />
            <RechartsTooltip formatter={(value: number) => formatPrice(value)} />
            <Legend />
            <Bar dataKey="totalProfit" fill="#1890ff" name={t('recipes.columns.totalProfit')} />
            <Bar dataKey="profitPerHour" fill="#52c41a" name={t('recipes.columns.profitPerHour')} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 筛选和排序 */}
      <Card style={{ marginBottom: 16 }}>
        <Space 
          direction={isMobile ? 'vertical' : 'horizontal'} 
          wrap 
          size={isMobile ? 'middle' : 'large'}
          style={{ width: '100%' }}
        >
          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('recipes.filters.searchRecipe')}：</span>
            <AutoComplete
              placeholder={t('recipes.filters.searchPlaceholder')}
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
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('recipes.filters.sortBy')}：</span>
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: isMobile ? '100%' : 150 }}
            >
              <Option value="totalProfit">{t('recipes.filters.sortOptions.totalProfit')}</Option>
              <Option value="profitPerHour">{t('recipes.filters.sortOptions.profitPerHour')}</Option>
              <Option value="roi">ROI</Option>
            </Select>
          </Space>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{t('recipes.filters.buildingFilter')}：</span>
            <Select
              value={buildingFilter}
              onChange={(value) => {
                setBuildingFilter(value)
                // 当切换建筑时，重置肥力/丰度值为100
                if (!value || !isBuildingInfluenced(value)) {
                  setFertilityAbundance(100)
                }
              }}
              style={{ width: isMobile ? '100%' : 200 }}
              allowClear
              placeholder={t('recipes.filters.allBuildings')}
            >
              {buildings
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(building => (
                  <Option key={building.id} value={building.id}>
                    {getBuildingName(building.id)}
                  </Option>
                ))
              }
            </Select>
          </Space>
          {buildingFilter && isBuildingInfluenced(buildingFilter) && (
            <Space direction={isMobile ? 'vertical' : 'horizontal'} align={isMobile ? 'start' : 'center'} style={{ width: isMobile ? '100%' : 'auto' }}>
              <span style={{ minWidth: isMobile ? 'auto' : 80 }}>{getInfluenceType(buildingFilter)}{t('recipes.filters.value')}：</span>
              <InputNumber
                value={fertilityAbundance}
                onChange={(value) => setFertilityAbundance(value || 100)}
                min={0}
                max={1000}
                step={10}
                style={{ width: isMobile ? '100%' : 120 }}
                addonAfter="%"
              />
              <Tooltip title={t('recipes.filters.fertilityAbundanceTooltip', { type: getInfluenceType(buildingFilter) })}>
                <Tag color="blue" style={{ fontSize: isMobile ? '11px' : '12px' }}>{t('common.tip')}</Tag>
              </Tooltip>
            </Space>
          )}
        </Space>
      </Card>

      {/* 配方列表 */}
      <Card title={t('recipes.recipeList')}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredProfits}
            rowKey="recipeId"
            pagination={{
              pageSize: isMobile ? 10 : 20,
              showTotal: (total) => `共 ${total} 个配方`,
              showSizeChanger: !isMobile,
              simple: isMobile,
            }}
            scroll={{ x: isMobile ? 800 : 1200 }}
            size={isMobile ? 'small' : 'middle'}
          />
        </Spin>
      </Card>

      {/* 配方详情弹窗 */}
      <Modal
        title={selectedRecipe ? `${getRecipeName(selectedRecipe)} - ${t('common.details')}` : ''}
        open={!!selectedRecipe}
        onCancel={() => setSelectedRecipe(null)}
        footer={null}
        width={isMobile ? '95%' : isTablet ? 900 : 1200}
        style={{ top: isMobile ? 10 : 20 }}
        styles={{ body: { maxHeight: isMobile ? 'calc(100vh - 120px)' : 'auto', overflowY: 'auto' } }}
      >
        {selectedRecipe && (
          <>
            {!selectedRecipe.priceAvailable && selectedRecipe.unavailableMaterials && selectedRecipe.unavailableMaterials.length > 0 && (
              <Alert
                message={t('recipes.details.priceIncomplete')}
                description={
                  <div>
                    <p style={{ marginBottom: 8 }}>{t('recipes.details.priceIncompleteDesc')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedRecipe.unavailableMaterials.map(mat => (
                        <Tag key={mat.materialId} color="warning" style={{ fontSize: isMobile ? '11px' : '12px' }}>
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
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <h3>{t('recipes.details.inputMaterialsTitle')}</h3>
                <Table
                  columns={inputColumns}
                  dataSource={selectedRecipe.inputDetails}
                  rowKey="materialId"
                  pagination={false}
                  size="small"
                />
                <div style={{ marginTop: 16 }}>
                  <strong>{t('recipes.details.inputTotalCost')}：</strong>
                  {selectedRecipe.priceAvailable && selectedRecipe.inputCost !== null 
                    ? formatPrice(selectedRecipe.inputCost) 
                    : t('common.unknown')}
                </div>

                {/* 输入材料成本饼图 */}
                {selectedRecipe.priceAvailable && selectedRecipe.inputDetails && selectedRecipe.inputDetails.length > 0 && (
                  <Card size="small" style={{ marginTop: 16 }} title={t('recipes.details.inputCostDistribution')}>
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
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
                          formatter={(value: number) => [formatPrice(value), t('recipes.details.cost')]}
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
              <Col xs={24} md={12}>
                <h3>{t('recipes.details.outputProduct')}</h3>
                <Card size="small">
                  <p><strong>{t('recipes.details.material')}：</strong>{getMaterialName(selectedRecipe.outputDetails.materialId)}</p>
                  <p><strong>{t('recipes.details.quantity')}：</strong>{selectedRecipe.outputDetails.amount}</p>
                  <p><strong>{t('recipes.details.unitPrice')}：</strong>
                    {selectedRecipe.outputDetails.priceAvailable 
                      ? formatPrice(selectedRecipe.outputDetails.unitPrice) 
                      : t('common.unknown')}
                  </p>
                  <p><strong>{t('recipes.details.totalValue')}：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.outputDetails.totalValue !== null 
                      ? formatPrice(selectedRecipe.outputDetails.totalValue) 
                      : t('common.unknown')}
                  </p>
                </Card>
                <Card size="small" style={{ marginTop: 16 }}>
                  <h4>{t('recipes.details.profitAnalysis')}</h4>
                  <p><strong>{t('recipes.details.productionTime')}：</strong>{selectedRecipe.timeHours.toFixed(2)} {t('recipes.units.hours')}</p>
                  <p><strong>{t('recipes.details.totalProfit')}：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.totalProfit !== null ? (
                      <span style={{ color: selectedRecipe.totalProfit > 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
                        {formatPrice(selectedRecipe.totalProfit)}
                      </span>
                    ) : t('common.unknown')}
                  </p>
                  <p><strong>{t('recipes.details.profitPerHour')}：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.profitPerHour !== null ? (
                      <span style={{ color: selectedRecipe.profitPerHour > 0 ? '#3f8600' : '#cf1322' }}>
                        {formatPrice(selectedRecipe.profitPerHour)}
                      </span>
                    ) : t('common.unknown')}
                  </p>
                  <p><strong>ROI：</strong>
                    {selectedRecipe.roi === null || selectedRecipe.roi === Infinity 
                      ? 'N/A' 
                      : `${selectedRecipe.roi.toFixed(2)}%`}
                  </p>
                  <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0 12px' }} />
                  <h4 style={{ marginBottom: 8 }}>{t('recipes.details.marketSize')}</h4>
                  {marketLoading ? (
                    <Spin size="small" />
                  ) : marketInfo && marketInfo.marketSize !== null ? (
                    <>
                      <p style={{ marginBottom: 4 }}><strong>{t('recipes.details.avgDailySales')}：</strong>{marketInfo.avgQtySoldDaily?.toLocaleString()} {t('recipes.details.unitsPerDay')}</p>
                      <p style={{ marginBottom: 4 }}><strong>{t('recipes.details.avgPrice')}：</strong>{formatPrice(marketInfo.avgPrice!)} {t('recipes.details.perUnit')}</p>
                      <p style={{ marginBottom: 0 }}><strong>{t('recipes.details.marketSize')}：</strong>
                        <span style={{ fontWeight: 'bold' }}>{formatPrice(marketInfo.marketSize)}</span>
                      </p>
                    </>
                  ) : (
                    <Tag color="default">{t('recipes.details.noMarketData')}</Tag>
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

