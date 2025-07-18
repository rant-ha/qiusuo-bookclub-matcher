<template>
  <div class="login-view">
    <h1>登录 KindredMinds</h1>
    
    <!-- 登录表单 -->
    <BaseCard>
      <form @submit.prevent="handleSubmit" class="login-form" aria-label="登录表单">
      <!-- 基本信息区域 -->
      <div class="form-group">
        <label for="name">姓名</label>
        <BaseInput
          id="name"
          v-model="formData.name"
          type="text"
          placeholder="请输入姓名"
          required
          minlength="2"
          maxlength="50"
          aria-required="true"
          :error="errors.name"
          :aria-describedby="['name-help', errors.name ? 'name-error' : undefined].filter(Boolean).join(' ')"
          @blur="validateField('name')"
        />
        <span id="name-help" class="helper-text">请输入2-50个字符的姓名</span>
        <span
          v-if="errors.name"
          id="name-error"
          class="error-message"
          role="alert"
        >{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label for="studentId">学号</label>
        <BaseInput
          id="studentId"
          v-model="formData.studentId"
          type="text"
          placeholder="请输入学号"
          required
          pattern="[A-Za-z0-9]+"
          aria-required="true"
          :error="errors.studentId"
          :aria-describedby="['studentId-help', errors.studentId ? 'studentId-error' : undefined].filter(Boolean).join(' ')"
          @blur="validateField('studentId')"
        />
        <span id="studentId-help" class="helper-text">学号只能包含字母和数字</span>
        <span
          v-if="errors.studentId"
          id="studentId-error"
          class="error-message"
          role="alert"
        >{{ errors.studentId }}</span>
      </div>

      <!-- 管理员密码区域（可选） -->
      <div class="form-group">
        <label for="password">
          管理员密码
          <span class="optional-text" id="password-description">(选填，仅管理员需要)</span>
        </label>
        <BaseInput
          id="password"
          v-model="formData.password"
          type="password"
          placeholder="如果您是管理员，请输入密码"
          aria-required="false"
          :error="errors.password"
          :aria-describedby="[errors.password ? 'password-error' : undefined, 'password-description'].filter(Boolean).join(' ')"
        />
        <span
          v-if="errors.password"
          id="password-error"
          class="error-message"
          role="alert"
        >{{ errors.password }}</span>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <BaseButton
          type="submit"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          aria-label="登录按钮"
        >
          {{ isSubmitting ? '登录中...' : '登录' }}
        </BaseButton>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="error"
        class="alert alert-error"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <span class="error-icon" aria-hidden="true">⚠</span>
        {{ error }}
      </div>

      <!-- 注册链接 -->
      <div class="register-link">
        还没有账号？
        <BaseButton
          to="/register"
          variant="text"
        >
          立即注册
        </BaseButton>
      </div>
      </form>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseCard from '../components/base/BaseCard.vue'
import BaseInput from '../components/base/BaseInput.vue'
import BaseButton from '../components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const formData = reactive({
  name: '',
  studentId: '',
  password: ''
})

// 状态
const isSubmitting = ref(false)
const error = ref(null)
const errors = reactive({
  name: '',
  studentId: '',
  password: ''
})

// 字段验证
function validateField(field) {
  errors[field] = ''

  switch (field) {
    case 'name':
      if (!formData.name) {
        errors.name = '请输入姓名'
      } else if (formData.name.length < 2) {
        errors.name = '姓名至少需要2个字符'
      }
      break

    case 'studentId':
      if (!formData.studentId) {
        errors.studentId = '请输入学号'
      } else if (!/^[A-Za-z0-9]+$/.test(formData.studentId)) {
        errors.studentId = '学号只能包含字母和数字'
      }
      break

    case 'password':
      // 密码是可选的，只在有值时验证
      if (formData.password && formData.password.length < 6) {
        errors.password = '密码至少需要6个字符'
      }
      break
  }
}

// 表单验证
function validateForm() {
  let isValid = true
  
  // 验证所有必填字段
  validateField('name')
  validateField('studentId')
  validateField('password')

  // 检查是否有错误
  return !Object.values(errors).some(error => error)
}

// 提交处理
async function handleSubmit() {
  // 重置错误
  error.value = null
  
  // 表单验证
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // 调用store的login action
    const success = await authStore.login({
      name: formData.name,
      studentId: formData.studentId,
      password: formData.password || undefined
    })

    if (success) {
      // 登录成功，跳转到首页
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || '登录失败，请重试'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-view {
  max-width: 480px;
  margin: var(--spacing-8) auto;
  padding: var(--spacing-6);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.optional-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
}

.helper-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.form-actions {
  margin-top: var(--spacing-4);
}

.alert {
  margin: var(--spacing-4) 0;
  padding: var(--spacing-3);
  border-radius: var(--border-radius-md);
  text-align: center;
}

.alert-error {
  color: var(--color-danger);
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid var(--color-danger);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.error-icon {
  font-size: 1.2em;
  color: var(--color-danger);
}

.register-link {
  margin-top: var(--spacing-4);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .login-view {
    padding: var(--spacing-4);
  }
}
</style>