/**
 * 格式化工具函数
 */

/**
 * 将分（cents）转换为美元格式
 * @param cents - 价格（分）
 * @param showSymbol - 是否显示货币符号
 * @returns 格式化的价格字符串
 */
export const formatPrice = (cents: number, showSymbol: boolean = true): string => {
  if (cents === -1) return 'N/A'
  const dollars = cents / 100
  const formatted = dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return showSymbol ? `$${formatted}` : formatted
}

/**
 * 格式化大数字（带千分位）
 * @param num - 数字
 * @returns 格式化的字符串
 */
export const formatNumber = (num: number): string => {
  if (typeof num !== 'number') return 'N/A'
  return num.toLocaleString('en-US')
}

/**
 * 格式化百分比
 * @param value - 数值
 * @param decimals - 小数位数
 * @returns 格式化的百分比字符串
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A'
  return `${value.toFixed(decimals)}%`
}

/**
 * 格式化收益（带颜色指示）
 * @param profit - 收益值
 * @returns 包含颜色的格式化对象
 */
export const formatProfit = (profit: number) => {
  const isPositive = profit > 0
  const isNegative = profit < 0
  
  return {
    value: formatPrice(profit),
    color: isPositive ? '#3f8600' : isNegative ? '#cf1322' : '#8c8c8c',
    isPositive,
    isNegative,
  }
}

/**
 * 格式化时间（分钟转小时/分钟）
 * @param minutes - 分钟数
 * @returns 格式化的时间字符串
 */
export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
}

/**
 * 格式化丰度（显示相对标准的倍数）
 * @param abundance - 丰度值（100=标准）
 * @returns 格式化的丰度字符串
 */
export const formatAbundance = (abundance: number): string => {
  if (abundance === 100) return '标准 (1.0x)'
  const multiplier = (abundance / 100).toFixed(2)
  return `${abundance} (${multiplier}x)`
}

/**
 * 获取丰度颜色
 * @param abundance - 丰度值
 * @returns 颜色字符串
 */
export const getAbundanceColor = (abundance: number): string => {
  if (abundance >= 150) return '#52c41a' // 绿色 - 高丰度
  if (abundance >= 100) return '#1890ff' // 蓝色 - 标准
  if (abundance >= 75) return '#faad14'  // 橙色 - 中等
  return '#cf1322' // 红色 - 低丰度
}

/**
 * 缩短大数字（如10000 -> 10K）
 * @param num - 数字
 * @returns 缩短的字符串
 */
export const shortNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

