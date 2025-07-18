import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { getAnalysisFromCache, setAnalysisInCache } from '../services/cache'

// 匹配分析模式标签
const getAnalysisModeLabel = (result) => {
  if (result.degraded) {
    return 'AI降级→传统'
  } else if (result.traditionalMode) {
    return '传统'
  } else if (result.healthDegraded) {
    return '传统(降级)'
  } else if (result.analysis?.ai_analysis) {
    return 'AI智能'
  }
  return '传统'
}

// 获取匹配类型
const getMatchTypeFromResult = (result) => {
  if (result.analysis?.ai_analysis?.match_type) {
    return result.analysis.ai_analysis.match_type
  } else if (result.degraded) {
    return '降级匹配'
  } else if (result.traditionalMode) {
    return '传统匹配'
  }
  return '未知类型'
}

// 获取分析模式
const getAnalysisMode = (result) => {
  if (result.analysis?.ai_analysis && !result.degraded) {
    return 'ai'
  } else if (result.degraded) {
    return 'ai_degraded'
  } else if (result.healthDegraded) {
    return 'traditional_degraded'
  }
  return 'traditional'
}

// 从结果中获取字段
const getFieldFromResult = (result, fieldName) => {
  if (result.analysis?.[fieldName]) {
    return result.analysis[fieldName]
  } else if (result[fieldName]) {
    return result[fieldName]
  }
  
  const defaults = {
    'commonHobbies': [],
    'commonBooks': [],
    'detailLevel': { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 }
  }
  
  return defaults[fieldName] || null
}

// 生成匹配标题
const getMatchingTitle = (matches, type) => {
  const degradedCount = matches.filter(m => m.degraded).length
  const traditionalCount = matches.filter(m => m.traditionalMode || m.healthDegraded).length
  
  let baseTitle = type === 'similar' ? '🎯 相似搭档推荐' : '🌱 互补搭档推荐'
  let subtitle = ''
  
  if (degradedCount > 0) {
    baseTitle = `🔀 混合模式${baseTitle.substring(2)}`
    subtitle = `智能AI分析 + 传统算法降级 | ${degradedCount}/${matches.length} 个配对降级`
  } else if (traditionalCount === matches.length) {
    baseTitle = `📊 传统算法${baseTitle.substring(2)}`
    subtitle = 'AI分析已关闭，使用传统匹配算法'
  } else {
    baseTitle = `🧠 深度智能${baseTitle.substring(2)}`
    subtitle = 'AI驱动的高级语义分析匹配'
  }
  
  return { title: baseTitle, subtitle }
}

// 检查性别偏好匹配
const checkGenderPreferenceMatch = (user1, user2) => {
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
  
  return user1WantsUser1 && user2WantsUser2
}

// 计算阅读承诺兼容性
const calculateReadingCommitmentCompatibility = (commitment1, commitment2) => {
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
const preFilterPair = (user1, user2) => {
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

// 计算匹配分数
const calculateMatchScore = (user1, user2, type = 'similar') => {
  // 预过滤检查
  const filterResult = preFilterPair(user1, user2)
  if (!filterResult.shouldMatch) {
    return {
      score: 0,
      reason: filterResult.reason,
      commonHobbies: [],
      commonBooks: [],
      detailLevel: { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 }
    }
  }

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

export const useMatchStore = defineStore('match', () => {
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

  // 寻找相似搭档
  const findSimilarMatches = async () => {
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
      const results = []
      const totalPairs = (members.length * (members.length - 1)) / 2
      
      progress.value = {
        current: 0,
        total: totalPairs,
        text: '准备开始匹配分析...',
        estimatedTime: ''
      }

      const startTime = Date.now()
      
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          // 尝试从缓存获取分析结果
          const profile1 = createUserProfile(members[i])
          const profile2 = createUserProfile(members[j])
          
          let result = await getAnalysisFromCache(profile1, profile2)
          
          if (!result) {
            // 如果缓存中没有，计算新的结果
            result = calculateMatchScore(members[i], members[j], 'similar')
            // 保存结果到缓存
            await setAnalysisInCache(profile1, profile2, result)
          }
          
          if (result.score > 0) {
            results.push({
              member1: members[i],
              member2: members[j],
              score: result.score,
              reason: result.reason,
              commonHobbies: result.commonHobbies,
              commonBooks: result.commonBooks,
              detailLevel: result.detailLevel,
              readingCommitmentCompatibility: result.readingCommitmentCompatibility,
              traditionalMode: true,
              type: 'similar'
            })
          }

          progress.value.current++
          progress.value.text = `正在分析第 ${progress.value.current}/${totalPairs} 个配对...`
          
          // 计算预估剩余时间
          const elapsed = Date.now() - startTime
          const avgTimePerPair = elapsed / progress.value.current
          const remaining = totalPairs - progress.value.current
          const estimatedRemaining = Math.round(remaining * avgTimePerPair / 1000)
          
          if (estimatedRemaining > 60) {
            progress.value.estimatedTime = `${Math.floor(estimatedRemaining / 60)}分${estimatedRemaining % 60}秒`
          } else {
            progress.value.estimatedTime = `${estimatedRemaining}秒`
          }
        }
      }

      // 按分数排序
      results.sort((a, b) => b.score - a.score)
      
      matches.value = results
      
      // 设置结果标题
      const titleInfo = getMatchingTitle(results, 'similar')
      resultTitle.value = titleInfo.title
      resultSubtitle.value = titleInfo.subtitle

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
  const findComplementaryMatches = async () => {
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
      const results = []
      const totalPairs = (members.length * (members.length - 1)) / 2
      
      progress.value = {
        current: 0,
        total: totalPairs,
        text: '准备开始互补匹配分析...',
        estimatedTime: ''
      }

      const startTime = Date.now()
      
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          // 尝试从缓存获取分析结果
          const profile1 = createUserProfile(members[i])
          const profile2 = createUserProfile(members[j])
          
          let result = await getAnalysisFromCache(profile1, profile2)
          
          if (!result) {
            // 如果缓存中没有，计算新的结果
            result = calculateMatchScore(members[i], members[j], 'complementary')
            // 保存结果到缓存
            await setAnalysisInCache(profile1, profile2, result)
          }
          
          results.push({
            member1: members[i],
            member2: members[j],
            score: result.score,
            reason: result.reason,
            commonHobbies: result.commonHobbies,
            commonBooks: result.commonBooks,
            detailLevel: result.detailLevel,
            readingCommitmentCompatibility: result.readingCommitmentCompatibility,
            traditionalMode: true,
            type: 'complementary'
          })

          progress.value.current++
          progress.value.text = `正在分析第 ${progress.value.current}/${totalPairs} 个配对...`
          
          // 计算预估剩余时间
          const elapsed = Date.now() - startTime
          const avgTimePerPair = elapsed / progress.value.current
          const remaining = totalPairs - progress.value.current
          const estimatedRemaining = Math.round(remaining * avgTimePerPair / 1000)
          
          if (estimatedRemaining > 60) {
            progress.value.estimatedTime = `${Math.floor(estimatedRemaining / 60)}分${estimatedRemaining % 60}秒`
          } else {
            progress.value.estimatedTime = `${estimatedRemaining}秒`
          }
        }
      }

      // 按分数排序
      results.sort((a, b) => b.score - a.score)
      
      matches.value = results
      
      // 设置结果标题
      const titleInfo = getMatchingTitle(results, 'complementary')
      resultTitle.value = titleInfo.title
      resultSubtitle.value = titleInfo.subtitle

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

    // 动作
    findSimilarMatches,
    findComplementaryMatches
  }
})