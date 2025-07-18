import { ref, computed } from 'vue'

export function useApiHealth() {
  // 状态
  const errorCount = ref(0)
  const successCount = ref(0)
  const consecutiveErrors = ref(0)
  const lastErrorTime = ref(null)
  const currentBatchSize = ref(3)
  const degradedMode = ref(false)
  const degradationStartTime = ref(null)

  // 配置
  const config = {
    degradationThreshold: 5,          // 连续错误阈值
    recoveryThreshold: 3,             // 恢复检测阈值
    degradationCooldown: 5 * 60 * 1000, // 5分钟冷却期
  }

  // 计算属性
  const errorRate = computed(() => {
    const total = errorCount.value + successCount.value
    return total > 0 ? errorCount.value / total : 0
  })

  // 获取降级状态信息
  const degradationStatus = computed(() => {
    return {
      degraded: degradedMode.value,
      startTime: degradationStartTime.value,
      duration: degradedMode.value ? Date.now() - degradationStartTime.value : 0,
      consecutiveErrors: consecutiveErrors.value,
      errorRate: errorRate.value,
      canRecover: degradedMode.value && 
                 (Date.now() - degradationStartTime.value) >= config.degradationCooldown
    }
  })

  // 记录成功
  function recordSuccess() {
    successCount.value++
    consecutiveErrors.value = 0

    // 检查是否可以从降级模式恢复
    if (degradedMode.value) {
      checkRecovery()
    }
  }

  // 记录错误
  function recordError() {
    errorCount.value++
    consecutiveErrors.value++
    lastErrorTime.value = Date.now()

    // 检查是否需要进入降级模式
    if (!degradedMode.value && consecutiveErrors.value >= config.degradationThreshold) {
      enterDegradedMode()
    }
  }

  // 检查是否应该使用AI
  function shouldUseAI() {
    // 检查是否在降级模式
    if (degradedMode.value) {
      return false
    }

    // 检查连续错误数
    return consecutiveErrors.value < config.degradationThreshold
  }

  // 获取动态批处理大小
  function getDynamicBatchSize() {
    const currentErrorRate = errorRate.value
    if (currentErrorRate > 0.3) {
      currentBatchSize.value = Math.max(1, currentBatchSize.value - 1)
    } else if (currentErrorRate < 0.1 && consecutiveErrors.value === 0) {
      currentBatchSize.value = Math.min(5, currentBatchSize.value + 1)
    }
    return currentBatchSize.value
  }

  // 进入降级模式
  function enterDegradedMode() {
    degradedMode.value = true
    degradationStartTime.value = Date.now()

    console.warn(`⚠️ AI服务降级：连续${consecutiveErrors.value}次错误，切换到传统匹配算法`)
  }

  // 检查恢复条件
  function checkRecovery() {
    if (!degradedMode.value) return

    const now = Date.now()
    const timeSinceDegradation = now - degradationStartTime.value

    // 必须满足时间冷却期和连续成功条件
    if (timeSinceDegradation >= config.degradationCooldown && consecutiveErrors.value === 0) {
      exitDegradedMode()
    }
  }

  // 退出降级模式
  function exitDegradedMode() {
    degradedMode.value = false
    degradationStartTime.value = null

    console.log(`✅ AI服务恢复：退出降级模式，重新启用AI智能匹配`)
  }

  // 手动重置降级状态
  function forceReset() {
    degradedMode.value = false
    degradationStartTime.value = null
    consecutiveErrors.value = 0
    errorCount.value = 0
    successCount.value = 0
    currentBatchSize.value = 3

    console.log('🔄 API健康监控已手动重置')
  }

  return {
    // 状态
    errorCount,
    successCount,
    consecutiveErrors,
    lastErrorTime,
    currentBatchSize,
    degradedMode,
    degradationStartTime,

    // 计算属性
    errorRate,
    degradationStatus,

    // 方法
    recordSuccess,
    recordError,
    shouldUseAI,
    getDynamicBatchSize,
    forceReset,

    // 配置
    config
  }
}