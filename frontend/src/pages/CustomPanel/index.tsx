import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Space,
  Select,
  InputNumber,
  Button,
  Table,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Tooltip,
} from 'antd'
import { useTranslation } from 'react-i18next'
import { SyncOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { calculatorApi, comprehensiveApi, exchangeApi, gameDataApi } from '../../services/api'
import { useTranslationData } from '../../hooks/useTranslationData'
import type { Building, Material, Recipe, RecipeProfit } from '../../types'
import { formatPrice, formatNumber } from '../../utils/format'

const { Option } = Select
const { Text } = Typography

interface InputRow {
  materialId: number
  materialName: string
  amount: number
  baseUnitPrice: number
}

const DEFAULT_VALUE = 0

const CustomPanel = () => {
  const { t } = useTranslation()
  const { getTranslatedName } = useTranslationData()

  const [loadingInitial, setLoadingInitial] = useState<boolean>(false)
  const [fetchingPrices, setFetchingPrices] = useState<boolean>(false)

  const [buildings, setBuildings] = useState<Building[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | undefined>(undefined)

  const [customAbundance, setCustomAbundance] = useState<number>(DEFAULT_VALUE)
  const [buildingTotalLevel, setBuildingTotalLevel] = useState<number>(0)
  // 针对每个配方的自定义价格：inputs[matId] 和 output
  const [customPricesByRecipe, setCustomPricesByRecipe] = useState<Record<number, { inputs: Record<number, number>, output?: number }>>({})

  // 列表数据（按建筑）
  const [listRecipeProfits, setListRecipeProfits] = useState<RecipeProfit[]>([])
  const [listComprehensive, setListComprehensive] = useState<any[]>([])
  // 每条配方可编辑的每小时价格覆盖
  const [overridesByRecipe, setOverridesByRecipe] = useState<Record<number, { inputPerHour?: number; outputPerHour?: number }>>({})

  const loadInitialData = async () => {
    setLoadingInitial(true)
    try {
      const [buildingsRes, materialsRes, recipesRes] = await Promise.all([
        gameDataApi.getBuildings(),
        gameDataApi.getMaterials(),
        gameDataApi.getRecipes(),
      ])

      setBuildings(((buildingsRes as any)?.buildings) || [])
      setMaterials(((materialsRes as any)?.materials) || [])
      setRecipes(((recipesRes as any)?.recipes) || [])
    } catch (error) {
      console.error('Failed to load custom panel data', error)
      message.error(t('customPanel.messages.loadError'))
    } finally {
      setLoadingInitial(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 根据建筑和丰度/肥力获取配方列表（收益+综合）
  useEffect(() => {
    const fetchList = async () => {
      if (!selectedBuildingId) {
        setListRecipeProfits([])
        setListComprehensive([])
        return
      }
      setLoadingInitial(true)
      try {
        const [profitsRes, compRes] = await Promise.all([
          calculatorApi.calculateRecipeProfits('profitPerHour', selectedBuildingId, undefined, 100 + customAbundance),
          comprehensiveApi.analyzeRecipeProfits('comprehensiveProfitPerHour', selectedBuildingId, 0, 100 + customAbundance),
        ])
        setListRecipeProfits(((profitsRes as any)?.recipeProfits) || [])
        setListComprehensive(((compRes as any)?.comprehensiveAnalysis) || [])
      } catch (error) {
        console.error('Failed to fetch list data', error)
        message.error(t('customPanel.messages.loadError'))
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchList()
  }, [selectedBuildingId, customAbundance, t])

  // 已去除“选择配方”后的明细获取逻辑

  const buildingNameMap = useMemo(() => {
    const map = new Map<number, string>()
    buildings.forEach((building) => {
      const enName = building?.name || `Building ${building?.id}`
      map.set(building.id, getTranslatedName(enName))
    })
    return map
  }, [buildings, getTranslatedName])

  const materialNameMap = useMemo(() => {
    const map = new Map<number, string>()
    materials.forEach((material) => {
      if (!material) return
      const enName = material.name || material.sName || `Material ${material.id}`
      map.set(material.id, getTranslatedName(enName))
    })
    return map
  }, [materials, getTranslatedName])

  // 获取某配方的自定义输入价格
  const getCustomInputPriceForRecipe = (recipeId: number, materialId: number): number | undefined => {
    return customPricesByRecipe[recipeId]?.inputs?.[materialId]
  }

  const handleCustomInputPriceChange = (recipeId: number, materialId: number, value?: number | null) => {
    setCustomPricesByRecipe((prev) => ({
      ...prev,
      [recipeId]: {
        inputs: {
          ...(prev[recipeId]?.inputs || {}),
          [materialId]: value && value > 0 ? value : DEFAULT_VALUE,
        },
        output: prev[recipeId]?.output,
      },
    }))
  }

  const handleFetchPricesForRecipe = async (recipe: RecipeProfit) => {
    if (!recipe) return
    const inputMaterialIds = (recipe.inputDetails || []).map((item) => item.materialId)
    const outputMaterialId = recipe.outputDetails?.materialId
    const uniqueIds = Array.from(new Set(outputMaterialId ? [...inputMaterialIds, outputMaterialId] : inputMaterialIds))

    if (uniqueIds.length === 0) return

    setFetchingPrices(true)
    try {
      const responses = await Promise.all(
        uniqueIds.map(async (id) => {
          const details = await exchangeApi.getMaterialDetails(id)
          return { id, details }
        })
      )

      const updatedInputPrices: Record<number, number> = {}
      let updatedOutputPrice = 0

      responses.forEach(({ id, details }) => {
        const avgPrice = (details as any)?.avgPrice
        const currentPrice = (details as any)?.currentPrice
        const priceCents =
          typeof avgPrice === 'number' && avgPrice > 0
            ? avgPrice
            : typeof currentPrice === 'number' && currentPrice > 0
            ? currentPrice
            : 0

        if (priceCents > 0) {
          const price = Number((priceCents / 100).toFixed(2))
          if (id === outputMaterialId) {
            updatedOutputPrice = price
          } else {
            updatedInputPrices[id] = price
          }
        }
      })

      setCustomPricesByRecipe((prev) => ({
        ...prev,
        [recipe.recipeId]: {
          inputs: {
            ...(prev[recipe.recipeId]?.inputs || {}),
            ...updatedInputPrices,
          },
          output: updatedOutputPrice > 0 ? updatedOutputPrice : prev[recipe.recipeId]?.output,
        },
      }))

      // 计算每小时输入/输出覆盖值（基于最新自定义价格）
      const timeHours = recipe.timeHours || (recipe.timeMinutes ? recipe.timeMinutes / 60 : 0)
      if (timeHours > 0) {
        const inputPerHour = (recipe.inputDetails || []).reduce((sum, d) => {
          const base = d.unitPrice ? d.unitPrice / 100 : 0
          const price = updatedInputPrices[d.materialId] ?? base
          return sum + d.amount * price
        }, 0) / timeHours
        const outAmount = recipe.outputDetails?.amount || 0
        const outUnit = (updatedOutputPrice > 0 ? updatedOutputPrice : (recipe.outputDetails?.unitPrice ? recipe.outputDetails.unitPrice / 100 : 0))
        const outputPerHour = (outAmount * outUnit) / timeHours
        setOverridesByRecipe((prev) => ({
          ...prev,
          [recipe.recipeId]: { inputPerHour, outputPerHour }
        }))
      }

      message.success(t('customPanel.messages.priceFetchSuccess'))
    } catch (error) {
      console.error('Failed to fetch material prices', error)
      message.error(t('customPanel.messages.priceFetchError'))
    } finally {
      setFetchingPrices(false)
    }
  }

  const handleResetCustomPrices = () => {
    setCustomPricesByRecipe({})
    setOverridesByRecipe({})
  }

  const columns = [
    {
      title: t('recipes.columns.recipeName'),
      dataIndex: 'recipeName',
      key: 'recipeName',
      width: 220,
    },
    {
      title: '售卖价格',
      key: 'sellPrice',
      width: 140,
      render: (_: unknown, row: any) => (
        <InputNumber
          min={0}
          value={overridesByRecipe[row.recipeId]?.outputPerHour ?? row.outputValuePerHour ?? 0}
          onChange={(val) => setOverridesByRecipe((prev) => ({ ...prev, [row.recipeId]: { ...(prev[row.recipeId] || {}), outputPerHour: val ?? 0 } }))}
          addonBefore="$"
          precision={2}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '原料价格',
      key: 'inputCost',
      width: 140,
      render: (_: unknown, row: any) => (
        <InputNumber
          min={0}
          value={overridesByRecipe[row.recipeId]?.inputPerHour ?? row.inputCostPerHour ?? 0}
          onChange={(val) => setOverridesByRecipe((prev) => ({ ...prev, [row.recipeId]: { ...(prev[row.recipeId] || {}), inputPerHour: val ?? 0 } }))}
          addonBefore="$"
          precision={2}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '劳动力消耗成本',
      key: 'laborCost',
      width: 160,
      render: (_: unknown, row: any) => (typeof row.laborCostPerHour === 'number' ? formatPrice(Math.round(row.laborCostPerHour)) : '—'),
    },
    {
      title: '产品价格',
      key: 'productPrice',
      width: 140,
      render: (_: unknown, row: any) => (
        <InputNumber
          min={0}
          value={overridesByRecipe[row.recipeId]?.outputPerHour ?? row.outputValuePerHour ?? 0}
          onChange={(val) => setOverridesByRecipe((prev) => ({ ...prev, [row.recipeId]: { ...(prev[row.recipeId] || {}), outputPerHour: val ?? 0 } }))}
          addonBefore="$"
          precision={2}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '每小时利润',
      key: 'profitPerHour',
      width: 180,
      render: (_: unknown, row: any) => {
        const input = overridesByRecipe[row.recipeId]?.inputPerHour ?? row.inputCostPerHour
        const output = overridesByRecipe[row.recipeId]?.outputPerHour ?? row.outputValuePerHour
        if (typeof input !== 'number' || typeof output !== 'number') return '—'
        const profit = output - input
        const roi = input > 0 ? (profit / input) * 100 : 0
        return `(${roi.toFixed(1)}%) ${formatPrice(Math.round(profit))}`
      },
    },
    {
      title: '每日利润',
      key: 'profitPerDay',
      width: 160,
      render: (_: unknown, row: any) => {
        const input = overridesByRecipe[row.recipeId]?.inputPerHour ?? row.inputCostPerHour
        const output = overridesByRecipe[row.recipeId]?.outputPerHour ?? row.outputValuePerHour
        if (typeof input !== 'number' || typeof output !== 'number') return '—'
        const profit = output - input
        return formatPrice(Math.round(profit * 24))
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, row: any) => (
        <Space>
          <Button size="small" onClick={() => handleFetchPricesForRecipe(row.__raw)} loading={fetchingPrices} type="link">
            {t('customPanel.actions.fetchPrices')}
          </Button>
        </Space>
      ),
    },
  ]

  // 合并列表数据并计算列值（以小时为单位）
  const tableData = useMemo(() => {
    const compMap = new Map<number, any>()
    listComprehensive.forEach((c) => compMap.set(c.recipeId, c))
    return listRecipeProfits.map((p) => {
      const comp = compMap.get(p.recipeId)
      const timeHours = p.timeHours || (p.timeMinutes ? p.timeMinutes / 60 : 0)
      const inputCostPerHourBase = p.inputCost !== null && timeHours > 0 ? (p.inputCost / timeHours) : null
      const outputValuePerHourBase = p.outputValue !== null && timeHours > 0 ? (p.outputValue / timeHours) : null
      const profitPerHourBase = p.profitPerHour ?? (outputValuePerHourBase !== null && inputCostPerHourBase !== null ? (outputValuePerHourBase - inputCostPerHourBase) : null)
      // 建筑总等级系数
      const multiplier = buildingTotalLevel > 0 ? buildingTotalLevel : 1
      const inputCostPerHour = inputCostPerHourBase !== null ? inputCostPerHourBase * multiplier : null
      const outputValuePerHour = outputValuePerHourBase !== null ? outputValuePerHourBase * multiplier : null
      const profitPerHour = profitPerHourBase !== null ? profitPerHourBase * multiplier : null
      const laborCostPerHour = comp?.laborCostPerHour ?? null

      const recipeName = p.recipeName ? getTranslatedName(p.recipeName) : `Recipe ${p.recipeId}`
      return {
        key: p.recipeId,
        recipeId: p.recipeId,
        recipeName,
        inputCostPerHour: inputCostPerHour ?? undefined,
        outputValuePerHour: outputValuePerHour ?? undefined,
        profitPerHour: profitPerHour ?? undefined,
        laborCostPerHour: laborCostPerHour ?? undefined,
        __raw: p,
      }
    })
  }, [listRecipeProfits, listComprehensive, getTranslatedName, buildingTotalLevel])


  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8} lg={6}>
        <Card title={t('customPanel.title')}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space direction="vertical" size={4}>
              <Text>{t('customPanel.controls.building')}</Text>
              <Select
                value={selectedBuildingId}
                onChange={(value) => setSelectedBuildingId(value)}
                allowClear
                placeholder={t('customPanel.controls.buildingPlaceholder')}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="children"
              >
                {buildings
                  .slice()
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map((building) => (
                    <Option key={building.id} value={building.id}>
                      {buildingNameMap.get(building.id) || building.name}
                    </Option>
                  ))}
              </Select>
            </Space>

            {/* 受丰度/肥力影响时显示 */}
            {selectedBuildingId && ['Farm', 'Mine', 'Pump', 'Gas Collector'].some((name) => (buildingNameMap.get(selectedBuildingId!) || '').includes(name) || (buildings.find(b => b.id === selectedBuildingId)?.name || '').includes(name)) && (
              <Space direction="vertical" size={4}>
                <Space>
                  <Text>{t('recipes.filters.fertilityAbundance')}</Text>
                  <Tooltip title={t('recipes.filters.fertilityAbundanceTooltip', { type: '' })}>
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
                <InputNumber
                  min={0}
                  value={customAbundance}
                  onChange={(value) => setCustomAbundance(value ?? DEFAULT_VALUE)}
                  precision={0}
                  addonAfter="%"
                />
              </Space>
            )}

            <Space direction="vertical" size={4}>
              <Text>建筑总等级</Text>
              <InputNumber
                min={0}
                value={buildingTotalLevel}
                onChange={(value) => setBuildingTotalLevel(value ?? 0)}
                precision={0}
                style={{ width: '100%' }}
              />
            </Space>

            <Space>
              <Button
                icon={<SyncOutlined />}
                type="primary"
                loading={fetchingPrices}
                disabled={!selectedBuildingId || listRecipeProfits.length === 0}
                onClick={async () => {
                  setFetchingPrices(true)
                  try {
                    await Promise.all(listRecipeProfits.map(r => handleFetchPricesForRecipe(r)))
                    message.success(t('customPanel.messages.priceFetchSuccess'))
                  } catch (e) {
                    message.error(t('customPanel.messages.priceFetchError'))
                  } finally {
                    setFetchingPrices(false)
                  }
                }}
              >
                {t('customPanel.actions.fetchPrices')}
              </Button>
              <Button onClick={handleResetCustomPrices}>{t('customPanel.actions.reset')}</Button>
            </Space>

          </Space>
        </Card>
      </Col>

      <Col xs={24} md={16} lg={18}>
        <Card title="可生产配方">
          <Spin spinning={loadingInitial}>
            <Table
              dataSource={tableData}
              columns={columns}
              rowKey="key"
              pagination={{ pageSize: 20 }}
              scroll={{ x: 900 }}
              expandable={{
                expandedRowRender: (row: any) => {
                  const raw: RecipeProfit = row.__raw
                  const rows: InputRow[] = (raw.inputDetails || []).map((detail) => {
                    const baseUnitPrice = detail.unitPrice ? detail.unitPrice / 100 : 0
                    const materialName = materialNameMap.get(detail.materialId) || detail.materialName || `Material ${detail.materialId}`
                    return {
                      materialId: detail.materialId,
                      materialName,
                      amount: detail.amount,
                      baseUnitPrice,
                    }
                  })
                  const timeHours = raw.timeHours || (raw.timeMinutes ? raw.timeMinutes / 60 : 0)
                  const laborCostPerHour = listComprehensive.find(c => c.recipeId === raw.recipeId)?.laborCostPerHour || 0
                  const laborCostPerCycle = laborCostPerHour * timeHours

                  return (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space align="center">
                        <Button size="small" onClick={() => handleFetchPricesForRecipe(raw)} loading={fetchingPrices} type="primary">
                          {t('customPanel.actions.fetchPrices')}
                        </Button>
                        <Text type="secondary">劳动力成本/周期：{laborCostPerCycle > 0 ? formatPrice(Math.round(laborCostPerCycle)) : '—'}</Text>
                      </Space>
                      <Table
                        dataSource={rows}
                        columns={[
                          { title: t('customPanel.table.material'), dataIndex: 'materialName', key: 'materialName', width: 260 },
                          { title: t('customPanel.table.amount'), dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => formatNumber(v) },
                          { title: t('customPanel.table.basePrice'), dataIndex: 'baseUnitPrice', key: 'baseUnitPrice', width: 160, render: (v: number) => (v > 0 ? formatPrice(Math.round(v * 100)) : '—') },
                          { title: t('customPanel.table.customPrice'), key: 'customPrice', render: (_: unknown, r: InputRow) => (
                            <InputNumber
                              min={0}
                              value={getCustomInputPriceForRecipe(raw.recipeId, r.materialId) ?? DEFAULT_VALUE}
                              onChange={(val) => handleCustomInputPriceChange(raw.recipeId, r.materialId, val ?? DEFAULT_VALUE)}
                              style={{ width: 140 }}
                              addonBefore="$"
                              precision={2}
                            />
                          ) },
                        ]}
                        rowKey="materialId"
                        pagination={false}
                        size="small"
                      />
                    </Space>
                  )
                }
              }}
            />
          </Spin>
        </Card>
      </Col>
    </Row>
  )
}

export default CustomPanel


