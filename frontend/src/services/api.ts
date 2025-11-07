import axios from 'axios'

// 从环境变量获取API基础URL，如果没有设置则使用默认值
// 开发环境：使用相对路径 /api（通过Vite代理）
// 生产环境：使用环境变量配置的URL（可以是相对路径或完整域名）
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  
  // 如果配置的是完整URL（包含http://或https://），直接使用
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl
  }
  
  // 否则使用相对路径（开发环境通过代理，生产环境同域名）
  return envUrl || '/api'
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// ==================== 游戏数据API ====================

export const gameDataApi = {
  getGameData: () => apiClient.get('/gamedata'),
  getMaterials: () => apiClient.get('/materials'),
  getMaterial: (id: number) => apiClient.get(`/materials/${id}`),
  getBuildings: () => apiClient.get('/buildings'),
  getBuilding: (id: number) => apiClient.get(`/buildings/${id}`),
  getRecipes: () => apiClient.get('/recipes'),
  getSystems: () => apiClient.get('/systems'),
}

// ==================== 交易所数据API ====================

export const exchangeApi = {
  getMaterialPrices: (matId?: number) => 
    apiClient.get('/exchange/prices', { params: { mat_id: matId } }),
  getMaterialDetails: (matId?: number) => 
    apiClient.get('/exchange/details', { params: { mat_id: matId } }),
}

// ==================== 计算器API ====================

export const calculatorApi = {
  calculateBuildingCost: (buildingId: number) => 
    apiClient.get(`/calculator/building-cost/${buildingId}`),
  calculateBuildingCosts: (buildingIds?: string) => 
    apiClient.get('/calculator/building-costs', { params: { building_ids: buildingIds } }),
  calculateRecipeProfit: (recipeId: number) => 
    apiClient.get(`/calculator/recipe-profit/${recipeId}`),
  calculateRecipeProfits: (sortBy = 'profitPerHour', buildingId?: number, limit?: number, fertilityAbundance?: number) => 
    apiClient.get('/calculator/recipe-profits', { 
      params: { sort_by: sortBy, building_id: buildingId, limit, fertility_abundance: fertilityAbundance } 
    }),
}

// ==================== 分析器API ====================

export const analyzerApi = {
  analyzeSystems: (exchangeX = 3334.0, exchangeY = 1425.0) => 
    apiClient.get('/analyzer/systems', { params: { exchange_x: exchangeX, exchange_y: exchangeY } }),
  findBestLocation: (materialId: number) => 
    apiClient.get(`/analyzer/best-location/${materialId}`),
  advancedSearch: (params: {
    maxDistance?: number
    materialFilters?: Array<{materialId: number, minAbundance: number}>
    minFertility?: number
    exchangeX?: number
    exchangeY?: number
  }) => {
    const queryParams: any = {}
    if (params.maxDistance !== undefined) queryParams.max_distance = params.maxDistance
    if (params.materialFilters && params.materialFilters.length > 0) {
      queryParams.material_filters = JSON.stringify(params.materialFilters)
    }
    if (params.minFertility !== undefined) queryParams.min_fertility = params.minFertility
    if (params.exchangeX !== undefined) queryParams.exchange_x = params.exchangeX
    if (params.exchangeY !== undefined) queryParams.exchange_y = params.exchangeY
    return apiClient.get('/analyzer/advanced-search', { params: queryParams })
  },
}

// ==================== 综合收益分析API ====================

export const comprehensiveApi = {
  analyzeRecipeProfits: (sortBy = 'comprehensiveProfitPerHour', buildingId?: number, totalPopulation = 0, fertilityAbundance = 100) =>
    apiClient.get('/comprehensive/recipe-analysis', {
      params: { sort_by: sortBy, building_id: buildingId, total_population: totalPopulation, fertility_abundance: fertilityAbundance }
    }),
}

// ==================== 系统API ====================

export const systemApi = {
  getHealth: () => apiClient.get('/health'),
  getRateLimitStatus: () => apiClient.get('/rate-limit/status'),
  getCacheStats: () => apiClient.get('/cache/stats'),
  clearCache: () => apiClient.post('/cache/clear'),
}

export default apiClient

