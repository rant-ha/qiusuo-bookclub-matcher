<template>
  <div class="login-view">
    <h1>登录 KindredMinds</h1>
    
    <!-- 登录表单 -->
    <form @submit.prevent="handleSubmit" class="login-form">
      <!-- 基本信息区域 -->
      <div class="form-group">
        <label for="name">姓名</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="form-control"
          :class="{ 'error': errors.name }"
          placeholder="请输入姓名"
          required
          minlength="2"
          maxlength="50"
        >
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label for="studentId">学号</label>
        <input
          id="studentId"
          v-model="formData.studentId"
          type="text"
          class="form-control"
          :class="{ 'error': errors.studentId }"
          placeholder="请输入学号"
          required
          pattern="[A-Za-z0-9]+"
        >
        <span v-if="errors.studentId" class="error-message">{{ errors.studentId }}</span>
      </div>

      <!-- 管理员密码区域（可选） -->
      <div class="form-group">
        <label for="password">
          管理员密码
          <span class="optional-text">(选填，仅管理员需要)</span>
        </label>
        <input
          id="password"
          v-model="formData.password"
          type="password"
          class="form-control"
          :class="{ 'error': errors.password }"
          placeholder="如果您是管理员，请输入密码"
        >
        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button
          type="submit"
          class="submit-button"
          :class="{ 'btn-loading': isSubmitting }"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">
            <i class="spinner"></i>
            登录中...
          </span>
          <span v-else>登录</span>
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="alert alert-error" role="alert">
        {{ error }}
      </div>

      <!-- 注册链接 -->
      <div class="register-link">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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

// 表单验证
function validateForm() {
  let isValid = true
  errors.name = ''
  errors.studentId = ''
  errors.password = ''

  // 验证姓名
  if (!formData.name) {
    errors.name = '请输入姓名'
    isValid = false
  } else if (formData.name.length < 2) {
    errors.name = '姓名至少需要2个字符'
    isValid = false
  }

  // 验证学号
  if (!formData.studentId) {
    errors.studentId = '请输入学号'
    isValid = false
  } else if (!/^[A-Za-z0-9]+$/.test(formData.studentId)) {
    errors.studentId = '学号只能包含字母和数字'
    isValid = false
  }

  return isValid
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
  margin: 2rem auto;
  padding: 2rem;
}

.login-form {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.optional-text {
  font-size: 0.875rem;
  color: #666;
  font-weight: normal;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.2s;
}

.form-control:focus {
  border-color: #4a90e2;
  outline: none;
}

.form-control.error {
  border-color: #dc3545;
}

.error-message {
  display: block;
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-actions {
  margin-top: 2rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  color: #fff;
  background: #4a90e2;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background: #357abd;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.alert {
  margin: 1rem 0;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
}

.alert-error {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.register-link {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
}

.register-link a {
  color: #4a90e2;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .login-view {
    padding: 1rem;
  }

  .login-form {
    padding: 1.5rem;
  }

  .form-control {
    font-size: 16px; /* 防止iOS缩放 */
  }
}
</style>