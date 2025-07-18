<template>
  <OnboardingGuide />
  <header>
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">KindredMinds</router-link>
      </div>
      
      <div class="nav-menu">
        <router-link to="/" class="nav-link">首页</router-link>
        
        <!-- 已登录用户的导航链接 -->
        <template v-if="isAuthenticated">
          <router-link to="/profile" class="nav-link">个人资料</router-link>
          <router-link to="/match" class="nav-link">智能匹配</router-link>
          <router-link v-if="isAdmin" to="/admin" class="nav-link">管理面板</router-link>
          <button
            @click="start"
            class="nav-button help-btn"
            aria-label="重新查看新手引导"
            title="重新查看新手引导"
          >
            <span class="help-icon" aria-hidden="true">?</span>
          </button>
          <button
            @click="toggleHighContrast"
            class="nav-button contrast-btn"
            :aria-label="isHighContrast ? '关闭高对比度模式' : '开启高对比度模式'"
            :title="isHighContrast ? '关闭高对比度模式' : '开启高对比度模式'"
          >
            <span class="contrast-icon" aria-hidden="true">
              {{ isHighContrast ? '🌙' : '☀️' }}
            </span>
          </button>
          <button
            @click="handleLogout"
            class="nav-button logout-btn"
            aria-label="退出登录"
          >
            退出登录
          </button>
        </template>
        
        <!-- 未登录用户的导航链接 -->
        <template v-else>
          <router-link to="/register" class="nav-link">注册</router-link>
          <router-link to="/login" class="nav-link">登录</router-link>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f8fafc;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.navbar {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.nav-brand {
  flex: 0 0 auto;
}

.brand-link {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
  letter-spacing: -0.5px;
}

.brand-link:hover {
  opacity: 0.9;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-1px);
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-button {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.logout-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.5);
}

.help-btn {
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
}

.help-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.help-icon {
  font-weight: bold;
  font-size: 1.1rem;
}

.contrast-btn {
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contrast-icon {
  font-size: 1.1rem;
}

main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .nav-menu {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-link, .nav-button {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .brand-link {
    font-size: 1.2rem;
  }
  
  .nav-menu {
    gap: 0.25rem;
  }
  
  .nav-link, .nav-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>