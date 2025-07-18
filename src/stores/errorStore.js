import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

// 错误类型分类
const ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  RATE_LIMIT: 'rate_limit', 
  API_UNAVAILABLE: 'api_unavailable',
  TIMEOUT: 'timeout',
  AUTHENTICATION: 'authentication',
  QUOTA_EXCEEDED: 'quota_exceeded',
  SERVER_ERROR: 'server_error',
  PARSING_ERROR: 'parsing_error',
  UNKNOWN: 'unknown'
}

// 错误恢复策略配置
const RECOVERY_STRATEGIES = {
  [ERROR_TYPES.NETWORK_ERROR]: {
    maxRetries: 3,
    baseDelay: 2000,
    backoffMultiplier: 2,
    canRecover: true,
    criticalLevel: 'medium'
  },
  [ERROR_TYPES.RATE_LIMIT]: {
    maxRetries: 5,
    baseDelay: 5000,
    backoffMultiplier: 2,
    canRecover: true,
    criticalLevel: 'high'
  },
  [ERROR_TYPES.API_UNAVAILABLE]: {
    maxRetries: 2,
    baseDelay: 10000,
    backoffMultiplier: 3,
    canRecover: false,
    criticalLevel: 'critical'
  },
  [ERROR_TYPES.TIMEOUT]: {
    maxRetries: 2,
    baseDelay: 3000,
    backoffMultiplier: 2,
    canRecover: true,
    criticalLevel: 'medium'
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    maxRetries: 1,
    baseDelay: 1000,
    backoffMultiplier: 1,
    canRecover: false,
    criticalLevel: 'critical'
  },
  [ERROR_TYPES.QUOTA_EXCEEDED]: {
    maxRetries: 0,
    baseDelay: 30000,
    backoffMultiplier: 1,
    canRecover: false,
    criticalLevel: 'critical'
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    maxRetries: 2,
    baseDelay: 5000,
    backoffMultiplier: 2,
    canRecover: true,
    criticalLevel: 'high'
  },
  [ERROR_TYPES.PARSING_ERROR]: {
    maxRetries: 1,
    baseDelay: 1000,
    backoffMultiplier: 1,
    canRecover: true,
    criticalLevel: 'low'
  },
  [ERROR_TYPES.UNKNOWN]: {
    maxRetries: 2,
    baseDelay: 2000,
    backoffMultiplier: 2,
    canRecover: true,
    criticalLevel: 'medium'
  }
}

export const useErrorStore = defineStore('error', () => {
  // 错误分类与计数
  const errorCategories = reactive({
    API_RATE_LIMIT: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'high',
      description: 'API速率限制',
      recoveryAction: 'exponential_backoff'
    },
    API_NETWORK_ERROR: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'medium',
      description: 'API网络错误',
      recoveryAction: 'retry_with_delay'
    },
    AI_PARSING_ERROR: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'medium',
      description: 'AI返回解析错误',
      recoveryAction: 'fallback_traditional'
    },
    AI_TIMEOUT_ERROR: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'high',
      description: 'AI请求超时',
      recoveryAction: 'reduce_batch_size'
    },
    CACHE_ERROR: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'low',
      description: '缓存系统错误',
      recoveryAction: 'cache_cleanup'
    },
    MEMORY_WARNING: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'medium',
      description: '内存使用警告',
      recoveryAction: 'garbage_collection'
    },
    USER_DATA_ERROR: { 
      count: 0, 
      lastOccurred: null, 
      severity: 'low',
      description: '用户数据不完整',
      recoveryAction: 'skip_processing'
    }
  })

  // 实时系统健康状态
  const systemHealth = reactive({
    overall: 'healthy',        // healthy, degraded, critical, maintenance
    api: 'operational',        // operational, degraded, down
    cache: 'operational',      // operational, degraded, disabled
    memory: 'optimal',         // optimal, warning, critical
    lastHealthCheck: Date.now(),
    consecutiveHealthChecks: 0,
    isRecovering: false,
    recoveryStartTime: null
  })

  // 监控配置
  const config = {
    HEALTH_CHECK_INTERVAL: 2 * 60 * 1000,     // 2分钟健康检查
    ERROR_WINDOW_SIZE: 100,               // 错误率计算窗口
    CRITICAL_ERROR_THRESHOLD: 10,         // 严重错误阈值
    RECOVERY_SUCCESS_THRESHOLD: 5,        // 恢复成功阈值
    MEMORY_WARNING_THRESHOLD: 0.8,        // 内存警告阈值
    CACHE_HIT_RATE_WARNING: 0.3,          // 缓存命中率警告线
    MAX_ERROR_LOG_SIZE: 1000              // 错误日志最大条目
  }

  // 错误日志存储
  const errorLog = ref([])
  const performanceMetrics = reactive({
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    responseTimeHistory: [],
    lastMetricsReset: Date.now()
  })

  // 记录错误的核心方法
  function logError(errorType, errorDetails = {}) {
    const timestamp = Date.now()
    const errorCategory = errorCategories[errorType]
    
    if (errorCategory) {
      errorCategory.count++
      errorCategory.lastOccurred = timestamp
    }
    
    // 添加到错误日志
    const logEntry = {
      timestamp,
      type: errorType,
      severity: errorCategory?.severity || 'unknown',
      details: errorDetails,
      userAgent: navigator?.userAgent || 'unknown',
      url: window?.location?.href || 'unknown'
    }
    
    errorLog.value.push(logEntry)
    
    // 限制日志大小
    if (errorLog.value.length > config.MAX_ERROR_LOG_SIZE) {
      errorLog.value = errorLog.value.slice(-config.MAX_ERROR_LOG_SIZE)
    }
    
    // 更新系统健康状态
    updateSystemHealth()
    
    // 输出到控制台（带颜色标识）
    const severityColors = {
      'high': 'color: #dc3545; font-weight: bold;',
      'medium': 'color: #fd7e14; font-weight: bold;',
      'low': 'color: #6c757d;'
    }
    
    console.log(
      `%c[ERROR-MONITOR] ${errorType}: ${errorCategory?.description || 'Unknown error'}`,
      severityColors[errorCategory?.severity] || '',
      errorDetails
    )
  }

  // 更新系统健康状态
  function updateSystemHealth() {
    const now = Date.now()
    const recentErrors = getRecentErrors(5 * 60 * 1000) // 5分钟内的错误
    
    // 计算整体健康状态
    const highSeverityErrors = recentErrors.filter(e => 
      errorCategories[e.type]?.severity === 'high').length
    const totalRecentErrors = recentErrors.length
    
    let overallHealth = 'healthy'
    if (highSeverityErrors >= 3 || totalRecentErrors >= 10) {
      overallHealth = 'critical'
    } else if (highSeverityErrors >= 1 || totalRecentErrors >= 5) {
      overallHealth = 'degraded'
    }
    
    // 更新API状态
    const apiErrors = recentErrors.filter(e => 
      e.type.startsWith('API_') || e.type.startsWith('AI_')).length
    let apiStatus = 'operational'
    if (apiErrors >= 5) {
      apiStatus = 'down'
    } else if (apiErrors >= 2) {
      apiStatus = 'degraded'
    }
    
    // 更新缓存状态
    const cacheErrors = recentErrors.filter(e => e.type === 'CACHE_ERROR').length
    let cacheStatus = 'operational'
    if (cacheErrors >= 3) {
      cacheStatus = 'disabled'
    } else if (cacheErrors >= 1) {
      cacheStatus = 'degraded'
    }
    
    // 更新内存状态
    const memoryErrors = recentErrors.filter(e => e.type === 'MEMORY_WARNING').length
    let memoryStatus = 'optimal'
    if (memoryErrors >= 3) {
      memoryStatus = 'critical'
    } else if (memoryErrors >= 1) {
      memoryStatus = 'warning'
    }
    
    // 更新健康状态
    systemHealth.overall = overallHealth
    systemHealth.api = apiStatus
    systemHealth.cache = cacheStatus
    systemHealth.memory = memoryStatus
    systemHealth.lastHealthCheck = now
    systemHealth.consecutiveHealthChecks++
  }

  // 获取最近的错误
  function getRecentErrors(timeWindow = 5 * 60 * 1000) {
    const cutoff = Date.now() - timeWindow
    return errorLog.value.filter(entry => entry.timestamp > cutoff)
  }

  // 获取错误统计
  function getErrorStats() {
    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000
    const lastHour = now - 60 * 60 * 1000
    const last5min = now - 5 * 60 * 1000
    
    const recent24h = errorLog.value.filter(e => e.timestamp > last24h)
    const recentHour = errorLog.value.filter(e => e.timestamp > lastHour)
    const recent5min = errorLog.value.filter(e => e.timestamp > last5min)
    
    return {
      total: errorLog.value.length,
      last24h: recent24h.length,
      lastHour: recentHour.length,
      last5min: recent5min.length,
      byCategory: Object.fromEntries(
        Object.entries(errorCategories).map(([key, value]) => [
          key,
          { count: value.count, lastOccurred: value.lastOccurred }
        ])
      ),
      bySeverity: {
        high: recent24h.filter(e => errorCategories[e.type]?.severity === 'high').length,
        medium: recent24h.filter(e => errorCategories[e.type]?.severity === 'medium').length,
        low: recent24h.filter(e => errorCategories[e.type]?.severity === 'low').length
      }
    }
  }

  // 获取系统健康报告
  function getHealthReport() {
    const stats = getErrorStats()
    
    return {
      timestamp: Date.now(),
      systemHealth,
      errorStats: stats,
      performance: {
        totalRequests: performanceMetrics.totalRequests,
        successRate: performanceMetrics.totalRequests > 0 ? 
          (performanceMetrics.successfulRequests / performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: performanceMetrics.averageResponseTime + 'ms'
      },
      recommendations: generateRecommendations()
    }
  }

  // 生成优化建议
  function generateRecommendations() {
    const recommendations = []
    const stats = getErrorStats()
    
    if (stats.last5min > 1) {
      recommendations.push({
        priority: 'high',
        message: '错误率过高，建议检查API配置和网络连接',
        action: 'check_api_config'
      })
    }
    
    if (systemHealth.cache === 'degraded') {
      recommendations.push({
        priority: 'medium',
        message: '缓存系统性能下降，建议清理缓存',
        action: 'cleanup_cache'
      })
    }
    
    if (systemHealth.memory === 'warning') {
      recommendations.push({
        priority: 'medium',
        message: '内存使用过高，建议执行垃圾回收',
        action: 'garbage_collection'
      })
    }
    
    return recommendations
  }

  // 重置监控数据
  function resetMonitoring() {
    // 重置错误计数器
    Object.keys(errorCategories).forEach(key => {
      errorCategories[key].count = 0
      errorCategories[key].lastOccurred = null
    })
    
    // 清空错误日志
    errorLog.value = []
    
    // 重置性能指标
    performanceMetrics.totalRequests = 0
    performanceMetrics.successfulRequests = 0
    performanceMetrics.averageResponseTime = 0
    performanceMetrics.responseTimeHistory = []
    performanceMetrics.lastMetricsReset = Date.now()
    
    // 重置健康状态
    systemHealth.overall = 'healthy'
    systemHealth.api = 'operational'
    systemHealth.cache = 'operational'
    systemHealth.memory = 'optimal'
    systemHealth.lastHealthCheck = Date.now()
    systemHealth.consecutiveHealthChecks = 0
    systemHealth.isRecovering = false
    systemHealth.recoveryStartTime = null
  }

  // 记录成功请求
  function recordSuccess() {
    performanceMetrics.totalRequests++
    performanceMetrics.successfulRequests++
  }

  return {
    // 常量
    ERROR_TYPES,
    RECOVERY_STRATEGIES,
    
    // 状态
    errorCategories,
    systemHealth,
    errorLog,
    performanceMetrics,
    
    // 方法
    logError,
    getErrorStats,
    getHealthReport,
    resetMonitoring,
    recordSuccess
  }
})