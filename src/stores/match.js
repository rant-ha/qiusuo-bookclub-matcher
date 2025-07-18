import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useApiHealth } from '../composables/useApiHealth'
import { useAdvancedCache } from '../composables/useAdvancedCache'
import {
  getAIMatchingAnalysis,
  getAiTextPreferenceAnalysis,
  getReadingPersonalityProfile,
  getImplicitPreferenceAnalysis,
  getDeepCompatibilityAnalysis
} from '../services/aiService'

// 内存使用优化配置
const MEMORY_CONFIG = {
  CHUNK_SIZE: 50,              // 每个处理块的大小
  GC_INTERVAL: 10 * 60 * 1000, // 垃圾回收间隔（10分钟）
}

// 创建用户的轻量级引用
function createLightweightUserRef(user) {
  return {
    id: user.id,
    name: user.name,
    studentId: user.studentId,
    status: user.status,
    // 只保留必要的问卷数据引用
    questionnaire: user.questionnaire ? {
      gender: user.questionnaire.gender,
      matchGenderPreference: user.questionnaire.matchGenderPreference,
      matchingTypePreference: user.questionnaire.matchingTypePreference,
      readingCommitment: user.questionnaire.readingCommitment,
      bookCategories: user.questionnaire.bookCategories,
      version: user.questionnaire.version
    } : null,
    // 保留传统字段的引用
    hobbies: user.hobbies,
    books: user.books,
    gender: user.gender,
    readingCommitment: user.readingCommitment,
    bookCategories: user.bookCategories,
    matchGenderPreference: user.matchGenderPreference,
    matchingTypePreference: user.matchingTypePreference
  }
}

// 检查性别偏好匹配
function checkGenderPreferenceMatch(user1, user2) {
  const user1Gender = user1.questionnaire?.gender
  const user2Gender = user2.questionnaire?.gender
  const user1Preference = user1.questionnaire?.matchGenderPreference
  const user2Preference = user2.questionnaire?.matchGenderPreference
  
  // 如果任一用户没有设置偏好，则不进行过滤
  if (!user1Preference || !user2Preference) {
    return true
  }
  
  // 如果任一用户偏好是"不介意"，则匹配
  if (user1Preference === 'no_preference' || user2Preference === 'no_preference') {
    return true
  }
  
  // 如果任一用户没有填写性别，则不进行过滤（避免排除没填性别的用户）
  if (!user1Gender || !user2Gender) {
    return true
  }
  
  // 检查双向匹配：user1希望匹配user2的性别，且user2希望匹配user1的性别
  const user1WantsUser2 = (user1Preference === user2Gender)
  const user2WantsUser1 = (user2Preference === user1Gender)
  
  return user1WantsUser2 && user2WantsUser1
}

// 计算阅读承诺兼容性
function calculateReadingCommitmentCompatibility(commitment1, commitment2) {
  if (!commitment1 || !commitment2) {
    return { score: 0, compatibility: 'unknown' }
  }

  const commitmentLevels = {
    'light': 1,      // 轻松阅读
    'medium': 2,     // 适中阅读  
    'intensive': 3,  // 深度阅读
    'epic': 4        // 史诗阅读
  }

  const level1 = commitmentLevels[commitment1]
  const level2 = commitmentLevels[commitment2]
  
  if (!level1 || !level2) {
    return { score: 0, compatibility: 'unknown' }
  }

  const difference = Math.abs(level1 - level2)
  
  switch (difference) {
    case 0:
      return { 
        score: 1.0, 
        compatibility: 'perfect',
        description: '完全一致的阅读量期望'
      }
    case 1:
      return { 
        score: 0.7, 
        compatibility: 'good',
        description: '相近的阅读量期望'
      }
    case 2:
      return { 
        score: 0.4, 
        compatibility: 'moderate',
        description: '中等程度的阅读量差异'
      }
    case 3:
      return { 
        score: 0.1, 
        compatibility: 'poor',
        description: '较大的阅读量期望差异'
      }
    default:
      return { score: 0, compatibility: 'incompatible' }
  }
}

// 预过滤配对
function preFilterPair(user1, user2) {
  // 1. 性别偏好检查
  if (!checkGenderPreferenceMatch(user1, user2)) {
    return {
      shouldMatch: false,
      reason: "性别偏好不匹配"
    }
  }
  
  // 2. 阅读承诺差异检查
  const commitment1 = user1.questionnaire?.readingCommitment
  const commitment2 = user2.questionnaire?.readingCommitment
  
  if (commitment1 && commitment2) {
    const commitmentLevels = {
      'light': 1,
      'medium': 2,
      'intensive': 3,
      'epic': 4
    }
    const level1 = commitmentLevels[commitment1]
    const level2 = commitmentLevels[commitment2]
    
    if (level1 && level2 && Math.abs(level1 - level2) >= 3) {
      return {
        shouldMatch: false,
        reason: "阅读量期望差异过大"
      }
    }
  }
  
  // 3. 匹配类型偏好冲突检查
  const pref1 = user1.questionnaire?.matchingTypePreference
  const pref2 = user2.questionnaire?.matchingTypePreference
  
  if (pref1 && pref2 && 
      pref1 !== 'no_preference' && pref2 !== 'no_preference' && 
      pref1 !== pref2) {
    return {
      shouldMatch: true,
      priority: 0.7,
      reason: "匹配类型偏好不同"
    }
  }
  
  // 4. 书籍类别兼容性检查
  const categories1 = user1.questionnaire?.bookCategories || []
  const categories2 = user2.questionnaire?.bookCategories || []
  
  if (categories1.length > 0 && categories2.length > 0) {
    const hasCommonCategory = categories1.some(cat => categories2.includes(cat))
    if (!hasCommonCategory) {
      return {
        shouldMatch: true,
        priority: 0.8,
        reason: "书籍类别无交集"
      }
    }
  }
  
  // 5. 活跃度检查
  if (user1.status !== 'approved' || user2.status !== 'approved') {
    return {
      shouldMatch: false,
      reason: "用户状态未审核"
    }
  }
  
  // 通过所有过滤条件
  return {
    shouldMatch: true,
    priority: 1.0,
    reason: "通过预过滤"
  }
}

// 分块处理函数
function chunkArray(array, chunkSize = MEMORY_CONFIG.CHUNK_SIZE) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// 睡眠函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const useMatchStore = defineStore('match', () => {
  const authStore = useAuthStore()
  const apiHealth = useApiHealth()
  const advancedCache = useAdvancedCache()
  
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

  // 计算属性
  const matchingTitle = computed(() => {
    const degradedCount = matches.value.filter(m => m.degraded).length
    const traditionalCount = matches.value.filter(m => m.traditionalMode || m.healthDegraded).length
    
    let baseTitle = matches.value[0]?.type === 'similar' ? 
      '🎯 相似搭档推荐' : '🌱 互补搭档推荐'
    let subtitle = ''
    
    if (degradedCount > 0) {
      baseTitle = `🔀 混合模式${baseTitle.substring(2)}`
      subtitle = `智能AI分析 + 传统算法降级 | ${degradedCount}/${matches.value.length} 个配对降级`
    } else if (traditionalCount === matches.value.length) {
      baseTitle = `📊 传统算法${baseTitle.substring(2)}`
      subtitle = 'AI分析已关闭，使用传统匹配算法'
    } else {
      baseTitle = `🧠 深度智能${baseTitle.substring(2)}`
      subtitle = 'AI驱动的高级语义分析匹配'
    }
    
    return { title: baseTitle, subtitle }
  })

  // 计算传统匹配分数
  async function calculateTraditionalScore(user1, user2, type = 'similar') {
    let score = 0
    const commonHobbies = []
    const commonBooks = []
    let exactMatches = 0
    let semanticMatches = 0
    let categoryMatches = 0

    // 计算兴趣爱好匹配
    const hobbies1 = user1.questionnaire?.hobbies || []
    const hobbies2 = user2.questionnaire?.hobbies || []
    
    hobbies1.forEach(hobby1 => {
      hobbies2.forEach(hobby2 => {
        if (hobby1 === hobby2) {
          commonHobbies.push({ item: hobby1, type: 'exact' })
          exactMatches++
          score += 1.0
        }
      })
    })

    // 计算书籍匹配
    const books1 = user1.questionnaire?.books || []
    const books2 = user2.questionnaire?.books || []
    
    books1.forEach(book1 => {
      books2.forEach(book2 => {
        if (book1 === book2) {
          commonBooks.push({ item: book1, type: 'exact' })
          exactMatches++
          score += 1.0
        }
      })
    })

    // 计算阅读承诺兼容性
    const commitment1 = user1.questionnaire?.readingCommitment
    const commitment2 = user2.questionnaire?.readingCommitment
    const commitmentResult = calculateReadingCommitmentCompatibility(commitment1, commitment2)
    
    if (commitmentResult.score > 0) {
      score += commitmentResult.score * 0.8
    }

    // 根据匹配类型调整分数
    if (type === 'complementary') {
      // 互补匹配时，适当降低相似度的权重
      score = score * 0.7
      
      // 增加差异性得分
      const diffScore = 1 - (score / 10) // 将相似度转换为差异度
      score = diffScore * 5 // 放大差异度的影响
    }

    return {
      score: Math.min(score, 10),
      reason: type === 'similar' ? '传统相似度匹配' : '传统互补度匹配',
      commonHobbies,
      commonBooks,
      detailLevel: {
        exactMatches,
        semanticMatches,
        categoryMatches
      },
      readingCommitmentCompatibility: commitmentResult,
      traditionalMode: true
    }
  }

  // 计算AI匹配分数
  async function calculateAIScore(user1, user2, type = 'similar') {
    try {
      // 尝试从缓存获取分析结果
      const cachedResult = await advancedCache.getAIAnalysis(user1, user2)
      if (cachedResult) {
        return cachedResult
      }

      // 获取用户画像和隐含偏好分析
      const [profile1, profile2, implicit1, implicit2] = await Promise.all([
        getReadingPersonalityProfile(user1.questionnaire?.detailedBookPreferences || '', user1.questionnaire?.favoriteBooks || []),
        getReadingPersonalityProfile(user2.questionnaire?.detailedBookPreferences || '', user2.questionnaire?.favoriteBooks || []),
        getImplicitPreferenceAnalysis(user1.questionnaire?.detailedBookPreferences || '', user1.questionnaire?.favoriteBooks || [], user1.questionnaire?.bookCategories || []),
        getImplicitPreferenceAnalysis(user2.questionnaire?.detailedBookPreferences || '', user2.questionnaire?.favoriteBooks || [], user2.questionnaire?.bookCategories || [])
      ])

      // 获取深度兼容性分析
      const compatibilityAnalysis = await getDeepCompatibilityAnalysis(profile1, profile2, implicit1, implicit2)

      // 获取文本偏好分析
      const textAnalysis = await getAiTextPreferenceAnalysis(
        user1.questionnaire?.detailedBookPreferences || '',
        user2.questionnaire?.detailedBookPreferences || ''
      )

      // 根据匹配类型调整分数
      let finalScore = compatibilityAnalysis.compatibility_score
      if (type === 'complementary') {
        // 互补匹配时，增加互补性和成长潜力的权重
        finalScore = (
          compatibilityAnalysis.compatibility_dimensions.growth_potential * 0.4 +
          compatibilityAnalysis.compatibility_dimensions.exploratory_balance * 0.3 +
          compatibilityAnalysis.compatibility_score * 0.3
        )
      }

      const result = {
        score: Math.min(finalScore * 10, 10), // 转换为10分制
        reason: compatibilityAnalysis.summary,
        analysis: {
          ai_analysis: compatibilityAnalysis,
          personality_profiles: {
            member1: profile1,
            member2: profile2
          },
          implicit_analysis: {
            member1: implicit1,
            member2: implicit2
          },
          text_analysis: textAnalysis
        }
      }

      // 缓存分析结果
      await advancedCache.setAIAnalysis(user1, user2, result)

      return result
    } catch (error) {
      console.error('AI匹配分析失败:', error)
      apiHealth.recordError()
      throw error
    }
  }

  // 批量处理配对
  async function processMatchingBatch(pairs, type = 'similar') {
    const results = []
    
    for (const pair of pairs) {
      try {
        let result
        
        // 智能算法选择：优先AI，降级时使用传统算法
        if (apiHealth.shouldUseAI()) {
          try {
            result = await calculateAIScore(pair.user1, pair.user2, type)
            apiHealth.recordSuccess()
          } catch (aiError) {
            console.warn(`AI匹配失败，降级到传统算法: ${pair.user1.name} - ${pair.user2.name}`, aiError.message)
            
            // 使用传统算法作为降级策略
            result = await calculateTraditionalScore(pair.user1, pair.user2, type)
            
            // 标记为降级结果
            result.degraded = true
            result.degradationReason = aiError.message
          }
        } else {
          // 直接使用传统算法
          result = await calculateTraditionalScore(pair.user1, pair.user2, type)
          result.traditionalMode = true
          result.healthDegraded = apiHealth.degradedMode.value
        }

        if (result.score > 0) {
          results.push({
            member1: pair.user1,
            member2: pair.user2,
            score: result.score,
            reason: result.reason,
            commonHobbies: result.commonHobbies,
            commonBooks: result.commonBooks,
            detailLevel: result.detailLevel,
            readingCommitmentCompatibility: result.readingCommitmentCompatibility,
            aiAnalysis: result.analysis?.ai_analysis || null,
            personalityProfiles: result.analysis?.personality_profiles || null,
            implicitAnalysis: result.analysis?.implicit_analysis || null,
            textAnalysis: result.analysis?.text_analysis || null,
            degraded: result.degraded || false,
            degradationReason: result.degradationReason || null,
            traditionalMode: result.traditionalMode || false,
            healthDegraded: result.healthDegraded || false,
            type
          })
        }
      } catch (error) {
        console.error(`配对失败 ${pair.user1.name} - ${pair.user2.name}:`, error)
      }
    }

    return results
  }

  // 寻找相似搭档
  async function findSimilarMatches() {
    if (!authStore.isAdmin) {
      throw new Error('只有管理员可以进行匹配')
    }

    const members = authStore.approvedMembers
    if (members.length < 2) {
      throw new Error('需要至少2个成员才能进行匹配')
    }

    isLoading.value = true
    loadingText.value = '🔍 正在寻找相似搭档...'
    matches.value = []
    
    try {
      // 预过滤和优先级排序
      const pairs = []
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const filterResult = preFilterPair(members[i], members[j])
          if (filterResult.shouldMatch) {
            pairs.push({
              user1: members[i],
              user2: members[j],
              priority: filterResult.priority || 1.0
            })
          }
        }
      }
      
      // 按优先级排序
      pairs.sort((a, b) => b.priority - a.priority)
      
      // 初始化进度
      progress.value = {
        current: 0,
        total: pairs.length,
        text: '准备开始匹配分析...',
        estimatedTime: ''
      }

      const startTime = Date.now()
      const results = []
      
      // 分块处理
      const chunks = chunkArray(pairs)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        // 更新进度
        progress.value.text = `正在处理第 ${i + 1}/${chunks.length} 批配对...`
        
        // 处理当前批次
        const batchResults = await processMatchingBatch(chunk, 'similar')
        results.push(...batchResults)
        
        // 更新进度
        progress.value.current += chunk.length
        
        // 计算预估剩余时间
        const elapsed = Date.now() - startTime
        const avgTimePerPair = elapsed / progress.value.current
        const remaining = pairs.length - progress.value.current
        const estimatedRemaining = Math.round(remaining * avgTimePerPair / 1000)
        
        if (estimatedRemaining > 60) {
          progress.value.estimatedTime = `${Math.floor(estimatedRemaining / 60)}分${estimatedRemaining % 60}秒`
        } else {
          progress.value.estimatedTime = `${estimatedRemaining}秒`
        }
        
        // 批次间延迟
        if (i < chunks.length - 1) {
          await sleep(200)
        }
      }

      // 按分数排序
      results.sort((a, b) => b.score - a.score)
      
      matches.value = results
      resultTitle.value = matchingTitle.value.title
      resultSubtitle.value = matchingTitle.value.subtitle

    } catch (error) {
      console.error('匹配过程出错:', error)
      throw error
    } finally {
      isLoading.value = false
      progress.value = {
        current: 0,
        total: 0,
        text: '',
        estimatedTime: ''
      }
    }
  }

  // 寻找互补搭档
  async function findComplementaryMatches() {
    if (!authStore.isAdmin) {
      throw new Error('只有管理员可以进行匹配')
    }

    const members = authStore.approvedMembers
    if (members.length < 2) {
      throw new Error('需要至少2个成员才能进行匹配')
    }

    isLoading.value = true
    loadingText.value = '🔍 正在寻找互补搭档...'
    matches.value = []
    
    try {
      // 预过滤和优先级排序
      const pairs = []
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const filterResult = preFilterPair(members[i], members[j])
          if (filterResult.shouldMatch) {
            pairs.push({
              user1: members[i],
              user2: members[j],
              priority: filterResult.priority || 1.0
            })
          }
        }
      }
      
      // 按优先级排序
      pairs.sort((a, b) => b.priority - a.priority)
      
      // 初始化进度
      progress.value = {
        current: 0,
        total: pairs.length,
        text: '准备开始互补匹配分析...',
        estimatedTime: ''
      }

      const startTime = Date.now()
      const results = []
      
      // 分块处理
      const chunks = chunkArray(pairs)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        // 更新进度
        progress.value.text = `正在处理第 ${i + 1}/${chunks.length} 批配对...`
        
        // 处理当前批次
        const batchResults = await processMatchingBatch(chunk, 'complementary')
        results.push(...batchResults)
        
        // 更新进度
        progress.value.current += chunk.length
        
        // 计算预估剩余时间
        const elapsed = Date.now() - startTime
        const avgTimePerPair = elapsed / progress.value.current
        const remaining = pairs.length - progress.value.current
        const estimatedRemaining = Math.round(remaining * avgTimePerPair / 1000)
        
        if (estimatedRemaining > 60) {
          progress.value.estimatedTime = `${Math.floor(estimatedRemaining / 60)}分${estimatedRemaining % 60}秒`
        } else {
          progress.value.estimatedTime = `${estimatedRemaining}秒`
        }
        
        // 批次间延迟
        if (i < chunks.length - 1) {
          await sleep(200)
        }
      }

      // 互补匹配排序：根据分析模式使用不同的排序策略
      results.sort((a, b) => {
        if (a.aiAnalysis && b.aiAnalysis) {
          // AI模式：基于AI分析的匹配类型和成长潜力排序
          const aGrowthScore = (a.aiAnalysis.growth_opportunities?.length || 0) * 0.5 +
                             (a.aiAnalysis.compatibility_dimensions?.complementarity_score || 0) * 0.3 +
                             (a.aiAnalysis.confidence_level || 0) * 0.2
          const bGrowthScore = (b.aiAnalysis.growth_opportunities?.length || 0) * 0.5 +
                             (b.aiAnalysis.compatibility_dimensions?.complementarity_score || 0) * 0.3 +
                             (b.aiAnalysis.confidence_level || 0) * 0.2
          
          // 如果都没有AI分析数据，则按基础分数排序
          if (aGrowthScore === 0 && bGrowthScore === 0) {
            return b.score - a.score
          }
          
          return bGrowthScore - aGrowthScore
        } else {
          // 传统模式：按基础分数排序
          return b.score - a.score
        }
      })
      
      matches.value = results
      resultTitle.value = matchingTitle.value.title
      resultSubtitle.value = matchingTitle.value.subtitle

    } catch (error) {
      console.error('匹配过程出错:', error)
      throw error
    } finally {
      isLoading.value = false
      progress.value = {
        current: 0,
        total: 0,
        text: '',
        estimatedTime: ''
      }
    }
  }

  return {
    // 状态
    isLoading,
    matches,
    progress,
    loadingText,
    resultTitle,
    resultSubtitle,

    // 计算属性
    matchingTitle,

    // 动作
    findSimilarMatches,
    findComplementaryMatches
  }
})