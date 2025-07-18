<template>
  <div class="admin">
    <h1>管理员面板</h1>
    
    <!-- 系统状态概览 -->
    <section v-if="authStore.hasPermission(PERMISSIONS.SYSTEM_MONITORING)" class="admin-section">
      <h2>系统监控</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>活跃用户</h3>
          <p>{{ stats.activeUsers || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>待审核</h3>
          <p>{{ stats.pendingApprovals || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>系统状态</h3>
          <p>{{ stats.systemStatus || '正常' }}</p>
        </div>
      </div>
    </section>

    <!-- API 管理 -->
    <section v-if="authStore.hasPermission(PERMISSIONS.API_MANAGEMENT)" class="admin-section">
      <h2>API 管理</h2>
      <div class="api-controls">
        <button @click="refreshCache" :disabled="isLoading">刷新缓存</button>
        <button @click="checkSystem" :disabled="isLoading">系统检查</button>
      </div>
    </section>

    <!-- 用户管理 -->
    <section v-if="authStore.hasPermission(PERMISSIONS.USER_MANAGEMENT)" class="admin-section">
      <h2>用户管理</h2>
      <div class="user-management">
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="搜索用户...">
          <select v-model="filterStatus">
            <option value="">所有状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const { PERMISSIONS } = authStore

// 状态管理
const isLoading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('')
const stats = reactive({
  activeUsers: 0,
  pendingApprovals: 0,
  systemStatus: '正常'
})

// 方法
const refreshCache = async () => {
  if (isLoading.value) return
  isLoading.value = true
  try {
    await fetch('/.netlify/functions/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh' })
    })
    // 更新状态显示
    stats.systemStatus = '缓存已刷新'
  } catch (error) {
    console.error('刷新缓存失败:', error)
  } finally {
    isLoading.value = false
  }
}

const checkSystem = async () => {
  if (isLoading.value) return
  isLoading.value = true
  try {
    // 这里可以添加系统检查的具体实现
    stats.systemStatus = '检查完成'
  } catch (error) {
    console.error('系统检查失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 生命周期钩子
onMounted(async () => {
  // 加载初始数据
  try {
    const response = await fetch('/.netlify/functions/admin-stats')
    const data = await response.json()
    Object.assign(stats, data)
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
})
</script>

<style scoped>
.admin {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.admin-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: #f8fafc;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.stat-card h3 {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.stat-card p {
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.api-controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.api-controls button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.api-controls button:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.api-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-management {
  margin-top: 15px;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-bar input,
.search-bar select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
}

.search-bar input {
  flex: 1;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .search-bar {
    flex-direction: column;
  }
}
</style>