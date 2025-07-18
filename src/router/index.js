import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/match',
      name: 'match',
      component: () => import('../views/MatchView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { 
        requiresAuth: true,
        requiresRole: 'super_admin'
      }
    }
  ]
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const { isAuthenticated, role } = authStore

  // 处理需要登录的路由
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }

  // 处理需要特定角色的路由
  if (to.meta.requiresRole && (!isAuthenticated || role !== to.meta.requiresRole)) {
    next('/')
    return
  }

  // 处理仅限游客访问的路由（登录和注册页面）
  if (to.meta.guestOnly && isAuthenticated) {
    next('/')
    return
  }

  // 其他情况正常放行
  next()
})

export default router