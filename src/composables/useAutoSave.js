import { ref } from 'vue'

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {Number} delay 延迟时间（毫秒）
 */
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 自动保存 composable
 * @param {String} storageKey localStorage 存储键名
 * @param {Object} options 配置选项
 * @returns {Object} 自动保存相关的方法和状态
 */
export function useAutoSave(storageKey, options = {}) {
  const {
    delay = 2000, // 默认延迟2秒
    onSave = null, // 保存回调
    onRestore = null // 恢复回调
  } = options

  const hasSavedData = ref(false)

  // 保存数据到 localStorage
  const saveToStorage = (data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: Date.now(),
        data
      }))
      hasSavedData.value = true
    } catch (error) {
      console.error('自动保存失败:', error)
    }
  }

  // 创建防抖后的保存函数
  const debouncedSave = debounce((data) => {
    saveToStorage(data)
    if (onSave) onSave(data)
  }, delay)

  // 从 localStorage 恢复数据
  const restoreFromStorage = () => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { timestamp, data } = JSON.parse(saved)
        // 检查数据是否在24小时内
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          hasSavedData.value = true
          if (onRestore) onRestore(data)
          return data
        }
      }
    } catch (error) {
      console.error('恢复数据失败:', error)
    }
    return null
  }

  // 清除存储的数据
  const clearStorage = () => {
    localStorage.removeItem(storageKey)
    hasSavedData.value = false
  }

  return {
    hasSavedData,
    saveToStorage: debouncedSave,
    restoreFromStorage,
    clearStorage
  }
}