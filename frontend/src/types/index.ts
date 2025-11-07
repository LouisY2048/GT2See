// 材料类型
export interface Material {
  id: number
  sName?: string  // 短名称
  name: string
  description?: string
  type?: number  // 材料类型枚举
  weight?: number  // 重量（吨）
  source?: number  // 1=提取, 2=制造/农业
  reqTech?: number  // 需要的技术等级
  tier?: number
  cp?: number  // 计算的基础价格（分）
}

// 建筑类型
export interface Building {
  id: number
  name: string
  description?: string
  constructionMaterials: Array<{
    id: number
    amount: number
  }>
  recipesIds?: number[]
}

// 配方类型（根据API文档）
export interface Recipe {
  id: number
  producedIn: number  // 建筑类型ID
  type: number  // 配方类型枚举（1=提取, 2=生产, 3=农业）
  reqTech: number  // 需要的技术等级
  timeMinutes: number
  inputs: Array<{
    id: number
    am: number
  }>
  output: {
    id: number
    am: number
  }
}

// 星系类型（根据API文档）
export interface System {
  id: number
  name: string
  x: number
  y: number
  v: number  // 视觉变化标识
  planets: Array<{
    id: number
    sId: number  // 父星系ID
    name: string
    type: number  // 星球分类枚举
    mats: Array<{  // 可用材料
      id: number
      ab: number  // 丰度（50=半速，100=标准，200=双倍）
    }>
    fert: number  // 肥力（100=标准，0=无法农业）
    x: number
    y: number
    size: number
    tier: number
  }> | null
}

// 价格数据类型（根据API文档）
export interface MaterialPrice {
  matId: number
  matName: string
  currentPrice: number  // 分（cents），-1表示无订单
  avgPrice: number  // 平均价格（分），-1表示无历史
}

// 价格详情类型（根据API文档）
export interface MaterialDetails extends MaterialPrice {
  totalQtyAvailable: number  // 总可用数量（不含联邦储备）
  orders: Array<{
    cId: number  // 公司ID（1=联邦储备）
    cName: string  // 公司名称
    unitPrice: number  // 单价（分）
    qty: number  // 可用数量
  }>
  avgQtySoldDaily: number  // 日均销量
  priceHistory: Array<{
    date: string  // YYYY-MM-DD
    avgPrice: number  // 当日平均价格（分）
    qtySold: number  // 当日销量
    qtyRemaining: number  // 当日剩余量
  }>
}

// 建筑成本类型
export interface BuildingCost {
  buildingId: number
  buildingName: string
  buildingNameZh?: string
  totalCost: number
  priceAvailable: boolean  // 价格是否可用
  unavailableMaterials?: Array<{  // 无法获取价格的材料列表
    materialId: number
    materialName: string
    materialNameZh: string
  }>
  materialCosts: Array<{
    materialId: number
    materialName?: string
    materialNameZh?: string
    amount: number
    unitPrice: number
    priceAvailable?: boolean  // 该材料价格是否可用
    totalCost: number
    costPercentage: number
  }>
}

// 配方收益类型
export interface RecipeProfit {
  recipeId: number
  recipeName: string
  buildingId: number
  buildingName?: string
  buildingNameZh?: string
  inputCost: number | null  // null 表示价格不可用
  outputValue: number | null  // null 表示价格不可用
  totalProfit: number | null  // null 表示价格不可用
  profitPerHour: number | null  // 每小时收益，null 表示价格不可用
  roi: number | null  // null 表示无法计算（输入成本为0或价格不可用）
  timeMinutes: number
  timeHours: number  // 以小时为单位的时间
  priceAvailable: boolean  // 价格是否可用
  unavailableMaterials?: Array<{  // 无法获取价格的材料列表
    materialId: number
    materialName: string
    materialNameZh: string
  }>
  inputDetails: Array<{
    materialId: number
    materialName?: string
    materialNameZh?: string
    amount: number
    unitPrice: number
    priceAvailable?: boolean
    totalCost: number
  }>
  outputDetails: {
    materialId: number
    materialName?: string
    materialNameZh?: string
    amount: number
    unitPrice: number
    priceAvailable?: boolean
    totalValue: number | null  // null 表示价格不可用
  }
}

// 星系分析类型
export interface SystemAnalysis {
  systemId: number
  systemName: string
  x?: number
  y?: number
  distanceToExchange?: number
  planetCount: number
  resources: Array<{
    materialId: number
    totalAbundance: number
    planetCount: number
  }>
}

// 最佳位置类型
export interface BestLocation {
  systemId: number
  systemName: string
  totalAbundance: number
  planetCount: number
  avgAbundance: number
}

// API响应类型
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

