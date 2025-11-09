/**
 * 翻译服务
 * 用于获取材料和建筑的中英文翻译，并缓存到本地存储
 */

import axios from 'axios'

const CACHE_KEY = 'word_translation_cache'
const CACHE_VERSION_KEY = 'word_translation_version'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7天过期
// 从环境变量获取API基础URL，如果没有设置则使用默认值
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  
  // 如果配置的是完整URL（包含http://或https://）
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    // 确保完整URL以 /api 结尾
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
  }
  
  // 否则使用相对路径（开发环境通过代理，生产环境同域名）
  return envUrl || '/api'
}

const TRANSLATION_FILE_PATH = `${getApiBaseUrl()}/word-translation` // 后端需要提供这个端点

interface TranslationCache {
  data: Record<string, string>
  timestamp: number
  version: string
}

/**
 * 从后端获取翻译文件
 */
async function fetchTranslationFromBackend(): Promise<Record<string, string>> {
  try {
    // 尝试从后端获取翻译文件
    const response = await axios.get(TRANSLATION_FILE_PATH, {
      timeout: 10000,
    })
    // 确保返回的是对象
    if (typeof response.data === 'object' && response.data !== null) {
      return response.data
    }
    return {}
  } catch (error: any) {
    console.warn('Failed to fetch translation from backend, using empty object', error?.message || error)
    // 即使失败也返回空对象，避免阻塞页面
    return {}
  }
}

/**
 * 从本地缓存获取翻译
 */
function getTranslationFromCache(): TranslationCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const version = localStorage.getItem(CACHE_VERSION_KEY)
    
    if (!cached || !version) {
      return null
    }
    
    const cache: TranslationCache = JSON.parse(cached)
    
    // 检查版本和过期时间
    const now = Date.now()
    if (cache.version !== version || now - cache.timestamp > CACHE_EXPIRY) {
      return null
    }
    
    return cache
  } catch (error) {
    console.warn('Failed to read translation from cache', error)
    return null
  }
}

/**
 * 保存翻译到本地缓存
 */
function saveTranslationToCache(data: Record<string, string>, version: string): void {
  try {
    const cache: TranslationCache = {
      data,
      timestamp: Date.now(),
      version,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    localStorage.setItem(CACHE_VERSION_KEY, version)
  } catch (error) {
    console.warn('Failed to save translation to cache', error)
  }
}

/**
 * 获取翻译数据（优先从缓存读取，如果不存在或过期则从后端获取）
 */
let translationPromise: Promise<Record<string, string>> | null = null

export async function getTranslationData(): Promise<Record<string, string>> {
  // 如果已经有正在进行的请求，直接返回该 Promise
  if (translationPromise) {
    return translationPromise
  }
  
  // 先尝试从缓存读取
  const cache = getTranslationFromCache()
  if (cache) {
    return Promise.resolve(cache.data)
  }
  
  // 从后端获取
  translationPromise = fetchTranslationFromBackend().then((data) => {
    // 保存到缓存（即使数据为空也保存，避免重复请求）
    const version = Date.now().toString()
    saveTranslationToCache(data, version)
    translationPromise = null
    return data
  }).catch((error) => {
    translationPromise = null
    // 即使失败也返回空对象，避免阻塞页面
    console.warn('Translation fetch failed, returning empty object', error)
    return {}
  })
  
  return translationPromise
}

/**
 * 根据当前语言获取翻译后的名称
 * @param enName 英文名称
 * @param lang 当前语言 ('zh-CN' 或 'en-US')
 * @param translations 翻译数据（可选，如果不提供则从缓存读取）
 */
export async function getTranslatedName(
  enName: string,
  lang: string,
  translations?: Record<string, string>
): Promise<string> {
  // 如果是英文，直接返回原名称
  if (lang === 'en-US' || !enName) {
    return enName
  }
  
  // 获取翻译数据
  const translationData = translations || await getTranslationData()
  
  // 查找翻译
  return translationData[enName] || enName
}

/**
 * 同步版本：根据当前语言获取翻译后的名称（使用缓存的翻译数据）
 * @param enName 英文名称
 * @param lang 当前语言 ('zh-CN' 或 'en-US')
 * @param translations 翻译数据（必须提供）
 */
export function getTranslatedNameSync(
  enName: string,
  lang: string,
  translations: Record<string, string>
): string {
  // 如果是英文，直接返回原名称
  if (lang === 'en-US' || !enName) {
    return enName
  }
  
  // 查找翻译
  return translations[enName] || enName
}

/**
 * 清除翻译缓存
 */
export function clearTranslationCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_VERSION_KEY)
  } catch (error) {
    console.warn('Failed to clear translation cache', error)
  }
}

