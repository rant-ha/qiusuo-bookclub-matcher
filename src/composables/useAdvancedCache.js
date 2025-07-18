import { ref, computed } from 'vue'

export function useAdvancedCache() {
  // 缓存存储
  const aiAnalysisCache = ref(new Map())
  const matchResultsCache = ref(new Map())
  const batchResultsCache = ref(new Map())

  // 缓存配置
  const config = {
    AI_ANALYSIS_TTL: 7 * 24 * 60 * 60 * 1000,    // AI分析缓存7天
    MATCH_RESULTS_TTL: 24 * 60 * 60 * 1000,      // 匹配结果缓存24小时
    BATCH_RESULTS_TTL: 60 * 60 * 1000,           // 批次结果缓存1小时
    MAX_AI_CACHE_SIZE: 2000,                     // AI分析缓存最大条目
    MAX_MATCH_CACHE_SIZE: 1000,                  // 匹配结果缓存最大条目
    MAX_BATCH_CACHE_SIZE: 100,                   // 批次缓存最大条目
  }

  // 缓存统计
  const stats = ref({
    aiCacheHits: 0,
    aiCacheMisses: 0,
    matchCacheHits: 0,
    matchCacheMisses: 0,
    batchCacheHits: 0,
    batchCacheMisses: 0
  })

  // 计算属性：缓存命中率
  const hitRates = computed(() => {
    const aiTotal = stats.value.aiCacheHits + stats.value.aiCacheMisses
    const matchTotal = stats.value.matchCacheHits + stats.value.matchCacheMisses
    const batchTotal = stats.value.batchCacheHits + stats.value.batchCacheMisses

    return {
      aiAnalysis: aiTotal > 0 ? (stats.value.aiCacheHits / aiTotal * 100).toFixed(2) + '%' : '0%',
      matchResults: matchTotal > 0 ? (stats.value.matchCacheHits / matchTotal * 100).toFixed(2) + '%' : '0%',
      batchResults: batchTotal > 0 ? (stats.value.batchCacheHits / batchTotal * 100).toFixed(2) + '%' : '0%'
    }
  })

  // 生成AI分析缓存键
  function generateAIAnalysisKey(profile1, profile2) {
    const createKeyComponent = (profile) => {
      // 1. 对数组进行排序，确保顺序一致性
      const sortedHobbies = [...(profile.interests.hobbies || [])].sort()
      const sortedBookCategories = [...(profile.reading_preferences.book_categories || [])].sort()
      const sortedFavoriteBooks = [...(profile.reading_preferences.favorite_books || [])].sort()

      // 2. 构建只包含核心信息的对象
      const coreProfile = {
        // 兴趣爱好
        hobbies: sortedHobbies,
        // 阅读偏好
        reading: {
          categories: sortedBookCategories,
          favorites: sortedFavoriteBooks,
          commitment: profile.reading_preferences.reading_commitment || '',
        },
        // 匹配偏好
        matching: profile.matching_preferences || {}
      }
      return JSON.stringify(coreProfile)
    }

    const content1 = createKeyComponent(profile1)
    const content2 = createKeyComponent(profile2)
    
    // 确保键的一致性
    const sortedContents = [content1, content2].sort()
    const finalKey = `ai_v2_${simpleHash(sortedContents.join('|'))}` // v2表示新版key

    return finalKey
  }

  // 生成匹配结果缓存键
  function generateMatchKey(userIds, matchType) {
    const sortedIds = userIds.sort()
    return `match_${matchType}_${sortedIds.join('-')}`
  }

  // 生成批次结果缓存键
  function generateBatchKey(userIdsList, matchType) {
    const signature = userIdsList
      .map(ids => ids.sort().join('-'))
      .sort()
      .join('|')
    return `batch_${matchType}_${simpleHash(signature)}`
  }

  // 简单哈希函数
  function simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  // 检查缓存是否有效
  function isValidCache(cacheEntry, ttl) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < ttl
  }

  // 清理缓存
  function cleanupCache(cache, targetSize) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp) // 按时间排序
    
    const deleteCount = cache.size - targetSize
    for (let i = 0; i < deleteCount; i++) {
      cache.delete(entries[i][0])
    }
    
    console.log(`缓存清理: 删除了 ${deleteCount} 个旧条目`)
  }

  // 设置AI分析结果缓存
  async function setAIAnalysis(profile1, profile2, result) {
    const cacheKey = generateAIAnalysisKey(profile1, profile2)
    
    // 检查缓存大小
    if (aiAnalysisCache.value.size >= config.MAX_AI_CACHE_SIZE) {
      cleanupCache(aiAnalysisCache.value, config.MAX_AI_CACHE_SIZE * 0.7)
    }
    
    aiAnalysisCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
  }

  // 获取AI分析结果缓存
  async function getAIAnalysis(profile1, profile2) {
    const key = generateAIAnalysisKey(profile1, profile2)
    const cached = aiAnalysisCache.value.get(key)
    
    if (cached && isValidCache(cached, config.AI_ANALYSIS_TTL)) {
      stats.value.aiCacheHits++
      return cached.data
    }
    
    stats.value.aiCacheMisses++
    return null
  }

  // 设置匹配结果缓存
  async function setMatchResult(userIds, matchType, result) {
    const cacheKey = generateMatchKey(userIds, matchType)
    
    if (matchResultsCache.value.size >= config.MAX_MATCH_CACHE_SIZE) {
      cleanupCache(matchResultsCache.value, config.MAX_MATCH_CACHE_SIZE * 0.7)
    }
    
    matchResultsCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
  }

  // 获取匹配结果缓存
  async function getMatchResult(userIds, matchType) {
    const key = generateMatchKey(userIds, matchType)
    const cached = matchResultsCache.value.get(key)
    
    if (cached && isValidCache(cached, config.MATCH_RESULTS_TTL)) {
      stats.value.matchCacheHits++
      return cached.data
    }
    
    stats.value.matchCacheMisses++
    return null
  }

  // 设置批次结果缓存
  async function setBatchResult(userIdsList, matchType, result) {
    const cacheKey = generateBatchKey(userIdsList, matchType)
    
    if (batchResultsCache.value.size >= config.MAX_BATCH_CACHE_SIZE) {
      cleanupCache(batchResultsCache.value, config.MAX_BATCH_CACHE_SIZE * 0.7)
    }
    
    batchResultsCache.value.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
  }

  // 获取批次结果缓存
  async function getBatchResult(userIdsList, matchType) {
    const key = generateBatchKey(userIdsList, matchType)
    const cached = batchResultsCache.value.get(key)
    
    if (cached && isValidCache(cached, config.BATCH_RESULTS_TTL)) {
      stats.value.batchCacheHits++
      return cached.data
    }
    
    stats.value.batchCacheMisses++
    return null
  }

  // 获取缓存统计信息
  function getCacheStats() {
    return {
      aiAnalysis: {
        size: aiAnalysisCache.value.size,
        maxSize: config.MAX_AI_CACHE_SIZE,
        hitRate: hitRates.value.aiAnalysis,
        hits: stats.value.aiCacheHits,
        misses: stats.value.aiCacheMisses
      },
      matchResults: {
        size: matchResultsCache.value.size,
        maxSize: config.MAX_MATCH_CACHE_SIZE,
        hitRate: hitRates.value.matchResults,
        hits: stats.value.matchCacheHits,
        misses: stats.value.matchCacheMisses
      },
      batchResults: {
        size: batchResultsCache.value.size,
        maxSize: config.MAX_BATCH_CACHE_SIZE,
        hitRate: hitRates.value.batchResults,
        hits: stats.value.batchCacheHits,
        misses: stats.value.batchCacheMisses
      }
    }
  }

  // 清理所有缓存
  function clearAllCaches() {
    aiAnalysisCache.value.clear()
    matchResultsCache.value.clear()
    batchResultsCache.value.clear()
    
    // 重置统计
    stats.value = {
      aiCacheHits: 0,
      aiCacheMisses: 0,
      matchCacheHits: 0,
      matchCacheMisses: 0,
      batchCacheHits: 0,
      batchCacheMisses: 0
    }
    
    console.log('所有缓存已清理')
  }

  // 智能缓存失效
  async function invalidateUserCaches(userId) {
    console.log(`开始为用户 ${userId} 清理缓存...`)

    // 清理AI分析缓存
    for (const [key, value] of aiAnalysisCache.value.entries()) {
      if (key.includes(userId)) {
        aiAnalysisCache.value.delete(key)
      }
    }

    // 清理匹配结果缓存
    for (const [key, value] of matchResultsCache.value.entries()) {
      if (key.includes(userId)) {
        matchResultsCache.value.delete(key)
      }
    }

    // 清理批次结果缓存
    for (const [key, value] of batchResultsCache.value.entries()) {
      if (key.includes(userId)) {
        batchResultsCache.value.delete(key)
      }
    }

    console.log(`用户 ${userId} 的缓存清理完成`)
  }

  return {
    // 配置
    config,

    // 统计
    stats,
    hitRates,

    // 缓存操作方法
    setAIAnalysis,
    getAIAnalysis,
    setMatchResult,
    getMatchResult,
    setBatchResult,
    getBatchResult,

    // 缓存管理方法
    getCacheStats,
    clearAllCaches,
    invalidateUserCaches,

    // 辅助方法
    generateAIAnalysisKey,
    generateMatchKey,
    generateBatchKey
  }
}