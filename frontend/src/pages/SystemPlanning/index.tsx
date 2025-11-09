import { useState, useEffect } from 'react'
import { Card, Table, Select, Space, Spin, message, Row, Col, Statistic, Tag, InputNumber, Button, Divider, Input } from 'antd'
import { useTranslation } from 'react-i18next'
import { PlusOutlined, DeleteOutlined, SearchOutlined, RocketOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { analyzerApi, gameDataApi } from '../../services/api'
import { useTranslationData } from '../../hooks/useTranslationData'
import type { Material, SystemAnalysis, System } from '../../types'

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
    systemNames?: string[] // 可选：记录哪些星系有这个资源（用于相邻星系聚合）
  }>
  neighborSystems?: SystemAnalysis[] // 相邻星系列表
  centerRawSystem?: any // 中心星系的原始数据（包含行星信息）
  neighborRawSystems?: any[] // 相邻星系的原始数据（包含行星信息）
}

const SystemPlanning = () => {
  const { t } = useTranslation()
  const { getTranslatedName } = useTranslationData()
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [systemAnalysis, setSystemAnalysis] = useState<SystemAnalysis[]>([])
  
  // 高级搜索状态
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedSearchResults, setAdvancedSearchResults] = useState<AdvancedSearchResult[]>([])
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false)
  const [materialFilters, setMaterialFilters] = useState<MaterialFilter[]>([])
  const [exchangeX, setExchangeX] = useState<number>(3334.0)
  const [exchangeY, setExchangeY] = useState<number>(1425.0)
  
  // 星系搜索状态
  const [systemSearchText, setSystemSearchText] = useState<string>('')
  
  // 原始星系数据（用于星系群搜索，包含行星信息）
  const [rawSystems, setRawSystems] = useState<any[]>([])
  
  // 相邻距离固定为4光年
  const NEIGHBOR_DISTANCE = 4.0

  // 获取数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const [materialsRes, analysisRes, systemsRes] = await Promise.all([
        gameDataApi.getMaterials(),
        analyzerApi.analyzeSystems(exchangeX, exchangeY),
        gameDataApi.getSystems() // 获取原始星系数据（包含行星信息）
      ])

      setMaterials((materialsRes as any).materials || [])
      // 过滤掉行星数为0的星系
      const filteredAnalysis = ((analysisRes as any).systemAnalysis || []).filter(
        (system: SystemAnalysis) => system.planetCount > 0
      )
      setSystemAnalysis(filteredAnalysis)
      // 保存原始星系数据
      setRawSystems((systemsRes as any).systems || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error(t('systems.loadingError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [exchangeX, exchangeY])


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

  // 计算两个星系之间的距离（光年）
  const calculateSystemDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    const euclideanDistance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    return euclideanDistance / 50.0 // 转换为光年
  }

  // 聚合相邻星系的资源
  const aggregateNeighborResources = (centerSystem: SystemAnalysis, neighborSystems: SystemAnalysis[]): AdvancedSearchResult => {
    // 聚合所有相邻星系的资源
    const aggregatedResources: { [key: number]: {
      materialId: number
      totalAbundance: number
      planetCount: number
      maxAbundance: number
      systemNames: string[] // 记录哪些星系有这个资源
    } } = {}

    // 包含中心星系和所有相邻星系
    const allSystems = [centerSystem, ...neighborSystems]

    allSystems.forEach(system => {
      system.resources.forEach(resource => {
        const matId = resource.materialId
        if (!aggregatedResources[matId]) {
          aggregatedResources[matId] = {
            materialId: matId,
            totalAbundance: 0,
            planetCount: 0,
            maxAbundance: 0,
            systemNames: []
          }
        }
        aggregatedResources[matId].totalAbundance += resource.totalAbundance
        aggregatedResources[matId].planetCount += resource.planetCount
        // 使用每个星系的 maxAbundance（单个星球的最大丰度）来更新聚合后的 maxAbundance
        const systemMaxAbundance = resource.maxAbundance || 0
        if (systemMaxAbundance > aggregatedResources[matId].maxAbundance) {
          aggregatedResources[matId].maxAbundance = systemMaxAbundance
        }
        if (!aggregatedResources[matId].systemNames.includes(system.systemName)) {
          aggregatedResources[matId].systemNames.push(system.systemName)
        }
      })
    })

    // 转换为数组格式
    const resources = Object.values(aggregatedResources).map(r => ({
      materialId: r.materialId,
      totalAbundance: r.totalAbundance,
      planetCount: r.planetCount,
      maxAbundance: r.maxAbundance,
      systemNames: r.systemNames // 保留星系名称信息
    }))

    // 计算总行星数
    const totalPlanets = allSystems.reduce((sum, s) => sum + s.planetCount, 0)

    // 计算最大肥力
    const maxFertility = Math.max(...allSystems.map(s => {
      // 从原始数据中获取肥力信息（如果有的话）
      return 0 // 暂时设为0，因为SystemAnalysis类型中没有肥力信息
    }))

    return {
      systemId: centerSystem.systemId,
      systemName: `${centerSystem.systemName} 及相邻星系 (${neighborSystems.length}个)`,
      x: centerSystem.x || 0,
      y: centerSystem.y || 0,
      distanceToExchange: centerSystem.distanceToExchange || 0,
      planetCount: totalPlanets,
      maxFertility: maxFertility,
      resources: resources as any
    }
  }

  // 检查单个星系是否满足材料筛选条件（基于单个星球的丰度）
  const checkSystemMeetsMaterialFilters = (rawSystem: any, filters: MaterialFilter[]): boolean => {
    if (filters.length === 0) return true
    
    const planets = rawSystem.planets || []
    if (planets.length === 0) return false
    
    // 检查每个材料筛选条件
    return filters.every(filter => {
      // 检查是否有至少一个行星满足该材料的丰度要求
      for (const planet of planets) {
        const resources = planet.mats || []
        for (const resource of resources) {
          if (resource.id === filter.materialId && resource.ab >= filter.minAbundance) {
            return true // 找到满足条件的行星
          }
        }
      }
      return false // 没有找到满足条件的行星
    })
  }

  // 检查单个星球是否满足材料筛选条件
  const checkPlanetMeetsMaterialFilters = (planet: any, filters: MaterialFilter[]): boolean => {
    if (filters.length === 0) return false
    
    const resources = planet.mats || []
    
    // 检查每个材料筛选条件
    return filters.every(filter => {
      // 检查该星球是否有该材料且丰度满足要求
      for (const resource of resources) {
        if (resource.id === filter.materialId && resource.ab >= filter.minAbundance) {
          return true // 找到满足条件的材料
        }
      }
      return false // 没有找到满足条件的材料
    })
  }

  // 计算星球满足的材料筛选条件个数
  const countMetFilters = (planet: any, filters: MaterialFilter[]): number => {
    if (filters.length === 0) return 0
    
    const resources = planet.mats || []
    let count = 0
    
    // 统计满足条件的筛选条件个数
    for (const filter of filters) {
      for (const resource of resources) {
        if (resource.id === filter.materialId && resource.ab >= filter.minAbundance) {
          count++
          break // 找到满足条件的材料，跳出内层循环
        }
      }
    }
    
    return count
  }

  // 高级搜索（星系群搜索）- 使用后端API
  const handleAdvancedSearch = async () => {
    setAdvancedSearchLoading(true)
    try {
      // 以交易所为中心搜索符合条件的星系群
      if (materialFilters.length === 0) {
        message.warning(t('systems.advancedSearch.materialFilterRequired'))
        setAdvancedSearchLoading(false)
        return
      }

      // 调用后端API进行星系群搜索
      const response = await analyzerApi.systemGroupSearch({
        materialFilters: materialFilters,
        exchangeX: exchangeX,
        exchangeY: exchangeY
      })

      const results = (response as any).results || []
      
      // 将后端返回的结果转换为前端需要的格式，并添加原始数据
      const systemGroups: AdvancedSearchResult[] = []
      
      for (const result of results) {
        const centerSystemId = result.systemId
        const centerRawSystem = rawSystems.find(s => s.id === centerSystemId)
        
        if (!centerRawSystem) continue
        
        // 获取相邻星系的原始数据
        const neighborSystemIds = result.neighborSystemIds || []
        const neighborRawSystems: any[] = []
        const neighborSystems: SystemAnalysis[] = []
        
        for (const neighborId of neighborSystemIds) {
          const neighborRawSystem = rawSystems.find(s => s.id === neighborId)
          const neighborSystem = systemAnalysis.find(s => s.systemId === neighborId)
          
          if (neighborRawSystem) {
            neighborRawSystems.push(neighborRawSystem)
          }
          if (neighborSystem) {
            neighborSystems.push(neighborSystem)
          }
        }
        
        // 构建结果对象
        const systemGroup: AdvancedSearchResult = {
          systemId: result.systemId,
          systemName: result.systemName,
          x: result.x,
          y: result.y,
          distanceToExchange: result.distanceToExchange,
          planetCount: result.planetCount,
          maxFertility: result.maxFertility || 0,
          resources: result.resources || [],
          neighborSystems: neighborSystems,
          centerRawSystem: centerRawSystem,
          neighborRawSystems: neighborRawSystems
        }
        
        systemGroups.push(systemGroup)
      }

      setAdvancedSearchResults(systemGroups)
      message.success(t('systems.advancedSearch.success', { count: systemGroups.length }))
    } catch (error) {
      console.error('Failed to perform advanced search:', error)
      message.error(t('systems.searchError'))
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
      title: t('systems.columns.systemName'),
      dataIndex: 'systemName',
      key: 'systemName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: t('systems.columns.distance'),
      dataIndex: 'distanceToExchange',
      key: 'distanceToExchange',
      width: 200,
      render: (distance: number | undefined) => {
        if (distance === undefined || distance === null) return '-'
        return `${distance.toFixed(2)} ${t('systems.units.lightYears')}`
      },
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => {
        const aDist = a.distanceToExchange || 0
        const bDist = b.distanceToExchange || 0
        return aDist - bDist
      },
    },
    {
      title: t('systems.columns.planetCount'),
      dataIndex: 'planetCount',
      key: 'planetCount',
      width: 120,
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => a.planetCount - b.planetCount,
    },
    {
      title: t('systems.columns.resourceCount'),
      key: 'resourceCount',
      width: 120,
      render: (_: any, record: SystemAnalysis) => record.resources.length,
      sorter: (a: SystemAnalysis, b: SystemAnalysis) => a.resources.length - b.resources.length,
    },
    {
      title: t('systems.columns.totalAbundance'),
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
      title: t('systems.columns.systemName'),
      dataIndex: 'systemName',
      key: 'systemName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: t('systems.columns.distance'),
      dataIndex: 'distanceToExchange',
      key: 'distanceToExchange',
      width: 200,
      render: (distance: number) => `${distance.toFixed(2)} ${t('systems.units.lightYears')}`,
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.distanceToExchange - b.distanceToExchange,
    },
    {
      title: t('systems.columns.planetCount'),
      dataIndex: 'planetCount',
      key: 'planetCount',
      width: 120,
      sorter: (a: AdvancedSearchResult, b: AdvancedSearchResult) => 
        a.planetCount - b.planetCount,
    },
    {
      title: t('systems.columns.resourceCount'),
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
      <h1 style={{ marginBottom: 24 }}>{t('systems.title')}</h1>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('systems.stats.totalSystems')}
              value={stats.totalSystems}
              suffix={t('systems.unitCount')}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('systems.stats.totalPlanets')}
              value={stats.totalPlanets}
              suffix={t('systems.unitCount')}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('systems.stats.avgPlanetsPerSystem')}
              value={stats.avgPlanetsPerSystem}
              precision={1}
              suffix={t('systems.stats.planetsPerSystem')}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('systems.stats.totalResourceTypes')}
              value={stats.totalResourceTypes}
              suffix={t('systems.unitType')}
            />
          </Card>
        </Col>
      </Row>

      {/* 高级搜索 */}
      <Card 
        title={t('systems.advancedSearch.title')} 
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
              {showAdvancedSearch ? t('systems.advancedSearch.collapsePanel') : t('systems.advancedSearch.openExploration')}
            </Button>
          </Col>
        </Row>
        {showAdvancedSearch && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 星系群搜索说明 */}
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ color: '#666', fontSize: '14px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                  {t('systems.advancedSearch.description')}
                </div>
              </Col>
            </Row>

            <Divider orientation="left">{t('systems.filters.materialFilters')}</Divider>
            
            {materialFilters.map((filter, index) => (
              <Row key={index} gutter={16} align="middle">
                <Col span={10}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('systems.filters.selectMaterial')}
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
                    placeholder={t('systems.filters.minAbundance')}
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
                    {t('common.delete')}
                  </Button>
                </Col>
              </Row>
            ))}

            <Button
              icon={<PlusOutlined />}
              onClick={addMaterialFilter}
              style={{ width: '100%' }}
            >
              {t('systems.filters.addMaterial')}
            </Button>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAdvancedSearch}
              loading={advancedSearchLoading}
              style={{ width: '100%' }}
            >
              {t('systems.advancedSearch.startSearch')}
            </Button>

            {advancedSearchResults.length > 0 && (
              <div>
                <h3>{t('systems.advancedSearch.resultsTitle', { count: advancedSearchResults.length })}</h3>
                <Table
                  columns={advancedSearchColumns}
                  dataSource={advancedSearchResults}
                  rowKey="systemId"
                  pagination={{
                    pageSize: 15,
                    showTotal: (total) => t('systems.advancedSearch.paginationTotal', { total }),
                  }}
                  scroll={{ x: 1000 }}
                  expandable={{
                    expandedRowRender: (record: AdvancedSearchResult) => {
                      // 收集中心星系的星球
                      const centerPlanets: Array<{ planet: any, systemName: string, systemId: number, meetsFilters: boolean, metFilterCount: number }> = []
                      if (record.centerRawSystem) {
                        const planets = record.centerRawSystem.planets || []
                        planets.forEach((planet: any) => {
                          // 检查星球是否满足所有材料筛选条件
                          const meetsFilters = checkPlanetMeetsMaterialFilters(planet, materialFilters)
                          // 计算满足条件的个数
                          const metFilterCount = countMetFilters(planet, materialFilters)
                          centerPlanets.push({
                            planet,
                            systemName: record.systemName,
                            systemId: record.systemId,
                            meetsFilters,
                            metFilterCount
                          })
                        })
                      }
                      
                      // 按是否符合筛选条件排序：符合条件的在前，并按满足条件的个数进一步排序
                      centerPlanets.sort((a, b) => {
                        // 如果a符合条件而b不符合，a排在前面
                        if (a.meetsFilters && !b.meetsFilters) return -1
                        // 如果a不符合条件而b符合，b排在前面
                        if (!a.meetsFilters && b.meetsFilters) return 1
                        // 如果都符合条件，按满足条件的个数排序（个数多的在前）
                        if (a.meetsFilters && b.meetsFilters) {
                          return b.metFilterCount - a.metFilterCount
                        }
                        // 如果都不符合条件，按满足条件的个数排序（个数多的在前，这样部分符合条件的也能优先显示）
                        return b.metFilterCount - a.metFilterCount
                      })
                      
                      // 收集相邻星系的星球
                      const neighborPlanets: Array<{ planet: any, systemName: string, systemId: number, meetsFilters: boolean, metFilterCount: number }> = []
                      if (record.neighborRawSystems) {
                        record.neighborRawSystems.forEach((neighborRawSystem: any, index: number) => {
                          const neighborSystem = record.neighborSystems?.[index]
                          const planets = neighborRawSystem.planets || []
                          planets.forEach((planet: any) => {
                            // 检查星球是否满足所有材料筛选条件
                            const meetsFilters = checkPlanetMeetsMaterialFilters(planet, materialFilters)
                            // 计算满足条件的个数
                            const metFilterCount = countMetFilters(planet, materialFilters)
                            neighborPlanets.push({
                              planet,
                              systemName: neighborSystem?.systemName || neighborRawSystem.name || '未知',
                              systemId: neighborRawSystem.id,
                              meetsFilters,
                              metFilterCount
                            })
                          })
                        })
                      }
                      
                      // 按是否符合筛选条件排序：符合条件的在前，并按满足条件的个数进一步排序
                      neighborPlanets.sort((a, b) => {
                        // 如果a符合条件而b不符合，a排在前面
                        if (a.meetsFilters && !b.meetsFilters) return -1
                        // 如果a不符合条件而b符合，b排在前面
                        if (!a.meetsFilters && b.meetsFilters) return 1
                        // 如果都符合条件，按满足条件的个数排序（个数多的在前）
                        if (a.meetsFilters && b.meetsFilters) {
                          return b.metFilterCount - a.metFilterCount
                        }
                        // 如果都不符合条件，按满足条件的个数排序（个数多的在前，这样部分符合条件的也能优先显示）
                        return b.metFilterCount - a.metFilterCount
                      })
                      
                      // 渲染星球卡片的函数
                      const renderPlanetCard = (item: { planet: any, systemName: string, systemId: number, meetsFilters: boolean, metFilterCount: number }, index: number) => {
                        const { planet, systemName, meetsFilters, metFilterCount } = item
                        const planetName = planet.name || `Planet ${planet.id}`
                        const resources = planet.mats || []
                        
                        // 只要满足部分筛选条件（metFilterCount > 0），就显示绿色边框和背景
                        const hasPartialMatch = metFilterCount > 0
                        
                        return (
                          <Col key={`${item.systemId}-${planet.id}-${index}`} span={12}>
                            <Card 
                              size="small" 
                              style={{ 
                                marginBottom: '8px',
                                border: hasPartialMatch ? '2px solid #52c41a' : '1px solid #d9d9d9',
                                background: hasPartialMatch ? '#f6ffed' : '#fff'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <strong>{planetName}</strong>
                                  <Tag color="blue" style={{ fontSize: '11px' }}>{systemName}</Tag>
                                  {hasPartialMatch && (
                                    <Tag color="success" style={{ fontSize: '11px' }}>{t('systems.advancedSearch.meetsFilters')}</Tag>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                  {t('systems.advancedSearch.planetInfo', { fert: planet.fert || 0, size: planet.size || '-', tier: planet.tier || '-' })}
                                </div>
                                <div>
                                  {resources.length === 0 ? (
                                    <Tag color="default">{t('systems.advancedSearch.noResources')}</Tag>
                                  ) : (
                                    resources.map((resource: any) => {
                                      const materialName = getMaterialName(resource.id)
                                      const abundance = resource.ab || 0
                                      // 检查该资源是否满足筛选条件
                                      const filter = materialFilters.find(f => f.materialId === resource.id)
                                      const meetsFilter = filter && abundance >= filter.minAbundance
                                      
                                      return (
                                        <Tag 
                                          key={resource.id} 
                                          color={meetsFilter ? 'success' : 'cyan'} 
                                          style={{ 
                                            marginTop: '4px',
                                            fontWeight: meetsFilter ? 'bold' : 'normal',
                                            border: meetsFilter ? '1px solid #52c41a' : 'none'
                                          }}
                                        >
                                          {materialName}: {abundance}
                                          {meetsFilter && <span style={{ marginLeft: '4px' }}>✓</span>}
                                        </Tag>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Col>
                        )
                      }
                      
                      return (
                        <div style={{ padding: '8px 24px' }}>
                          {/* 中心星系的星球 */}
                          <Card 
                            title={
                              <span style={{ 
                                fontSize: '16px',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                              }}>
                                {t('systems.advancedSearch.centerSystem', { name: record.systemName, count: centerPlanets.length })}
                              </span>
                            }
                            style={{ 
                              marginBottom: '16px',
                              border: '2px solid #667eea',
                              borderRadius: '8px'
                            }}
                          >
                            {centerPlanets.length === 0 ? (
                              <p style={{ color: '#999', padding: '16px', textAlign: 'center' }}>{t('systems.advancedSearch.noPlanetData')}</p>
                            ) : (
                              <Row gutter={[8, 8]}>
                                {centerPlanets.map((item, index) => renderPlanetCard(item, index))}
                              </Row>
                            )}
                          </Card>
                          
                          {/* 相邻星系的星球 */}
                          {neighborPlanets.length > 0 && (
                            <Card 
                              title={
                                <span style={{ 
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }}>
                                  {t('systems.advancedSearch.neighborSystems', { systemCount: record.neighborSystems?.length || 0, planetCount: neighborPlanets.length })}
                                </span>
                              }
                              style={{ 
                                border: '2px solid #4facfe',
                                borderRadius: '8px'
                              }}
                            >
                              <Row gutter={[8, 8]}>
                                {neighborPlanets.map((item, index) => renderPlanetCard(item, index))}
                              </Row>
                            </Card>
                          )}
                        </div>
                      )
                    },
                  }}
                />
              </div>
            )}
          </Space>
        )}
      </Card>

      {/* 星系分析列表 */}
      <Card title={t('systems.systemAnalysis')} style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            placeholder={t('systems.filters.searchPlaceholder')}
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
                showTotal: (total) => t('systems.paginationTotal', { total }),
              }}
              expandable={{
                expandedRowRender: (record: SystemAnalysis) => (
                  <div style={{ padding: '8px 24px' }}>
                    <h4>{t('systems.details.resourceDetails')}</h4>
                    <Row gutter={[8, 8]}>
                      {record.resources.map(resource => (
                        <Col key={resource.materialId} span={8}>
                          <Tag color="blue">
                            {getMaterialName(resource.materialId)}: {resource.totalAbundance.toLocaleString()} (
                            {t('systems.details.planets', { count: resource.planetCount })})
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

