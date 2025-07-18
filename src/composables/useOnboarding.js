import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

// localStorage 键名常量
const STORAGE_KEYS = {
  CURRENT_STEP: 'onboarding_current_step',
  COMPLETED: 'onboarding_completed'
}

export function useOnboarding() {
  const authStore = useAuthStore()
  
  // 从 localStorage 读取初始状态
  const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP)
  const savedCompleted = localStorage.getItem(STORAGE_KEYS.COMPLETED)
  
  // 核心状态
  const isActive = ref(false)
  const currentStepIndex = ref(savedStep ? parseInt(savedStep) : 0)
  const hasCompletedOnboarding = ref(savedCompleted === 'true')
  
  // 引导步骤配置
  const steps = reactive([
    {
      id: 'welcome',
      title: '欢迎来到 KindredMinds！',
      content: '在这里，你可以找到志同道合的学习搭档。\n让我们开始简单的导览，帮助你快速上手。',
      selector: null,
      showSkip: true,
      showPrevious: false,
    },
    {
      id: 'profile',
      title: '完善个人资料',
      content: '完善的个人资料是找到理想搭档的关键！\n点击这里进入个人资料页面。',
      selector: '.nav-link[href="/profile"]',
      showSkip: true,
      showPrevious: true,
    },
    {
      id: 'match',
      title: '开始智能匹配',
      content: '准备好寻找搭档了吗？\n点击这里开始智能匹配！',
      selector: '.nav-link[href="/match"]',
      showSkip: true,
      showPrevious: true,
    },
    {
      id: 'matching-modes',
      title: '选择匹配模式',
      content: '选择你偏好的匹配方式：\n- 相似匹配：找到与你水平相近的搭档\n- 互补匹配：找到能与你优势互补的搭档',
      selector: '.matching-modes',
      showSkip: false,
      showPrevious: true,
      isLastStep: true,
    }
  ])

  // 计算属性
  const currentStep = computed(() => steps[currentStepIndex.value])
  const isLastStep = computed(() => currentStep.value?.isLastStep || false)
  const canGoNext = computed(() => currentStepIndex.value < steps.length - 1)
  const canGoPrevious = computed(() => currentStepIndex.value > 0)

  // 核心方法
  const start = () => {
    isActive.value = true
    currentStepIndex.value = 0
    hasCompletedOnboarding.value = false
  }

  const next = () => {
    if (canGoNext.value) {
      currentStepIndex.value++
      // 保存当前步骤
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStepIndex.value.toString())
    } else {
      complete()
    }
  }

  const previous = () => {
    if (canGoPrevious.value) {
      currentStepIndex.value--
      // 保存当前步骤
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStepIndex.value.toString())
    }
  }

  const skip = () => {
    complete()
  }

  const complete = () => {
    isActive.value = false
    hasCompletedOnboarding.value = true
    // 保存完成状态
    localStorage.setItem(STORAGE_KEYS.COMPLETED, 'true')
    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, '0')
  }

  // 自动启动引导
  const checkAndStartOnboarding = () => {
    if (authStore.isAuthenticated && !hasCompletedOnboarding.value) {
      start()
    }
  }

  // 导出 storage keys 以便其他组件使用
  const getStorageKeys = () => STORAGE_KEYS

  return {
    // 状态
    isActive,
    currentStep,
    hasCompletedOnboarding,
    canGoNext,
    canGoPrevious,
    isLastStep,

    // 方法
    start,
    next,
    previous,
    skip,
    checkAndStartOnboarding,
    getStorageKeys,
  }
}