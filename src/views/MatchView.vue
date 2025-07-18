<template>
  <div class="match-view">
    <h1>读书搭档匹配</h1>
    
    <!-- 匹配按钮区域 -->
    <div class="match-buttons">
      <button 
        class="match-btn similar-btn"
        @click="handleSimilarMatch"
        :disabled="isLoading"
      >
        🎯 寻找相似搭档
      </button>
      <button 
        class="match-btn complementary-btn"
        @click="handleComplementaryMatch"
        :disabled="isLoading"
      >
        🌱 寻找互补搭档
      </button>
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
        <div 
          v-for="(match, index) in matches" 
          :key="index"
          class="match-item"
          :class="getMatchItemClass(match)"
        >
          <h3>
            匹配 {{ index + 1 }} 
            {{ generateMatchIcon(match.score) }}
            <span 
              v-for="(tag, tagIndex) in generateMatchStatusTags(match)"
              :key="tagIndex"
              v-html="tag"
            ></span>
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
        </div>
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

export default {
  name: 'MatchView',
  
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
      const classes = ['match-item']
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
        tags.push('<span class="tag degraded-tag">AI降级→传统</span>')
      } else if (match.healthDegraded) {
        tags.push('<span class="tag traditional-degraded-tag">传统(降级)</span>')
      } else if (match.traditionalMode) {
        tags.push('<span class="tag category-tag">传统算法</span>')
      } else if (match.aiAnalysis) {
        tags.push('<span class="tag ai-analysis-tag">AI智能</span>')
        if (match.confidenceLevel) {
          tags.push(`<span class="tag score-tag">置信度: ${(match.confidenceLevel * 100).toFixed(0)}%</span>`)
        }
      }

      return tags
    }

    // 生成匹配分数HTML
    const generateMatchScoreHtml = (match) => {
      const score = match.score
      const scoreText = score.toFixed(1)

      if (match.type === 'similar') {
        const breakdown = `(精确${match.detailLevel.exactMatches} + 语义${match.detailLevel.semanticMatches} + 类别${match.detailLevel.categoryMatches})`
        
        let enhancedBreakdown = ''
        if (match.readingCommitmentCompatibility) {
          enhancedBreakdown += ` | 阅读承诺: ${(match.readingCommitmentCompatibility.score * 0.8).toFixed(1)}分`
        }
        if (match.textPreferenceAnalysis?.similarity_score > 0) {
          enhancedBreakdown += ` | AI文本分析: ${(match.textPreferenceAnalysis.similarity_score * 1.5).toFixed(1)}分`
        }
        
        return `
          <div class="match-score">
            智能相似度：${scoreText} 分
            <span class="match-breakdown">${breakdown}${enhancedBreakdown}</span>
          </div>`
      } else {
        let description = ''
        if (score <= 1.0) {
          description = `差异度：高 (仅 ${scoreText} 分共同点)，<span class="complementary-high">极具互补潜力</span>`
        } else if (score > 1.0 && score < 2.5) {
          description = `差异度：中 (有 ${scoreText} 分共同点)，<span class="complementary-medium">可共同探索</span>`
        } else {
          description = `差异度：低 (高达 ${scoreText} 分共同点)，<span class="complementary-low">更像相似搭档</span>`
        }
        return `<div class="match-score">${description}</div>`
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
            <span class="tag degraded-tag">${match.degradationReason || 'AI服务异常'}</span>
          </div>
          <div class="match-type-group">
            <span class="match-type-label">处理方式：</span>
            <span class="tag ai-element-tag">自动切换到传统匹配算法</span>
          </div>
        `
      }
      
      degradationHtml += `
        <div style="margin-top: 8px; font-size: 12px; color: #ef6c00;">
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
            ${exact.map(m => `<span class="tag exact-tag">${m.item}</span>`).join('')}
          </div>
        `
      }
      
      if (semantic.length > 0) {
        html += `
          <div class="match-type-group">
            <span class="match-type-label">🔗 AI语义相关：</span>
            ${semantic.map(m => `<span class="tag semantic-tag">${m.item}</span>`).join('')}
          </div>
        `
      }
      
      if (category.length > 0) {
        html += `
          <div class="match-type-group">
            <span class="match-type-label">📂 同类兴趣：</span>
            ${category.map(m => `
              <span class="tag category-tag" title="${m.details || ''}">${m.item}</span>
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.match-buttons {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  justify-content: center;
}

.match-btn {
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.match-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.similar-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.complementary-btn {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
}

.loading-container {
  margin: 40px 0;
  text-align: center;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-container {
  margin-top: 20px;
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.progress-bar {
  height: 6px;
  background: #4CAF50;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.estimated-time {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.match-results {
  margin-top: 40px;
}

.results-header {
  margin-bottom: 20px;
  text-align: center;
}

.results-subtitle {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.matches-list {
  display: grid;
  gap: 20px;
}

.match-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.match-item h3 {
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-score {
  margin: 10px 0;
  font-size: 16px;
  color: #2c3e50;
}

.match-breakdown {
  font-size: 14px;
  color: #666;
}

.match-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 15px 0;
}

.person-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.person-info h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.common-interests {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.match-type-group {
  margin: 8px 0;
}

.match-type-label {
  font-weight: 500;
  margin-right: 8px;
}

.tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 2px;
  font-size: 12px;
}

.exact-tag {
  background: #e3f2fd;
  color: #1976d2;
}

.semantic-tag {
  background: #f3e5f5;
  color: #7b1fa2;
}

.category-tag {
  background: #e8f5e9;
  color: #388e3c;
}

.degraded-tag {
  background: #fff3e0;
  color: #f57c00;
}

.ai-analysis-tag {
  background: #e1f5fe;
  color: #0288d1;
}

.score-tag {
  background: #f5f5f5;
  color: #616161;
}

.degraded-match {
  border-left: 4px solid #ff9800;
}

.traditional-match {
  border-left: 4px solid #9e9e9e;
}

.no-matches {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

/* AI分析相关样式 */
.ai-analysis {
  border-left: 4px solid #2196f3;
}

.analysis-dimensions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.dimension-score {
  background: white;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score {
  font-weight: 500;
  color: #2196f3;
}

/* 降级信息样式 */
.degradation-info {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-left: 5px solid #ff9800;
}

/* 互补匹配特殊样式 */
.complementary-high {
  color: #d32f2f;
  font-weight: 500;
}

.complementary-medium {
  color: #f57c00;
  font-weight: 500;
}

.complementary-low {
  color: #388e3c;
  font-weight: 500;
}
</style>