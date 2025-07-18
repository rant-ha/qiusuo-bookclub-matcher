<template>
  <div class="register">
    <div class="card">
      <!-- 进度指示器 -->
      <div class="progress-steps">
        <div
          v-for="step in 3"
          :key="step"
          :class="[
            'step',
            {
              'active': authStore.registrationStep === step,
              'completed': authStore.registrationStep > step
            }
          ]"
        >
          <div class="step-number">{{ step }}</div>
          <div class="step-label">{{ stepLabels[step - 1] }}</div>
        </div>
      </div>

      <h1>{{ stepTitles[authStore.registrationStep - 1] }}</h1>

      <!-- 表单内容 -->
      <form
        @submit.prevent="handleSubmit"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        class="register-form"
      >
        <!-- 步骤 1: 基本信息 -->
        <div v-if="authStore.registrationStep === 1" :class="['form-step', slideDirection]">
          <div class="form-group">
            <label for="name">姓名</label>
            <input
              type="text"
              id="name"
              v-model="authStore.formData.name"
              class="form-control"
              required
              :disabled="authStore.isSubmitting"
            >
          </div>
          
          <div class="form-group">
            <label for="studentId">学号</label>
            <input
              type="text"
              id="studentId"
              v-model="authStore.formData.studentId"
              class="form-control"
              required
              :disabled="authStore.isSubmitting"
            >
          </div>
          
          <div class="form-group">
            <label>性别（选填）</label>
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="authStore.formData.gender"
                  value="male"
                  :disabled="authStore.isSubmitting"
                >
                <span>男</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="authStore.formData.gender"
                  value="female"
                  :disabled="authStore.isSubmitting"
                >
                <span>女</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="authStore.formData.gender"
                  value="other"
                  :disabled="authStore.isSubmitting"
                >
                <span>其他</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="authStore.formData.gender"
                  value="prefer_not_to_say"
                  :disabled="authStore.isSubmitting"
                >
                <span>不愿透露</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 步骤 2: 阅读偏好 -->
        <div v-if="authStore.registrationStep === 2" :class="['form-step', slideDirection]">
          <div class="form-group">
            <label>书籍类别（至少选择1个，最多7个）</label>
            <div class="checkbox-group">
              <label v-for="category in bookCategories" :key="category.value" class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="authStore.formData.bookCategories"
                  :value="category.value"
                  :disabled="authStore.isSubmitting ||
                    (authStore.formData.bookCategories.length >= 7 &&
                    !authStore.formData.bookCategories.includes(category.value))"
                >
                <span>{{ category.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="detailedPreferences">详细阅读偏好（选填）</label>
            <textarea
              id="detailedPreferences"
              v-model="authStore.formData.detailedBookPreferences"
              class="form-control"
              rows="4"
              placeholder="请描述您喜欢的书籍类型、作者或主题..."
              :disabled="authStore.isSubmitting"
            ></textarea>
          </div>

          <div class="form-group">
            <label>最爱的书籍（2-10本）</label>
            <div class="favorite-books">
              <div
                v-for="(_, index) in favoriteBookInputs"
                :key="index"
                class="book-input-group"
              >
                <input
                  type="text"
                  v-model="authStore.formData.favoriteBooks[index]"
                  :placeholder="`第 ${index + 1} 本书`"
                  class="form-control"
                  :disabled="authStore.isSubmitting"
                >
                <button
                  type="button"
                  class="remove-book"
                  @click="removeBook(index)"
                  :disabled="authStore.isSubmitting || index < 2"
                >
                  删除
                </button>
              </div>
              <button
                type="button"
                class="add-book"
                @click="addBook"
                :disabled="authStore.isSubmitting || authStore.formData.favoriteBooks.length >= 10"
              >
                添加书籍
              </button>
            </div>
          </div>
        </div>

        <!-- 步骤 3: 阅读习惯 -->
        <div v-if="authStore.registrationStep === 3" :class="['form-step', slideDirection]">
          <div class="form-group">
            <label>阅读承诺</label>
            <div class="radio-group commitment-group">
              <label
                v-for="commitment in readingCommitments"
                :key="commitment.value"
                class="radio-label commitment-label"
              >
                <input
                  type="radio"
                  v-model="authStore.formData.readingCommitment"
                  :value="commitment.value"
                  :disabled="authStore.isSubmitting"
                >
                <span class="commitment-content">
                  <strong>{{ commitment.label }}</strong>
                  <small>{{ commitment.description }}</small>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>每周阅读时间</label>
            <select
              v-model="authStore.formData.readingHabits.weeklyHours"
              class="form-control"
              :disabled="authStore.isSubmitting"
            >
              <option value="">请选择</option>
              <option value="0-2">0-2小时</option>
              <option value="2-5">2-5小时</option>
              <option value="5-10">5-10小时</option>
              <option value="10+">10小时以上</option>
            </select>
          </div>

          <div class="form-group">
            <label>偏好阅读时段（可多选）</label>
            <div class="checkbox-group">
              <label v-for="time in readingTimes" :key="time.value" class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="authStore.formData.readingHabits.preferredTimes"
                  :value="time.value"
                  :disabled="authStore.isSubmitting"
                >
                <span>{{ time.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <Transition name="fade-slide">
          <div class="error-message" v-if="authStore.error">
            {{ authStore.error }}
          </div>
        </Transition>

        <!-- 导航按钮 -->
        <div class="form-navigation">
          <button
            type="button"
            class="btn btn-secondary"
            @click="handlePrevious"
            v-if="authStore.registrationStep > 1"
            :disabled="authStore.isSubmitting"
          >
            上一步
          </button>

          <button
            type="button"
            class="btn btn-primary"
            :class="{ 'btn-loading': authStore.isSubmitting }"
            @click="handleNext"
            v-if="authStore.registrationStep < 3"
            :disabled="authStore.isSubmitting"
          >
            <span v-if="authStore.isSubmitting">
              <i class="spinner"></i>
              处理中...
            </span>
            <span v-else>下一步</span>
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            :class="{ 'btn-loading': authStore.isSubmitting }"
            v-if="authStore.registrationStep === 3"
            :disabled="authStore.isSubmitting"
          >
            <span v-if="authStore.isSubmitting">
              <i class="spinner"></i>
              注册中...
            </span>
            <span v-else>完成注册</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 触摸状态管理
const touchStart = ref({ x: 0, y: 0 })
const touchEnd = ref({ x: 0, y: 0 })
const minSwipeDistance = 50 // 最小滑动距离
const maxVerticalOffset = 30 // 最大垂直偏移
const slideDirection = ref('') // 滑动方向状态

// 触摸事件处理
const handleTouchStart = (event) => {
  touchStart.value = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  }
}

const handleTouchEnd = (event) => {
  touchEnd.value = {
    x: event.changedTouches[0].clientX,
    y: event.changedTouches[0].clientY
  }

  // 计算水平和垂直位移
  const deltaX = touchEnd.value.x - touchStart.value.x
  const deltaY = Math.abs(touchEnd.value.y - touchStart.value.y)

  // 只有当水平滑动距离足够大，且垂直偏移较小时才触发
  if (Math.abs(deltaX) >= minSwipeDistance && deltaY <= maxVerticalOffset) {
    if (deltaX > 0 && authStore.registrationStep > 1) {
      // 向右滑动，返回上一步
      handlePrevious()
    } else if (deltaX < 0 && authStore.registrationStep < 3) {
      // 向左滑动，前进下一步
      handleNext()
    }
  }
}

// 步骤标题
const stepLabels = ['基本信息', '阅读偏好', '阅读习惯']
const stepTitles = ['填写基本信息', '设置阅读偏好', '选择阅读习惯']

// 书籍类别选项
const bookCategories = [
  { value: 'literature_fiction', label: '文学/当代小说' },
  { value: 'mystery_detective', label: '悬疑侦探/推理' },
  { value: 'sci_fi_fantasy', label: '科幻奇幻' },
  { value: 'history_biography', label: '历史传记/记实' },
  { value: 'social_science_philosophy', label: '社科思想/哲学' },
  { value: 'psychology_self_help', label: '心理成长/自助' },
  { value: 'art_design_lifestyle', label: '艺术设计/生活方式' }
]

// 阅读承诺选项
const readingCommitments = [
  {
    value: 'light',
    label: '轻量阅读',
    description: '每月5w-10w字，适合工作/学习繁忙的读者'
  },
  {
    value: 'medium',
    label: '适中阅读',
    description: '每月10w-25w字，保持稳定的阅读习惯'
  },
  {
    value: 'intensive',
    label: '投入阅读',
    description: '每月25w-50w字，热爱阅读并投入大量时间'
  },
  {
    value: 'epic',
    label: '史诗阅读',
    description: '每月50w字以上，将阅读作为生活的重要部分'
  }
]

// 阅读时段选项
const readingTimes = [
  { value: 'early_morning', label: '清晨（5:00-9:00）' },
  { value: 'morning', label: '上午（9:00-12:00）' },
  { value: 'afternoon', label: '下午（12:00-18:00）' },
  { value: 'evening', label: '晚上（18:00-22:00）' },
  { value: 'night', label: '深夜（22:00-5:00）' }
]

// 最爱书籍输入框管理
const favoriteBookInputs = computed(() => {
  const currentLength = authStore.formData.favoriteBooks.length
  return currentLength < 2 ? 2 : currentLength
})

// 添加书籍输入框
const addBook = () => {
  if (authStore.formData.favoriteBooks.length < 10) {
    authStore.formData.favoriteBooks.push('')
  }
}

// 删除书籍输入框
const removeBook = (index) => {
  if (index >= 2) {
    authStore.formData.favoriteBooks.splice(index, 1)
  }
}

// 处理下一步
const handleNext = () => {
  slideDirection.value = 'sliding-left'
  if (authStore.nextStep()) {
    window.scrollTo(0, 0)
    setTimeout(() => {
      slideDirection.value = ''
    }, 300)
  }
}

// 处理上一步
const handlePrevious = () => {
  slideDirection.value = 'sliding-right'
  if (authStore.previousStep()) {
    window.scrollTo(0, 0)
    setTimeout(() => {
      slideDirection.value = ''
    }, 300)
  }
}

// 处理提交
const handleSubmit = async () => {
  if (await authStore.register()) {
    router.push('/')
  }
}
</script>

<style scoped>
.register {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
  touch-action: pan-y pinch-zoom;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

/* 进度指示器 */
.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  height: 2px;
  background: #e0e0e0;
  z-index: 1;
}

.step {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.step.active .step-number {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #fff;
}

.step.completed .step-number {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.step-label {
  font-size: 0.875rem;
  color: #666;
  text-align: center;
}

/* 表单样式 */
.form-step {
  animation: fadeIn 0.3s ease;
  transition: transform 0.3s ease-out;
  will-change: transform, opacity;
}

.form-step.sliding-left {
  animation: slideLeft 0.3s ease-out;
}

.form-step.sliding-right {
  animation: slideRight 0.3s ease-out;
}

@keyframes slideLeft {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideRight {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-control {
  width: 100%;
  min-height: 44px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

/* 单选框和复选框组 */
.radio-group,
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
}

.radio-label,
.checkbox-label {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.radio-label input,
.checkbox-label input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.radio-label span,
.checkbox-label span {
  display: inline-block;
  padding: 10px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 20px;
  background-color: white;
  color: #666;
  font-size: 14px;
  transition: all 0.3s ease;
  text-align: center;
}

.radio-label:hover span,
.checkbox-label:hover span {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.radio-label input:checked + span,
.checkbox-label input:checked + span {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.radio-label input:focus + span,
.checkbox-label input:focus + span {
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

/* 阅读承诺样式 */
.commitment-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.commitment-label {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.commitment-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.commitment-content small {
  color: #666;
}

/* 最爱书籍输入组 */
.favorite-books {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.book-input-group {
  display: flex;
  gap: 0.5rem;
}

.book-input-group .form-control {
  flex: 1;
}

.remove-book {
  padding: 0 1rem;
  color: #dc3545;
  background: none;
  border: 1px solid #dc3545;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-book:hover {
  background: #dc3545;
  color: #fff;
}

.add-book {
  padding: 0.75rem;
  background: none;
  border: 1px dashed #666;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-book:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* 错误消息 */
.error-message {
  color: #dc3545;
  margin: 1rem 0;
  padding: 0.75rem;
  background: #fff5f5;
  border-radius: 6px;
  font-size: 0.875rem;
}

/* 导航按钮 */
.form-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: #fff;
  flex: 1;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .card {
    padding: 1rem;
    border-radius: 0;
    box-shadow: none;
  }

  .step-label {
    font-size: 0.75rem;
  }

  .radio-group,
  .checkbox-group {
    justify-content: center;
    gap: 8px;
  }

  .radio-label span,
  .checkbox-label span {
    padding: 8px 16px;
    font-size: 13px;
  }

  .form-navigation {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>