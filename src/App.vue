<template>
  <OnboardingGuide />
  <header>
    <nav class="navbar">
      <div class="nav-brand">
        <BaseButton
          to="/"
          variant="text"
          class="brand-link"
        >
          KindredMinds
        </BaseButton>
      </div>
      
      <div class="nav-menu">
        <BaseButton
          to="/"
          variant="text"
          class="nav-link"
        >
          首页
        </BaseButton>
        
        <!-- 已登录用户的导航链接 -->
        <template v-if="isAuthenticated">
          <BaseButton
            to="/profile"
            variant="text"
            class="nav-link"
          >
            个人资料
          </BaseButton>
          <BaseButton
            to="/match"
            variant="text"
            class="nav-link"
          >
            智能匹配
          </BaseButton>
          <BaseButton
            v-if="isAdmin"
            to="/admin"
            variant="text"
            class="nav-link"
          >
            管理面板
          </BaseButton>
          <BaseButton
            @click="start"
            variant="text"
            class="help-btn"
            aria-label="重新查看新手引导"
            title="重新查看新手引导"
          >
            <span class="help-icon" aria-hidden="true">?</span>
          </BaseButton>
          <BaseButton
            @click="toggleHighContrast"
            variant="text"
            class="contrast-btn"
            :aria-label="isHighContrast ? '关闭高对比度模式' : '开启高对比度模式'"
            :title="isHighContrast ? '关闭高对比度模式' : '开启高对比度模式'"
          >
            <span class="contrast-icon" aria-hidden="true">
              {{ isHighContrast ? '🌙' : '☀️' }}
            </span>
          </BaseButton>
          <BaseButton
            @click="handleLogout"
            variant="secondary"
            class="logout-btn"
            aria-label="退出登录"
          >
            退出登录
          </BaseButton>
        </template>
        
        <!-- 未登录用户的导航链接 -->
        <template v-else>
          <BaseButton
            to="/register"
            variant="text"
            class="nav-link"
          >
            注册
          </BaseButton>
          <BaseButton
            to="/login"
            variant="primary"
            class="nav-link"
          >
            登录
          </BaseButton>
        </template>
      </div>
    </nav>
  </header>

  <main>
    <router-view></router-view>
  </main>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'
import { useOnboarding } from './composables/useOnboarding'
import OnboardingGuide from './components/OnboardingGuide.vue'
import BaseButton from './components/base/BaseButton.vue'

const authStore = useAuthStore()
const router = useRouter()
const { checkAndStartOnboarding, start } = useOnboarding()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const isHighContrast = ref(false)

// 初始化主题设置
onMounted(() => {
  // 从localStorage读取主题设置
  const savedTheme = localStorage.getItem('highContrastMode')
  if (savedTheme === 'true') {
    isHighContrast.value = true
    document.documentElement.classList.add('high-contrast')
  }
  
  // 监听系统主题偏好变化
  const mediaQuery = window.matchMedia('(prefers-contrast: more)')
  const handleChange = (e) => {
    if (!localStorage.getItem('highContrastMode')) {
      isHighContrast.value = e.matches
      document.documentElement.classList.toggle('high-contrast', e.matches)
    }
  }
  mediaQuery.addEventListener('change', handleChange)
})

// 切换高对比度模式
const toggleHighContrast = () => {
  isHighContrast.value = !isHighContrast.value
  document.documentElement.classList.toggle('high-contrast')
  localStorage.setItem('highContrastMode', isHighContrast.value)
}

// 监听登录状态变化，自动启动引导
watch(isAuthenticated, (newValue) => {
  if (newValue) {
    checkAndStartOnboarding()
  }
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<style>
body {
  margin: 0;
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-gradient-primary);
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: var(--bg-gradient-primary);
  box-shadow: var(--shadow-md);
  padding: 0;
}

.navbar {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
}

.nav-brand {
  flex: 0 0 auto;
}

.brand-link {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-white);
  letter-spacing: -0.5px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.nav-link {
  font-weight: var(--font-weight-medium);
}

.help-btn, .contrast-btn {
  width: 32px;
  height: 32px;
  padding: var(--spacing-2) !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-icon {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
}

.contrast-icon {
  font-size: var(--font-size-lg);
}

main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-8) var(--spacing-4);
  width: 100%;
  box-sizing: border-box;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
  }
  
  .nav-menu {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-link {
    font-size: var(--font-size-sm);
  }
}

@media (max-width: 480px) {
  .brand-link {
    font-size: var(--font-size-xl);
  }
  
  .nav-menu {
    gap: var(--spacing-1);
  }
  
  .nav-link {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: var(--font-size-sm);
  }
}
</style>