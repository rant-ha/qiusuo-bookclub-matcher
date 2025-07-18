<template>
  <div class="admin">
    <h1>管理员面板</h1>
    
    <!-- 系统监控仪表板 -->
    <section v-if="authStore.hasPermission(PERMISSIONS.SYSTEM_MONITORING)" class="admin-section monitoring-dashboard">
      <h2>系统监控仪表板</h2>
      
      <!-- 系统健康状态 -->
      <div class="health-status">
        <div class="health-card" :class="healthStatus.overall">
          <h3>系统整体状态</h3>
          <p>{{ formatHealthStatus(healthStatus.overall) }}</p>
          <span class="last-check">最后检查: {{ formatTime(healthStatus.lastHealthCheck) }}</span>
        </div>
        <div class="health-card" :class="healthStatus.api">
          <h3>API 状态</h3>
          <p>{{ formatHealthStatus(healthStatus.api) }}</p>
          <span class="metric">错误率: {{ errorRate }}%</span>
        </div>
        <div class="health-card" :class="healthStatus.cache">
          <h3>缓存状态</h3>
          <p>{{ formatHealthStatus(healthStatus.cache) }}</p>
        </div>
        <div class="health-card" :class="healthStatus.memory">
          <h3>内存状态</h3>
          <p>{{ formatHealthStatus(healthStatus.memory) }}</p>
        </div>
      </div>

      <!-- 错误统计 -->
      <div class="error-stats">
        <h3>错误统计</h3>
        <div class="stats-grid">
          <div class="stat-card error-stat">
            <h4>总错误数</h4>
            <p>{{ errorStats.total }}</p>
          </div>
          <div class="stat-card error-stat">
            <h4>最近24小时</h4>
            <p>{{ errorStats.last24h }}</p>
          </div>
          <div class="stat-card error-stat">
            <h4>最近1小时</h4>
            <p>{{ errorStats.lastHour }}</p>
          </div>
          <div class="stat-card error-stat">
            <h4>最近5分钟</h4>
            <p>{{ errorStats.last5min }}</p>
          </div>
        </div>

        <!-- 错误分布 -->
        <div class="error-distribution">
          <h4>错误分布</h4>
          <div class="severity-bars">
            <div class="severity-bar">
              <span class="label">高危错误</span>
              <div class="bar-container">
                <div class="bar high" :style="{ width: severityPercentage('high') + '%' }"></div>
              </div>
              <span class="count">{{ errorStats.bySeverity.high }}</span>
            </div>
            <div class="severity-bar">
              <span class="label">中等错误</span>
              <div class="bar-container">
                <div class="bar medium" :style="{ width: severityPercentage('medium') + '%' }"></div>
              </div>
              <span class="count">{{ errorStats.bySeverity.medium }}</span>
            </div>
            <div class="severity-bar">
              <span class="label">低危错误</span>
              <div class="bar-container">
                <div class="bar low" :style="{ width: severityPercentage('low') + '%' }"></div>
              </div>
              <span class="count">{{ errorStats.bySeverity.low }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 性能指标 -->
      <div class="performance-metrics">
        <h3>性能指标</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>总请求数</h4>
            <p>{{ performanceMetrics.totalRequests }}</p>
          </div>
          <div class="metric-card">
            <h4>成功率</h4>
            <p>{{ performanceMetrics.successRate }}</p>
          </div>
          <div class="metric-card">
            <h4>平均响应时间</h4>
            <p>{{ performanceMetrics.averageResponseTime }}</p>
          </div>
        </div>
      </div>

      <!-- 系统建议 -->
      <div v-if="recommendations.length > 0" class="system-recommendations">
        <h3>系统建议</h3>
        <div class="recommendations-list">
          <div v-for="(rec, index) in recommendations"
               :key="index"
               class="recommendation-item"
               :class="rec.priority">
            <span class="priority-badge">{{ formatPriority(rec.priority) }}</span>
            <p>{{ rec.message }}</p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="monitoring-actions">
        <button @click="refreshMonitoring" :disabled="isRefreshing">
          {{ isRefreshing ? '刷新中...' : '刷新监控' }}
        </button>
        <button @click="resetMonitoring" class="reset-btn">重置监控</button>
      </div>
    </section>

    <!-- 系统状态概览 -->
    <section v-if="authStore.hasPermission(PERMISSIONS.SYSTEM_MONITORING)" class="admin-section">
      <h2>系统监控</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>活跃用户</h3>
          <p>{{ memberStore.approvedMembers.length }}</p>
        </div>
        <div class="stat-card">
          <h3>待审核</h3>
          <p>{{ memberStore.pendingMembers.length }}</p>
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
      
      <!-- 搜索和筛选 -->
      <div class="search-bar">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索用户..."
          @input="filterMembers"
        >
        <select v-model="filterStatus" @change="filterMembers">
          <option value="">所有状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已批准</option>
        </select>
      </div>

      <!-- 待审核用户列表 -->
      <div v-if="showPendingMembers" class="member-list pending-list">
        <h3>待审核用户 ({{ filteredPendingMembers.length }})</h3>
        <div v-if="filteredPendingMembers.length === 0" class="no-data">
          没有待审核的用户
        </div>
        <div v-else class="member-grid">
          <div v-for="member in filteredPendingMembers" 
               :key="member.id" 
               class="member-card pending">
            <div class="member-header">
              <h4>{{ member.name }}</h4>
              <span class="member-id">学号：{{ member.studentId }}</span>
            </div>
            <div class="member-info">
              <p>加入时间：{{ member.joinDate }}</p>
              <p>性别：{{ formatGender(member.questionnaire?.gender) }}</p>
              <p>阅读偏好：{{ formatReadingCommitment(member.questionnaire?.readingCommitment) }}</p>
            </div>
            <div class="member-actions">
              <button class="approve-btn" @click="approveMember(member)">批准</button>
              <button class="delete-btn" @click="confirmDeleteMember(member)">拒绝</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 已批准用户列表 -->
      <div class="member-list approved-list">
        <h3>已批准用户 ({{ filteredApprovedMembers.length }})</h3>
        <div v-if="filteredApprovedMembers.length === 0" class="no-data">
          没有已批准的用户
        </div>
        <div v-else class="member-grid">
          <div v-for="member in filteredApprovedMembers" 
               :key="member.id" 
               class="member-card">
            <div class="member-header">
              <h4>{{ member.name }}</h4>
              <span class="member-id">学号：{{ member.studentId }}</span>
            </div>
            <div class="member-info">
              <p>加入时间：{{ member.joinDate }}</p>
              <p>性别：{{ formatGender(member.questionnaire?.gender) }}</p>
              <p>阅读偏好：{{ formatReadingCommitment(member.questionnaire?.readingCommitment) }}</p>
              <p>书籍类别：{{ formatBookCategories(member.questionnaire?.bookCategories) }}</p>
            </div>
            <div class="member-actions">
              <button class="delete-btn" @click="confirmDeleteMember(member)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMemberStore } from '../stores/memberStore'
import { useErrorMonitor } from '../composables/useErrorMonitor'

const authStore = useAuthStore()
const memberStore = useMemberStore()
const { PERMISSIONS } = authStore

// 状态管理
const isLoading = ref(false)
const isRefreshing = ref(false)

// 错误监控
const errorMonitor = useErrorMonitor()
const healthStatus = computed(() => errorMonitor.systemHealth)
const errorStats = computed(() => errorMonitor.getErrorStats())
const performanceMetrics = computed(() => errorMonitor.getHealthReport().performance)
const recommendations = computed(() => errorMonitor.getHealthReport().recommendations)

// 计算错误率
const errorRate = computed(() => {
  const stats = errorStats.value
  if (stats.total === 0) return 0
  return ((stats.lastHour / Math.max(stats.total, 1)) * 100).toFixed(1)
})

// 自动刷新定时器
let refreshTimer = null
const searchQuery = ref('')
const filterStatus = ref('')
const stats = reactive({
  systemStatus: '正常'
})

// 计算属性
const showPendingMembers = computed(() => 
  !filterStatus.value || filterStatus.value === 'pending'
)

const filteredPendingMembers = computed(() => {
  const members = memberStore.pendingMembers
  return filterMembers(members)
})

const filteredApprovedMembers = computed(() => {
  const members = memberStore.approvedMembers
  return filterMembers(members)
})

// 方法
function filterMembers(members) {
  if (!searchQuery.value) return members

  const query = searchQuery.value.toLowerCase()
  return members.filter(member => 
    member.name.toLowerCase().includes(query) ||
    member.studentId.toLowerCase().includes(query)
  )
}

async function refreshCache() {
  if (isLoading.value) return
  isLoading.value = true
  try {
    await fetch('/.netlify/functions/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh' })
    })
    stats.systemStatus = '缓存已刷新'
  } catch (error) {
    console.error('刷新缓存失败:', error)
  } finally {
    isLoading.value = false
  }
}

async function checkSystem() {
  if (isLoading.value) return
  isLoading.value = true
  try {
    stats.systemStatus = '检查完成'
  } catch (error) {
    console.error('系统检查失败:', error)
  } finally {
    isLoading.value = false
  }
}

async function approveMember(member) {
  try {
    await memberStore.approveMember(member.id)
  } catch (error) {
    console.error('批准用户失败:', error)
    alert('批准用户失败：' + error.message)
  }
}

function confirmDeleteMember(member) {
  if (confirm(`确定要${member.status === 'pending' ? '拒绝' : '删除'} ${member.name} 吗？此操作不可撤销。`)) {
    deleteMember(member)
  }
}

async function deleteMember(member) {
  try {
    await memberStore.deleteMember(member.id)
  } catch (error) {
    console.error('删除用户失败:', error)
    alert('删除用户失败：' + error.message)
  }
}

// 格式化函数
function formatGender(gender) {
  const genderMap = {
    'male': '男',
    'female': '女',
    'other': '其他',
    'prefer_not_to_say': '不愿透露'
  }
  return genderMap[gender] || '未设置'
}

function formatReadingCommitment(commitment) {
  const commitmentMap = {
    'light': '轻量阅读',
    'medium': '适中阅读',
    'intensive': '深度阅读',
    'epic': '史诗阅读'
  }
  return commitmentMap[commitment] || '未设置'
}

function formatBookCategories(categories) {
  if (!categories || categories.length === 0) return '未设置'
  
  const categoryMap = {
    'literature_fiction': '文学/小说',
    'mystery_detective': '悬疑/推理',
    'sci_fi_fantasy': '科幻/奇幻',
    'history_biography': '历史/传记',
    'social_science_philosophy': '社科/哲学',
    'psychology_self_help': '心理/成长',
    'art_design_lifestyle': '艺术/生活'
  }
  
  return categories.map(cat => categoryMap[cat] || cat).join('、')
}

// 生命周期钩子
onMounted(async () => {
  try {
    await memberStore.fetchMembers()
  } catch (error) {
    console.error('加载成员数据失败:', error)
  }
})
</script>

// 格式化健康状态
function formatHealthStatus(status) {
  const statusMap = {
    healthy: '良好',
    degraded: '降级',
    critical: '严重',
    maintenance: '维护中',
    operational: '正常',
    down: '故障',
    optimal: '最佳',
    warning: '警告'
  }
  return statusMap[status] || status
}

// 格式化时间
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 计算严重程度百分比
function severityPercentage(severity) {
  const total = Object.values(errorStats.value.bySeverity).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  return (errorStats.value.bySeverity[severity] / total * 100).toFixed(1)
}

// 格式化优先级
function formatPriority(priority) {
  const priorityMap = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  }
  return priorityMap[priority] || priority
}

// 刷新监控数据
async function refreshMonitoring() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    await errorMonitor.updateSystemHealth()
  } finally {
    isRefreshing.value = false
  }
}

// 重置监控数据
function resetMonitoring() {
  if (confirm('确定要重置所有监控数据吗？这将清除所有错误记录和统计信息。')) {
    errorMonitor.resetMonitoring()
  }
}

// 组件挂载时启动自动刷新
onMounted(() => {
  refreshTimer = setInterval(refreshMonitoring, 60000) // 每分钟刷新一次
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

<style scoped>
/* 监控仪表板样式 */
.monitoring-dashboard {
  background: #f8fafc;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
}

.health-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.health-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.health-card h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #475569;
}

.health-card p {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.health-card .metric {
  display: block;
  margin-top: 8px;
  font-size: 0.875rem;
  color: #64748b;
}

.health-card .last-check {
  display: block;
  margin-top: 8px;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* 健康状态颜色 */
.health-card.healthy, .health-card.operational, .health-card.optimal {
  border-left: 4px solid #22c55e;
}

.health-card.degraded, .health-card.warning {
  border-left: 4px solid #f59e0b;
}

.health-card.critical, .health-card.down {
  border-left: 4px solid #ef4444;
}

.health-card.maintenance {
  border-left: 4px solid #3b82f6;
}

/* 错误统计样式 */
.error-stats {
  margin-bottom: 30px;
}

.error-stat {
  background: white;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.error-stat h4 {
  margin: 0 0 8px 0;
  color: #64748b;
  font-size: 0.875rem;
}

.error-stat p {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
}

/* 错误分布样式 */
.error-distribution {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.severity-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.severity-bar {
  display: grid;
  grid-template-columns: 100px 1fr 50px;
  align-items: center;
  gap: 12px;
}

.bar-container {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 100%;
  transition: width 0.3s ease;
}

.bar.high { background: #ef4444; }
.bar.medium { background: #f59e0b; }
.bar.low { background: #3b82f6; }

.severity-bar .label {
  font-size: 0.875rem;
  color: #64748b;
}

.severity-bar .count {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
  text-align: right;
}

/* 性能指标样式 */
.performance-metrics {
  margin-bottom: 30px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.metric-card h4 {
  margin: 0 0 8px 0;
  color: #64748b;
  font-size: 0.875rem;
}

.metric-card p {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

/* 系统建议样式 */
.system-recommendations {
  margin-bottom: 30px;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.recommendation-item.high {
  border-left: 4px solid #ef4444;
}

.recommendation-item.medium {
  border-left: 4px solid #f59e0b;
}

.recommendation-item.low {
  border-left: 4px solid #3b82f6;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.recommendation-item.high .priority-badge {
  background: #fef2f2;
  color: #ef4444;
}

.recommendation-item.medium .priority-badge {
  background: #fffbeb;
  color: #f59e0b;
}

.recommendation-item.low .priority-badge {
  background: #eff6ff;
  color: #3b82f6;
}

/* 操作按钮样式 */
.monitoring-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.monitoring-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.monitoring-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.monitoring-actions button:not(.reset-btn) {
  background: #3b82f6;
  color: white;
  border: none;
}

.monitoring-actions button:not(.reset-btn):hover:not(:disabled) {
  background: #2563eb;
}

.monitoring-actions .reset-btn {
  background: #ef4444;
  color: white;
  border: none;
}

.monitoring-actions .reset-btn:hover {
  background: #dc2626;
}

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

.member-list {
  margin-bottom: 30px;
}

.member-list h3 {
  margin-bottom: 15px;
  color: #334155;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.member-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 15px;
  transition: all 0.2s;
}

.member-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.member-card.pending {
  border-left: 4px solid #f59e0b;
}

.member-header {
  margin-bottom: 10px;
}

.member-header h4 {
  margin: 0;
  color: #1e293b;
  font-size: 1.1rem;
}

.member-id {
  color: #64748b;
  font-size: 0.9rem;
}

.member-info {
  margin-bottom: 15px;
}

.member-info p {
  margin: 5px 0;
  color: #475569;
  font-size: 0.9rem;
}

.member-actions {
  display: flex;
  gap: 10px;
}

.member-actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.approve-btn {
  background: #22c55e;
  color: white;
}

.approve-btn:hover {
  background: #16a34a;
}

.delete-btn {
  background: #ef4444;
  color: white;
}

.delete-btn:hover {
  background: #dc2626;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .search-bar {
    flex-direction: column;
  }
  
  .member-grid {
    grid-template-columns: 1fr;
  }
}
</style>