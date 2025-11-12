import { useState, useEffect } from 'react'
import { Card, Statistic, Row, Col, Space, message, Spin, Badge, Tag, Modal, Table, Alert } from 'antd'
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
  RocketOutlined,
  ShoppingOutlined,
  FireOutlined,
  TrophyOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { exchangeApi, comprehensiveApi, gameDataApi } from '../../services/api'
import { useTranslationData } from '../../hooks/useTranslationData'
import type { MaterialPrice, Building, Material } from '../../types'
import { formatPrice } from '../../utils/format'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140']

type MaterialPriceWithDiff = MaterialPrice & {
  priceDiffValue?: number | null
  priceDiffPercent?: number | null
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

interface RecipeWithMarketSize extends ComprehensiveProfit {
  marketSize: number | null
  avgQtySoldDaily: number | null
  avgPrice: number | null
}

const MarketOverview = () => {
  const { t } = useTranslation()
  const { getTranslatedName } = useTranslationData()
  const [prices, setPrices] = useState<MaterialPriceWithDiff[]>([])
  const [topRecipes, setTopRecipes] = useState<ComprehensiveProfit[]>([])
  const [topMarketSizeRecipes, setTopMarketSizeRecipes] = useState<RecipeWithMarketSize[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [marketSizeRecipesLoading, setMarketSizeRecipesLoading] = useState(false)
  const [availableRecipesCount, setAvailableRecipesCount] = useState<number>(0)
  const [selectedRecipe, setSelectedRecipe] = useState<ComprehensiveProfit | null>(null)
  const [marketLoading, setMarketLoading] = useState<boolean>(false)
  const [marketInfo, setMarketInfo] = useState<{ avgQtySoldDaily: number | null; avgPrice: number | null; marketSize: number | null } | null>(null)
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

  // 获取材料价格数据
  const fetchPrices = async () => {
    try {
      const pricesRes = await exchangeApi.getMaterialPrices()

      // 处理价格数据 - 根据API文档，全材料价格返回 {prices: [...]}
      let pricesData: MaterialPrice[] = []
      if ((pricesRes as any).prices) {
        pricesData = (pricesRes as any).prices
      } else if (Array.isArray(pricesRes)) {
        pricesData = pricesRes
      }

      const pricesWithDiff: MaterialPriceWithDiff[] = pricesData.map(price => {
        const hasValidPrice = price.currentPrice > 0 && price.avgPrice > 0
        const diffValue = hasValidPrice ? price.currentPrice - price.avgPrice : null
        const diffPercent = hasValidPrice && price.avgPrice !== 0
          ? diffValue! / price.avgPrice
          : null

        return {
          ...price,
          priceDiffValue: diffValue,
          priceDiffPercent: diffPercent,
        }
      })

      setPrices(pricesWithDiff)
    } catch (error) {
      console.error('Failed to fetch prices:', error)
      message.error(t('market.loadingError'))
    }
  }

  // 获取前5个最赚钱的配方
  const fetchTopRecipes = async () => {
    setRecipesLoading(true)
    try {
      // 先获取建筑和材料数据用于翻译
      const [buildingsRes, materialsRes] = await Promise.all([
        gameDataApi.getBuildings(),
        gameDataApi.getMaterials()
      ])
      setBuildings((buildingsRes as any).buildings || [])
      setMaterials((materialsRes as any).materials || [])

      // 获取综合收益分析数据，按综合每小时收益排序，取前5个
      const response = await comprehensiveApi.analyzeRecipeProfits('comprehensiveProfitPerHour', undefined, 0, 100)
      const data = (response as any).comprehensiveAnalysis || []
      
      // 计算可用配方个数（价格可用的配方）
      const availableCount = data.filter((r: ComprehensiveProfit) => r.priceAvailable).length
      setAvailableRecipesCount(availableCount)
      
      // 过滤出有有效收益数据的配方，取前5个
      const validRecipes = data
        .filter((r: ComprehensiveProfit) => 
          r.priceAvailable && 
          r.workforceCostAvailable && 
          r.comprehensiveProfitPerHour !== null && 
          r.comprehensiveProfitPerHour > 0
        )
        .slice(0, 5)
      
      setTopRecipes(validRecipes)
    } catch (error) {
      console.error('Failed to fetch top recipes:', error)
      message.error(t('market.topRecipesError'))
    } finally {
      setRecipesLoading(false)
    }
  }

  // 获取市场规模最大的配方
  const fetchTopMarketSizeRecipes = async () => {
    setMarketSizeRecipesLoading(true)
    try {
      // 获取所有配方数据
      const response = await comprehensiveApi.analyzeRecipeProfits('comprehensiveProfitPerHour', undefined, 0, 100)
      const data = (response as any).comprehensiveAnalysis || []
      
      // 一次性获取所有材料详情（减少API请求）
      let allDetailsMap: Map<number, any> = new Map()
      try {
        const allDetails = await exchangeApi.getMaterialDetails() as any
        // 处理返回的数据格式
        if (allDetails && typeof allDetails === 'object') {
          if (Array.isArray(allDetails)) {
            // 如果是数组格式
            allDetails.forEach((detail: any) => {
              if (detail && detail.matId) {
                allDetailsMap.set(detail.matId, detail)
              }
            })
          } else if (allDetails.materials && Array.isArray(allDetails.materials)) {
            // 如果是 {materials: [...]} 格式
            allDetails.materials.forEach((detail: any) => {
              if (detail && detail.matId) {
                allDetailsMap.set(detail.matId, detail)
              }
            })
          } else if (allDetails.matId) {
            // 如果是单个材料详情
            allDetailsMap.set(allDetails.matId, allDetails)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch all material details:', error)
      }
      
      // 为每个配方计算市场规模（从本地数据中查找）
      const recipesWithMarketSize: RecipeWithMarketSize[] = data
        .filter((r: ComprehensiveProfit) => r.priceAvailable && r.outputDetails?.materialId)
        .map((recipe: ComprehensiveProfit) => {
          const materialId = recipe.outputDetails.materialId
          const details = allDetailsMap.get(materialId)
          
          if (details) {
            const avgQty = details.avgQtySoldDaily
            const avgPrice = details.avgPrice
            
            let marketSize: number | null = null
            if (typeof avgQty === 'number' && typeof avgPrice === 'number' && avgQty >= 0 && avgPrice >= 0) {
              marketSize = Math.round(avgQty * avgPrice)
            }
            
            return {
              ...recipe,
              marketSize,
              avgQtySoldDaily: typeof avgQty === 'number' && avgQty >= 0 ? avgQty : null,
              avgPrice: typeof avgPrice === 'number' && avgPrice >= 0 ? avgPrice : null
            } as RecipeWithMarketSize
          } else {
            return {
              ...recipe,
              marketSize: null,
              avgQtySoldDaily: null,
              avgPrice: null
            } as RecipeWithMarketSize
          }
        })
      
      // 按市场规模排序，取前5个
      const sorted = recipesWithMarketSize
        .filter(r => r.marketSize !== null && r.marketSize > 0)
        .sort((a, b) => (b.marketSize || 0) - (a.marketSize || 0))
        .slice(0, 5)
      
      setTopMarketSizeRecipes(sorted)
    } catch (error) {
      console.error('Failed to fetch top market size recipes:', error)
      message.error(t('market.topMarketSizeRecipesError'))
    } finally {
      setMarketSizeRecipesLoading(false)
    }
  }

  useEffect(() => {
    fetchPrices()
    fetchTopRecipes()
    fetchTopMarketSizeRecipes()
    // 设置定时刷新（每60秒）
    const interval = setInterval(() => {
      fetchPrices()
      fetchTopRecipes()
      fetchTopMarketSizeRecipes()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

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

  // 计算统计数据
  const stats = {
    totalMaterials: prices.length,
    availableMaterials: prices.filter(p => p.currentPrice > 0).length,
    availableRecipes: availableRecipesCount,
    maxPrice: prices.length > 0 
      ? Math.max(...prices.map(p => p.currentPrice > 0 ? p.currentPrice : 0)) 
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
          {t('market.title')}
        </h1>
        <p style={{ color: '#8c8c8c', fontSize: isMobile ? '14px' : '16px' }}>
          {t('market.subtitle')}
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="slide-in-left">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('market.stats.totalMaterials')}</span>}
              value={stats.totalMaterials}
              suffix={t('market.unitType')}
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('market.stats.availableMaterials')}</span>}
              value={stats.availableMaterials}
              suffix={t('market.unitType')}
              prefix={<RocketOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('market.stats.availableRecipes')}</span>}
              value={stats.availableRecipes}
              suffix={t('market.unitCount')}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>{t('market.stats.maxPrice')}</span>}
              value={stats.maxPrice / 100}
              precision={2}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Top Profitable Recipes */}
      <Card 
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14', fontSize: '20px' }} />
            <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold' }}>
              {t('market.topProfitableRecipes')}
            </span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={recipesLoading}>
          {topRecipes.length > 0 ? (
            <Row gutter={[16, 16]}>
              {topRecipes.map((recipe, index) => (
                <Col xs={24} sm={12} md={8} lg={Math.floor(24 / Math.min(topRecipes.length, 5))} key={recipe.recipeId}>
                  <Card
                    hoverable
                    onClick={() => setSelectedRecipe(recipe)}
                    style={{
                      cursor: 'pointer',
                      height: '100%',
                      border: index === 0 
                        ? '2px solid #faad14' 
                        : '1px solid #f0f0f0',
                      borderRadius: '8px',
                      background: index === 0
                        ? 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)'
                        : '#fff',
                    }}
                    bodyStyle={{ padding: isMobile ? '16px' : '20px' }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Badge 
                            count={index + 1} 
                            style={{ 
                              backgroundColor: index === 0 ? '#faad14' : '#1890ff',
                              fontSize: isMobile ? '12px' : '14px'
                            }} 
                          />
                          <span style={{ 
                            fontSize: isMobile ? '14px' : '16px', 
                            fontWeight: 'bold',
                            color: index === 0 ? '#faad14' : '#262626'
                          }}>
                            {getRecipeName(recipe)}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        padding: '12px', 
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        borderRadius: '6px',
                        marginTop: '8px'
                      }}>
                        <div style={{ color: '#8c8c8c', fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                          {t('market.comprehensiveProfitPerHour')}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '20px' : '24px', 
                          fontWeight: 'bold', 
                          color: '#1890ff' 
                        }}>
                          {formatPrice(recipe.comprehensiveProfitPerHour || 0)}/h
                        </div>
                      </div>

                      <div style={{ 
                        padding: '8px', 
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        textAlign: 'center',
                        marginTop: '8px'
                      }}>
                        <div style={{ color: '#8c8c8c', fontSize: isMobile ? '10px' : '11px' }}>
                          {t('market.building')}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '12px' : '13px', 
                          fontWeight: '500',
                          marginTop: '4px'
                        }}>
                          {getBuildingName(recipe.buildingId)}
                        </div>
                      </div>

                      {recipe.profitPerHour !== null && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          background: '#f0f0f0',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: isMobile ? '11px' : '12px', color: '#8c8c8c' }}>
                            {t('market.recipeProfitPerHour')}:
                          </span>
                          <span style={{ 
                            fontSize: isMobile ? '12px' : '13px', 
                            fontWeight: '500',
                            color: recipe.profitPerHour > 0 ? '#52c41a' : '#f5222d'
                          }}>
                            {formatPrice(recipe.profitPerHour)}/h
                          </span>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            !recipesLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
                {t('market.noTopRecipes')}
              </div>
            )
          )}
        </Spin>
      </Card>

      {/* Top Market Size Recipes */}
      <Card 
        title={
          <Space>
            <BarChartOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
            <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold' }}>
              {t('market.topMarketSizeRecipes')}
            </span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={marketSizeRecipesLoading}>
          {topMarketSizeRecipes.length > 0 ? (
            <Row gutter={[16, 16]}>
              {topMarketSizeRecipes.map((recipe, index) => (
                <Col xs={24} sm={12} md={8} lg={Math.floor(24 / Math.min(topMarketSizeRecipes.length, 5))} key={recipe.recipeId}>
                  <Card
                    hoverable
                    onClick={() => setSelectedRecipe(recipe)}
                    style={{
                      cursor: 'pointer',
                      height: '100%',
                      border: index === 0 
                        ? '2px solid #52c41a' 
                        : '1px solid #f0f0f0',
                      borderRadius: '8px',
                      background: index === 0
                        ? 'linear-gradient(135deg, #f6ffed 0%, #f0f9e8 100%)'
                        : '#fff',
                    }}
                    bodyStyle={{ padding: isMobile ? '16px' : '20px' }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Badge 
                            count={index + 1} 
                            style={{ 
                              backgroundColor: index === 0 ? '#52c41a' : '#1890ff',
                              fontSize: isMobile ? '12px' : '14px'
                            }} 
                          />
                          <span style={{ 
                            fontSize: isMobile ? '14px' : '16px', 
                            fontWeight: 'bold',
                            color: index === 0 ? '#52c41a' : '#262626'
                          }}>
                            {getRecipeName(recipe)}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        padding: '12px', 
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        borderRadius: '6px',
                        marginTop: '8px'
                      }}>
                        <div style={{ color: '#8c8c8c', fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                          {t('market.marketSize')}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '20px' : '24px', 
                          fontWeight: 'bold', 
                          color: '#1890ff' 
                        }}>
                          {formatPrice(recipe.marketSize || 0)}
                        </div>
                      </div>

                      <div style={{ 
                        padding: '8px', 
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        textAlign: 'center',
                        marginTop: '8px'
                      }}>
                        <div style={{ color: '#8c8c8c', fontSize: isMobile ? '10px' : '11px' }}>
                          {t('market.building')}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? '12px' : '13px', 
                          fontWeight: '500',
                          marginTop: '4px'
                        }}>
                          {getBuildingName(recipe.buildingId)}
                        </div>
                      </div>

                      {recipe.avgQtySoldDaily !== null && recipe.avgPrice !== null && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          background: '#f0f0f0',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: isMobile ? '11px' : '12px', color: '#8c8c8c' }}>
                              {t('market.avgDailySales')}:
                            </span>
                            <span style={{ 
                              fontSize: isMobile ? '12px' : '13px', 
                              fontWeight: '500',
                              color: '#1677ff'
                            }}>
                              {recipe.avgQtySoldDaily.toLocaleString()} {t('market.unitsPerDay')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: isMobile ? '11px' : '12px', color: '#8c8c8c' }}>
                              {t('market.avgPrice')}:
                            </span>
                            <span style={{ 
                              fontSize: isMobile ? '12px' : '13px', 
                              fontWeight: '500',
                              color: '#52c41a'
                            }}>
                              {formatPrice(recipe.avgPrice)} {t('market.perUnit')}
                            </span>
                          </div>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            !marketSizeRecipesLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
                {t('market.noTopMarketSizeRecipes')}
              </div>
            )
          )}
        </Spin>
      </Card>

      {/* 配方详情弹窗 */}
      <Modal
        title={selectedRecipe ? `${getRecipeName(selectedRecipe)} - ${t('market.details.title')}` : ''}
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
              <Card size="small" title={t('market.details.recipeInfo')} style={{ marginBottom: 16 }}>
                <p><strong>{t('market.details.building')}：</strong>{getBuildingName(selectedRecipe.buildingId)}</p>
                <p><strong>{t('market.details.productionTime')}：</strong>{selectedRecipe.timeHours.toFixed(2)} {t('market.details.hours')}</p>
                <p><strong>{t('market.details.output')}：</strong>{getMaterialName(selectedRecipe.outputDetails.materialId)} × {selectedRecipe.outputDetails.amount}</p>
              </Card>

              {/* 输入材料 */}
              {selectedRecipe.inputDetails && selectedRecipe.inputDetails.length > 0 && (
                <Card size="small" title={t('market.details.inputMaterials')} style={{ marginBottom: 16 }}>
                  <Table
                    columns={[
                      { title: t('market.details.material'), dataIndex: 'materialName', key: 'materialName' },
                      { title: t('market.details.quantity'), dataIndex: 'amount', key: 'amount' },
                      { title: t('market.details.unitPrice'), dataIndex: 'unitPrice', key: 'unitPrice', render: (price: number) => formatPrice(price) },
                      { title: t('market.details.totalCost'), dataIndex: 'totalCost', key: 'totalCost', render: (cost: number) => formatPrice(cost) },
                      { 
                        title: t('market.details.proportion'), 
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
                    <strong>{t('market.details.inputTotalCost')}：</strong>
                    {selectedRecipe.priceAvailable && selectedRecipe.inputCost !== null 
                      ? formatPrice(selectedRecipe.inputCost) 
                      : t('market.details.unknown')}
                  </div>
                </Card>
              )}

              {/* 劳动力消耗 */}
              {selectedRecipe.workforceDetails && selectedRecipe.workforceDetails.length > 0 && (
                <Card size="small" title={t('market.details.workforceConsumption')} style={{ marginBottom: 16 }}>
                  {selectedRecipe.workforceDetails.map((workforce, idx) => (
                    <div key={idx} style={{ marginBottom: 16 }}>
                      <h4>{workforce.workforceType} × {workforce.workerCount}{t('market.details.people')}</h4>
                      <Table
                        columns={[
                          { 
                            title: t('market.details.consumable'), 
                            dataIndex: 'materialName', 
                            key: 'materialName',
                            render: (name: string, record: any) => (
                              <Space>
                                {name}
                                {record.essential && <Tag color="red" style={{ fontSize: '10px' }}>{t('market.details.essential')}</Tag>}
                              </Space>
                            )
                          },
                          { 
                            title: t('market.details.cycleConsumption'), 
                            dataIndex: 'cycleAmount', 
                            key: 'cycleAmount',
                            render: (amount: number) => amount.toFixed(2)
                          },
                          { title: t('market.details.unitPrice'), dataIndex: 'unitPrice', key: 'unitPrice', render: (price: number) => formatPrice(price) },
                          { title: t('market.details.totalCost'), dataIndex: 'totalCost', key: 'totalCost', render: (cost: number) => formatPrice(cost) },
                        ]}
                        dataSource={workforce.consumables}
                        rowKey="materialId"
                        pagination={false}
                        size="small"
                      />
                      {workforce.costAvailable && (
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                          <strong>{workforce.workforceType}{t('market.details.cost')}：</strong>
                          {workforce.totalCost !== null ? formatPrice(workforce.totalCost) : t('market.details.unknown')}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
                    <strong style={{ fontSize: '16px' }}>{t('market.details.totalWorkforceCost')}：</strong>
                    <span style={{ fontSize: '18px', color: '#fa8c16', fontWeight: 'bold', marginLeft: 8 }}>
                      {selectedRecipe.workforceCostAvailable && selectedRecipe.workforceCost !== null
                        ? formatPrice(selectedRecipe.workforceCost)
                        : t('market.details.unknown')}
                    </span>
                  </div>
                  {selectedRecipe.expansionPenalty > 1.0 && (
                    <Alert
                      message={t('market.details.expansionPenalty', { penalty: ((selectedRecipe.expansionPenalty - 1) * 100).toFixed(1) })}
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
              <Card size="small" title={t('market.details.profitAnalysis')} style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div style={{ 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('market.details.outputValue')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.outputValue !== null 
                        ? formatPrice(selectedRecipe.outputValue) 
                        : t('market.details.unknown')}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('market.details.recipeProfitPerHour')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.profitPerHour !== null 
                        ? formatPrice(selectedRecipe.profitPerHour) 
                        : t('market.details.unknown')}/h
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    background: selectedRecipe.comprehensiveProfitPerHour && selectedRecipe.comprehensiveProfitPerHour > 0
                      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ color: '#666', marginBottom: 4 }}>{t('market.details.comprehensiveProfitPerHour')}</div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: 'bold', 
                      color: selectedRecipe.comprehensiveProfitPerHour && selectedRecipe.comprehensiveProfitPerHour > 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {selectedRecipe.priceAvailable && selectedRecipe.workforceCostAvailable && selectedRecipe.comprehensiveProfitPerHour !== null
                        ? formatPrice(selectedRecipe.comprehensiveProfitPerHour)
                        : t('market.details.unknown')}/h
                    </div>
                  </div>
                </Space>
              </Card>

              {/* 市场规模 */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f5ff 60%, #e0f7fa 100%)',
                  border: '1px solid #e6f4ff'
                }}>
                  <Row gutter={16} align="middle">
                    <Col span={12}>
                      <div style={{ color: '#4082f4', fontWeight: 600, marginBottom: 4 }}>{t('market.details.marketSize')}</div>
                      {marketLoading ? (
                        <Spin size="small" />
                      ) : marketInfo && marketInfo.marketSize !== null ? (
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#1554d1' }}>
                          {formatPrice(marketInfo.marketSize)}
                        </div>
                      ) : (
                        <Tag color="default">{t('market.details.noMarketData')}</Tag>
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
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{t('market.details.avgDailySales')}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff' }}>
                            {marketInfo?.avgQtySoldDaily != null ? marketInfo.avgQtySoldDaily.toLocaleString() : '-'} {t('market.details.unitsPerDay')}
                          </div>
                        </div>
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e6f4ff',
                          borderRadius: 10,
                          padding: '8px 12px',
                          minWidth: 160
                        }}>
                          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{t('market.details.avgPrice')}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>
                            {marketInfo?.avgPrice != null ? `${formatPrice(marketInfo.avgPrice)} ${t('market.details.perUnit')}` : '-'}
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>

              {/* 成本分布饼图 */}
              {selectedRecipe.priceAvailable && selectedRecipe.workforceCostAvailable && (
                <Card size="small" title={t('market.details.costDistribution')}>
                  <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const costData: Array<{name: string, value: number, category: string}> = []
                          
                          if (selectedRecipe.inputDetails) {
                            selectedRecipe.inputDetails.forEach(input => {
                              costData.push({
                                name: `${input.materialName} (${t('market.details.costDistributionInputMaterials')})`,
                                value: input.totalCost,
                                category: 'input'
                              })
                            })
                          }
                          
                          if (selectedRecipe.workforceDetails) {
                            selectedRecipe.workforceDetails.forEach(workforce => {
                              if (workforce.consumables) {
                                workforce.consumables
                                  .filter(c => c.essential)
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
                        formatter={(value: number) => [formatPrice(value), t('market.details.cost')]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        formatter={(value) => {
                          return value.length > 20 ? value.substring(0, 18) + '...' : value
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('market.details.costDistributionInputMaterials')}</div>
                        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#1890ff' }}>
                          {formatPrice(selectedRecipe.inputCost || 0)}
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('market.details.costDistributionLabor')}</div>
                        <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                          {formatPrice(selectedRecipe.workforceCost || 0)}
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ color: '#666', fontSize: '12px' }}>{t('market.details.costDistributionTotalCost')}</div>
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

export default MarketOverview
