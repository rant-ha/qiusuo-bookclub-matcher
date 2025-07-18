<template>
  <div class="match-view">
    <h1>读书搭档匹配</h1>
    
    <!-- 匹配按钮区域 -->
    <div class="match-buttons">
      <BaseButton
        variant="primary"
        @click="handleSimilarMatch"
        :loading="isLoading"
        :disabled="isLoading"
      >
        🎯 寻找相似搭档
      </BaseButton>
      <BaseButton
        variant="secondary"
        @click="handleComplementaryMatch"
        :loading="isLoading"
        :disabled="isLoading"
      >
        🌱 寻找互补搭档
      </BaseButton>
    </div>

    <!-- 加载指示器 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-indicator">
        <div class="spinner"></div>
        <div class="loading-text">{{ loadingText }}</div>
      </div>
      
      <!-- 进度条 -->
      <div v-if="progress.total > 0" class="progress-container">
        <div 
          class="progress-bar"
          :style="{ width: `${(progress.current / progress.total * 100)}%` }"
        ></div>
        <div class="progress-text">
          {{ progress.text }}
          <span v-if="progress.total > 0">
            ({{ progress.current }}/{{ progress.total }})
          </span>
        </div>
        <div v-if="progress.estimatedTime" class="estimated-time">
          预计剩余时间: {{ progress.estimatedTime }}
        </div>
      </div>
    </div>

    <!-- 匹配结果区域 -->
    <div v-if="!isLoading && matches.length > 0" class="match-results">
      <div class="results-header">
        <h2>{{ resultTitle }}</h2>
        <div v-if="resultSubtitle" class="results-subtitle">
          {{ resultSubtitle }}
        </div>
      </div>

      <!-- 匹配列表 -->
      <div class="matches-list">
        <BaseCard
          v-for="(match, index) in matches"
          :key="index"
          :class="getMatchItemClass(match)"
        >
          <template #default>
            <h3>
              匹配 {{ index + 1 }}
              {{ generateMatchIcon(match.score) }}
              <BaseTag
                v-for="(tag, tagIndex) in generateMatchStatusTags(match)"
                :key="tagIndex"
                :type="tag.type"
              >
                {{ tag.text }}
              </BaseTag>
            </h3>

            <!-- 匹配分数 -->
            <div class="match-score" v-html="generateMatchScoreHtml(match)"></div>

            <!-- 用户信息 -->
            <div class="match-details">
              <div class="person-info">
                <h4>{{ match.member1.name }}</h4>
                <div>兴趣：{{ formatList(match.member1.hobbies) }}</div>
                <div>最近读的书：{{ formatList(match.member1.books.slice(0, 2)) }}</div>
              </div>
              
              <div class="person-info">
                <h4>{{ match.member2.name }}</h4>
                <div>兴趣：{{ formatList(match.member2.hobbies) }}</div>
                <div>最近读的书：{{ formatList(match.member2.books.slice(0, 2)) }}</div>
              </div>
            </div>

            <!-- 匹配详情 -->
            <div v-html="generateMatchDetails(match)"></div>

            <!-- 降级信息 -->
            <div v-if="match.degraded || match.healthDegraded"
                 v-html="generateDegradationInfo(match)">
            </div>
          </template>
        </BaseCard>
      </div>
    </div>

    <!-- 无匹配结果提示 -->
    <div v-if="!isLoading && matches.length === 0 && hasAttemptedMatch" 
         class="no-matches">
      没有找到合适的匹配
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseTag from '@/components/base/BaseTag.vue'

export default {
  name: 'MatchView',
  components: {
    BaseButton,
    BaseCard,
    BaseTag
  },
  
  setup() {
    const authStore = useAuthStore()
    
    // 状态
    const isLoading = ref(false)
    const matches = ref([])
    const progress = ref({
      current: 0,
      total: 0,
      text: '',
      estimatedTime: ''
    })
    const loadingText = ref('')
    const resultTitle = ref('')
    const resultSubtitle = ref('')
    const matchStore = ref(null)

    // 初始化 match store
    const initMatchStore = async () => {
      const { useMatchStore } = await import('@/stores/match')
      matchStore.value = useMatchStore()
      const store = matchStore.value
      
      // 同步状态
      isLoading.value = store.isLoading
      matches.value = store.matches
      progress.value = store.progress
      loadingText.value = store.loadingText
      resultTitle.value = store.resultTitle
      resultSubtitle.value = store.resultSubtitle

      // 监听状态变化
      store.$subscribe((mutation, state) => {
        isLoading.value = state.isLoading
        matches.value = state.matches
        progress.value = state.progress
        loadingText.value = state.loadingText
        resultTitle.value = state.resultTitle
        resultSubtitle.value = state.resultSubtitle
      })
    }

    onMounted(() => {
      initMatchStore()
    })

    const hasAttemptedMatch = ref(false)

    // 处理相似匹配
    const handleSimilarMatch = async () => {
      if (!matchStore.value) {
        await initMatchStore()
      }
      hasAttemptedMatch.value = true
      await matchStore.value.findSimilarMatches()
    }

    // 处理互补匹配
    const handleComplementaryMatch = async () => {
      if (!matchStore.value) {
        await initMatchStore()
      }
      hasAttemptedMatch.value = true
      await matchStore.value.findComplementaryMatches()
    }

    // 格式化列表
    const formatList = (list) => {
      if (!list || list.length === 0) return '未填写'
      return list.join('、')
    }

    // 生成匹配图标
    const generateMatchIcon = (score) => {
      if (score >= 3) return '🔥'
      if (score >= 2) return '⭐'
      if (score >= 1) return '✨'
      return '💫'
    }

    // 获取匹配项样式类
    const getMatchItemClass = (match) => {
      const classes = []
      if (match.degraded) {
        classes.push('degraded-match')
      } else if (match.traditionalMode || match.healthDegraded) {
        classes.push('traditional-match')
      }
      return classes.join(' ')
    }

    // 生成匹配状态标签
    const generateMatchStatusTags = (match) => {
      const tags = []
      
      if (match.degraded) {
        tags.push({ text: 'AI降级→传统', type: 'warning' })
      } else if (match.healthDegraded) {
        tags.push({ text: '传统(降级)', type: 'warning' })
      } else if (match.traditionalMode) {
        tags.push({ text: '传统算法', type: 'muted' })
      } else if (match.aiAnalysis) {
        tags.push({ text: 'AI智能', type: 'info' })
        if (match.confidenceLevel) {
          tags.push({
            text: `置信度: ${(match.confidenceLevel * 100).toFixed(0)}%`,
            type: 'primary'
          })
        }
      }

      return tags
    }

    // 生成匹配分数HTML
    const generateMatchScoreHtml = (match) => {
      const score = match.score
      const scoreText = score.toFixed(1)

      if (match.type === 'similar') {
        const breakdown = [
          `<base-tag type="success">精确 ${match.detailLevel.exactMatches}</base-tag>`,
          `<base-tag type="info">语义 ${match.detailLevel.semanticMatches}</base-tag>`,
          `<base-tag type="primary">类别 ${match.detailLevel.categoryMatches}</base-tag>`
        ]
        
        const enhancedTags = []
        if (match.readingCommitmentCompatibility) {
          enhancedTags.push(
            `<base-tag type="warning">阅读承诺 ${(match.readingCommitmentCompatibility.score * 0.8).toFixed(1)}分</base-tag>`
          )
        }
        if (match.textPreferenceAnalysis?.similarity_score > 0) {
          enhancedTags.push(
            `<base-tag type="info">AI分析 ${(match.textPreferenceAnalysis.similarity_score * 1.5).toFixed(1)}分</base-tag>`
          )
        }
        
        return `
          <div class="match-score">
            <div class="score-main">智能相似度：${scoreText} 分</div>
            <div class="score-breakdown">
              <div class="breakdown-group">${breakdown.join('')}</div>
              ${enhancedTags.length > 0 ? `<div class="breakdown-group">${enhancedTags.join('')}</div>` : ''}
            </div>
          </div>`
      } else {
        let type, description
        if (score <= 1.0) {
          type = 'danger'
          description = `差异度：高 (仅 ${scoreText} 分共同点)`
        } else if (score > 1.0 && score < 2.5) {
          type = 'warning'
          description = `差异度：中 (有 ${scoreText} 分共同点)`
        } else {
          type = 'success'
          description = `差异度：低 (高达 ${scoreText} 分共同点)`
        }
        
        return `
          <div class="match-score">
            <div class="score-main">${description}</div>
            <div class="score-breakdown">
              <base-tag type="${type}">
                ${score <= 1.0 ? '极具互补潜力' : score < 2.5 ? '可共同探索' : '更像相似搭档'}
              </base-tag>
            </div>
          </div>`
      }
    }

    // 生成匹配详情
    const generateMatchDetails = (match) => {
      let detailsHtml = ''
      
      // 兴趣爱好匹配详情
      if (match.commonHobbies?.length > 0) {
        detailsHtml += `
          <div class="common-interests">
            <h4>🎯 兴趣爱好匹配</h4>
            ${categorizeMatches(match.commonHobbies)}
          </div>
        `
      }
      
      // 书籍匹配详情
      if (match.commonBooks?.length > 0) {
        detailsHtml += `
          <div class="common-interests">
            <h4>📚 书籍阅读匹配</h4>
            ${categorizeMatches(match.commonBooks)}
          </div>
        `
      }

      // AI分析结果
      if (match.aiAnalysis) {
        const analysis = match.aiAnalysis
        detailsHtml += `
          <div class="common-interests ai-analysis">
            <h4>🤖 AI深度匹配分析</h4>
            <div class="match-summary">
              <p><strong>匹配类型：</strong>${analysis.match_type}</p>
              <p><strong>分析总结：</strong>${analysis.summary}</p>
            </div>
            
            ${analysis.detailed_analysis ? `
              <div class="analysis-dimensions">
                <div class="dimension-score">
                  <span>相似性：</span>
                  <span class="score">${(analysis.detailed_analysis.similarity_score || 0).toFixed(1)}/10</span>
                </div>
                <div class="dimension-score">
                  <span>互补性：</span>
                  <span class="score">${(analysis.detailed_analysis.complementarity_score || 0).toFixed(1)}/10</span>
                </div>
                <div class="dimension-score">
                  <span>兼容性：</span>
                  <span class="score">${(analysis.detailed_analysis.compatibility_score || 0).toFixed(1)}/10</span>
                </div>
              </div>
            ` : ''}
          </div>
        `
      }

      return detailsHtml
    }

    // 生成降级信息
    const generateDegradationInfo = (match) => {
      if (!match.degraded && !match.degradationReason && !match.healthDegraded) {
        return ''
      }
      
      let degradationHtml = `
        <div class="common-interests degradation-info">
          <h4>⚠️ 降级处理信息</h4>
      `
      
      if (match.degraded) {
        degradationHtml += `
          <div class="match-type-group">
            <span class="match-type-label">降级原因：</span>
            <base-tag type="warning">${match.degradationReason || 'AI服务异常'}</base-tag>
          </div>
          <div class="match-type-group">
            <span class="match-type-label">处理方式：</span>
            <base-tag type="info">自动切换到传统匹配算法</base-tag>
          </div>
        `
      }
      
      degradationHtml += `
        <div class="degradation-note">
          💡 降级模式确保服务连续性，算法会在条件恢复后自动切换回AI模式
        </div>
      </div>
      `
      
      return degradationHtml
    }

    // 分类显示匹配项
    const categorizeMatches = (matches) => {
      const exact = matches.filter(m => m.type === 'exact')
      const semantic = matches.filter(m => m.type === 'semantic')
      const category = matches.filter(m => m.type === 'category')
      
      let html = ''
      
      if (exact.length > 0) {
        html += `
          <div class="match-type-group">
            <span class="match-type-label">✅ 完全一致：</span>
            ${exact.map(m => `
              <base-tag type="success">${m.item}</base-tag>
            `).join('')}
          </div>
        `
      }
      
      if (semantic.length > 0) {
        html += `
          <div class="match-type-group">
            <span class="match-type-label">🔗 AI语义相关：</span>
            ${semantic.map(m => `
              <base-tag type="info">${m.item}</base-tag>
            `).join('')}
          </div>
        `
      }
      
      if (category.length > 0) {
        html += `
          <div class="match-type-group">
            <span class="match-type-label">📂 同类兴趣：</span>
            ${category.map(m => `
              <base-tag type="primary" title="${m.details || ''}">${m.item}</base-tag>
            `).join('')}
          </div>
        `
      }
      
      return html
    }

    return {
      isLoading,
      matches,
      progress,
      loadingText,
      resultTitle,
      resultSubtitle,
      hasAttemptedMatch,
      handleSimilarMatch,
      handleComplementaryMatch,
      formatList,
      generateMatchIcon,
      getMatchItemClass,
      generateMatchStatusTags,
      generateMatchScoreHtml,
      generateMatchDetails,
      generateDegradationInfo
    }
  }
}
</script>

<style scoped>
.match-view {
  max-width: var(--max-width-xl);
  margin: 0 auto;
  padding: var(--spacing-6);
}

.match-buttons {
  display: flex;
  gap: var(--spacing-4);
  margin: var(--spacing-6) 0;
  justify-content: center;
}

.loading-container {
  margin: var(--spacing-10) 0;
  text-align: center;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-muted);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-container {
  margin-top: var(--spacing-6);
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.progress-bar {
  height: 6px;
  background: var(--color-success);
  border-radius: var(--border-radius-full);
  transition: width var(--transition-normal);
}

.progress-text {
  margin-top: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.estimated-time {
  margin-top: var(--spacing-1);
  font-size: var(--font-size-xs);
  color: var(--text-light);
}

.match-results {
  margin-top: var(--spacing-10);
}

.results-header {
  margin-bottom: var(--spacing-6);
  text-align: center;
}

.results-subtitle {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-2);
}

.matches-list {
  display: grid;
  gap: var(--spacing-6);
  padding: var(--spacing-2);
}

@media (min-width: 768px) {
  .matches-list {
    grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
  }
}

@media (max-width: 767px) {
  .match-details {
    grid-template-columns: 1fr;
  }
  
  .score-breakdown {
    overflow-x: auto;
    padding-bottom: var(--spacing-2);
  }
  
  .breakdown-group {
    flex-wrap: nowrap;
    padding: var(--spacing-1);
  }
}

.match-score {
  margin: var(--spacing-4) 0;
}

.score-main {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-2);
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.breakdown-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  align-items: center;
}

.match-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  margin: var(--spacing-4) 0;
}

.person-info {
  background: var(--glass-bg);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--glass-border);
}

.person-info h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-3);
  color: var(--text-primary);
}

.common-interests {
  margin-top: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--glass-bg);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--glass-border);
}

.match-type-group {
  margin: var(--spacing-2) 0;
}

.match-type-label {
  font-weight: var(--font-weight-medium);
  margin-right: var(--spacing-2);
}

.degraded-match {
  position: relative;
}

.degraded-match::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-warning);
  border-radius: var(--border-radius-sm);
}

.traditional-match {
  position: relative;
}

.traditional-match::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-muted);
  border-radius: var(--border-radius-sm);
}

.no-matches {
  text-align: center;
  padding: var(--spacing-10);
  color: var(--text-muted);
  font-size: var(--font-size-base);
}

/* AI分析相关样式 */
.ai-analysis {
  border-left: 4px solid var(--color-info);
}

.analysis-dimensions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-3);
  margin-top: var(--spacing-3);
}

.dimension-score {
  background: var(--glass-bg);
  padding: var(--spacing-2);
  border-radius: var(--border-radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--glass-border);
}

.score {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

/* 降级信息样式 */
.degradation-info {
  background: var(--glass-bg);
  border-left: 5px solid var(--color-warning);
}

.degradation-note {
  margin-top: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-warning);
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(255, 152, 0, 0.1);
  border-radius: var(--border-radius-sm);
}

/* 互补匹配特殊样式 */
.complementary-high {
  color: var(--color-danger);
  font-weight: var(--font-weight-medium);
}

.complementary-medium {
  color: var(--color-warning);
  font-weight: var(--font-weight-medium);
}

.complementary-low {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}
</style>