/**
 * 翻译数据 Hook
 * 用于在组件中获取翻译数据
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getTranslationData, getTranslatedNameSync } from '../services/translation'

export function useTranslationData() {
  const { i18n } = useTranslation()
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadTranslations() {
      try {
        setLoading(true)
        const data = await getTranslationData()
        if (mounted) {
          setTranslations(data)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          // 即使失败也设置空对象，避免阻塞页面
          setTranslations({})
          setError(null)
          console.warn('Failed to load translations, using empty object', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadTranslations()

    return () => {
      mounted = false
    }
  }, [])

  /**
   * 获取翻译后的名称
   */
  const getTranslatedName = (enName: string): string => {
    if (!enName) return enName
    try {
      return getTranslatedNameSync(enName, i18n.language, translations)
    } catch (error) {
      console.warn('Translation error:', error)
      return enName
    }
  }

  return {
    translations,
    loading,
    error,
    getTranslatedName,
    currentLanguage: i18n.language,
  }
}

