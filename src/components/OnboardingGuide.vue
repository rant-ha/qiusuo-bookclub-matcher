<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isActive" class="onboarding-container">
        <!-- 半透明遮罩层 -->
        <div class="overlay" @click.self="handleOverlayClick"></div>
        
        <!-- 高亮框 -->
        <div
          v-if="highlightPosition"
          class="highlight"
          :style="{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`
          }"
        ></div>

        <!-- 提示框 -->
        <div
          v-if="tooltipPosition"
          class="tooltip"
          :style="{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }"
        >
          <h3>{{ currentStep.title }}</h3>
          <p>{{ currentStep.content }}</p>
          
          <div class="tooltip-actions">
            <button
              v-if="currentStep.showPrevious"
              class="btn btn-secondary"
              @click="previous"
            >
              上一步
            </button>
            
            <button
              v-if="currentStep.showSkip"
              class="btn btn-text"
              @click="skip"
            >
              跳过引导
            </button>
            
            <button
              class="btn btn-primary"
              @click="next"
            >
              {{ isLastStep ? '完成' : '下一步' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useOnboarding } from '../composables/useOnboarding'

const {
  isActive,
  currentStep,
  isLastStep,
  next,
  previous,
  skip,
} = useOnboarding()

// 位置状态
const highlightPosition = ref(null)
const tooltipPosition = ref(null)

// 更新目标元素位置
const updatePositions = () => {
  if (!currentStep.value?.selector) {
    // 欢迎页面等不需要高亮特定元素的步骤
    highlightPosition.value = null
    tooltipPosition.value = {
      top: window.innerHeight / 2 - 100,
      left: window.innerWidth / 2 - 150
    }
    return
  }

  const targetElement = document.querySelector(currentStep.value.selector)
  if (!targetElement) return

  const rect = targetElement.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

  // 设置高亮框位置
  highlightPosition.value = {
    top: rect.top + scrollTop - 4,
    left: rect.left + scrollLeft - 4,
    width: rect.width + 8,
    height: rect.height + 8
  }

  // 计算提示框位置
  const tooltipWidth = 300
  const tooltipHeight = 200
  const margin = 20

  let tooltipTop = rect.bottom + scrollTop + margin
  let tooltipLeft = rect.left + scrollLeft + (rect.width - tooltipWidth) / 2

  // 确保提示框不会超出视口
  if (tooltipTop + tooltipHeight > window.innerHeight) {
    tooltipTop = rect.top + scrollTop - tooltipHeight - margin
  }

  if (tooltipLeft < margin) {
    tooltipLeft = margin
  } else if (tooltipLeft + tooltipWidth > window.innerWidth - margin) {
    tooltipLeft = window.innerWidth - tooltipWidth - margin
  }

  tooltipPosition.value = {
    top: tooltipTop,
    left: tooltipLeft
  }
}

// 监听步骤变化
watch(() => currentStep.value, updatePositions, { immediate: true })

// 处理窗口大小变化
const handleResize = () => {
  if (isActive.value) {
    updatePositions()
  }
}

// 处理遮罩层点击
const handleOverlayClick = (event) => {
  // 只有点击遮罩层本身时才触发（不包括子元素）
  if (event.target === event.currentTarget) {
    // 可选：添加提示或阻止关闭
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('resize', handleResize)
  updatePositions()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.onboarding-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.highlight {
  position: absolute;
  background: transparent;
  border: 2px solid #667eea;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  z-index: 1;
  pointer-events: none;
  transition: all 0.3s ease;
}

.tooltip {
  position: absolute;
  width: 300px;
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.tooltip h3 {
  margin: 0 0 0.5rem;
  color: #2d3748;
  font-size: 1.25rem;
}

.tooltip p {
  margin: 0 0 1.5rem;
  color: #4a5568;
  white-space: pre-line;
}

.tooltip-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #edf2f7;
  color: #4a5568;
  border: none;
}

.btn-secondary:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-text {
  background: transparent;
  color: #718096;
  border: none;
}

.btn-text:hover {
  color: #4a5568;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>