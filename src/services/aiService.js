import { ref } from 'vue'
import { useErrorStore } from '../stores/errorStore'

const errorStore = useErrorStore()

// AI API 配置
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY
const AI_MODEL_NAME = import.meta.env.VITE_AI_MODEL_NAME

/**
 * 计算两个词的语义相似度
 */
export async function getAiSimilarity(word1, word2) {
  if (!AI_BASE_URL || !AI_API_KEY) {
    return 0
  }

  const systemPrompt = `You are an expert in judging the semantic similarity of words. Your task is to determine how similar two given words or phrases are in meaning. Respond ONLY with a JSON object containing a single key "similarity_score", with a value from 0.0 to 1.0, where 1.0 is identical meaning and 0.0 is completely unrelated.`
  const userPrompt = JSON.stringify({ word1, word2 })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      errorStore.logError(
        response.status === 429 ? errorStore.ERROR_TYPES.RATE_LIMIT : errorStore.ERROR_TYPES.API_UNAVAILABLE,
        {
          endpoint: 'getAiSimilarity',
          status: response.status,
          error: errorText
        }
      )
      return 0
    }

    errorStore.recordSuccess()

    const result = await response.json()
    const score = result.choices[0]?.message?.content

    if (score) {
      const parsedScore = JSON.parse(score)
      return parsedScore.similarity_score || 0
    }
    return 0
  } catch (error) {
    errorStore.logError(errorStore.ERROR_TYPES.NETWORK_ERROR, {
      endpoint: 'getAiSimilarity',
      error: error.message
    })
    return 0
  }
}

/**
 * 获取阅读人格画像分析
 */
export async function getReadingPersonalityProfile(userText, favoriteBooks = []) {
  if (!AI_BASE_URL || !AI_API_KEY || (!userText.trim() && favoriteBooks.length === 0)) {
    return {
      personality_dimensions: {},
      reading_motivations: [],
      cognitive_style: 'unknown',
      confidence_score: 0
    }
  }

  const systemPrompt = `You are a reading psychology expert specializing in personality analysis through literary preferences. 

Analyze the user's reading personality based on their book preferences and descriptions. Evaluate these key dimensions:

1. **EXPLORATION vs CERTAINTY** (0.0-1.0): 
   - 0.0 = Prefers familiar genres/authors, sticks to proven favorites
   - 1.0 = Constantly seeks new genres, experimental works, diverse perspectives

2. **EMOTIONAL vs RATIONAL** (0.0-1.0):
   - 0.0 = Logic-driven, prefers factual/analytical content
   - 1.0 = Emotion-driven, seeks feeling and empathy in literature

3. **INTROSPECTIVE vs SOCIAL** (0.0-1.0):
   - 0.0 = Focuses on personal growth, inner psychological exploration
   - 1.0 = Interested in social issues, interpersonal dynamics, community

4. **ESCAPIST vs REALISTIC** (0.0-1.0):
   - 0.0 = Prefers realistic, contemporary settings
   - 1.0 = Seeks fantasy, sci-fi, alternative worlds for escape

5. **FAST_PACED vs CONTEMPLATIVE** (0.0-1.0):
   - 0.0 = Slow, meditative reading, philosophical depth
   - 1.0 = Action-packed, quick plot progression

Return JSON with:
{
  "personality_dimensions": {
    "exploration_vs_certainty": float,
    "emotional_vs_rational": float,
    "introspective_vs_social": float,
    "escapist_vs_realistic": float,
    "fast_paced_vs_contemplative": float
  },
  "reading_motivations": [array of motivation strings],
  "cognitive_style": "analytical|intuitive|creative|systematic",
  "aesthetic_preferences": {
    "language_style": "classical|modern|experimental",
    "narrative_structure": "linear|non_linear|fragmented",
    "emotional_tone": "light|serious|varied"
  },
  "cultural_orientation": "eastern|western|global|local",
  "confidence_score": float (0.0-1.0)
}`

  const userPrompt = JSON.stringify({
    user_description: userText,
    favorite_books: favoriteBooks,
    analysis_focus: "deep_personality_profiling"
  })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      errorMonitor.logError(
        response.status === 429 ? errorMonitor.ERROR_TYPES.RATE_LIMIT : errorMonitor.ERROR_TYPES.API_UNAVAILABLE,
        {
          endpoint: 'getReadingPersonalityProfile',
          status: response.status,
          error: errorText
        }
      )
      return {
        personality_dimensions: {},
        reading_motivations: [],
        cognitive_style: 'unknown',
        confidence_score: 0
      }
    }

    const result = await response.json()
    const analysis = result.choices[0]?.message?.content

    if (analysis) {
      return JSON.parse(analysis)
    }
    return {
      personality_dimensions: {},
      reading_motivations: [],
      cognitive_style: 'unknown',
      confidence_score: 0
    }
  } catch (error) {
    errorMonitor.logError(errorMonitor.ERROR_TYPES.NETWORK_ERROR, {
      endpoint: 'getReadingPersonalityProfile',
      error: error.message
    })
    return {
      personality_dimensions: {},
      reading_motivations: [],
      cognitive_style: 'unknown',
      confidence_score: 0
    }
  }
}

/**
 * 获取隐含偏好分析
 */
export async function getImplicitPreferenceAnalysis(userText, favoriteBooks = [], bookCategories = []) {
  if (!AI_BASE_URL || !AI_API_KEY) {
    return {
      implicit_themes: [],
      hidden_patterns: [],
      literary_dna: {},
      confidence_score: 0
    }
  }

  const systemPrompt = `You are a literary data scientist expert in uncovering hidden reading patterns and implicit preferences.

Analyze the user's implicit preferences beyond obvious genre choices. Look for:

1. **HIDDEN THEMATIC PATTERNS**: Underlying themes that connect diverse book choices
2. **TEMPORAL PREFERENCES**: Historical periods, eras, time settings the user gravitates toward
3. **GEOGRAPHICAL/CULTURAL AFFINITIES**: Specific regions, cultures, or perspectives
4. **NARRATIVE ARCHETYPES**: Character types, story structures, conflict patterns
5. **PHILOSOPHICAL LEANINGS**: Worldviews, value systems reflected in book choices
6. **SENSORY/AESTHETIC PREFERENCES**: Language texture, pacing, atmospheric qualities

Return JSON with:
{
  "implicit_themes": [array of subtle themes user is drawn to],
  "hidden_patterns": [array of non-obvious connection patterns],
  "temporal_preferences": {
    "historical_periods": [preferred time periods],
    "contemporary_vs_classic": float (0.0=classic, 1.0=contemporary)
  },
  "cultural_affinities": [array of cultural/geographic preferences],
  "narrative_archetypes": [character types, story patterns user prefers],
  "philosophical_leanings": [underlying worldviews and values],
  "aesthetic_dna": {
    "language_texture": "sparse|rich|poetic|conversational",
    "emotional_register": "subtle|intense|varied|controlled",
    "complexity_preference": float (0.0=simple, 1.0=complex)
  },
  "confidence_score": float (0.0-1.0)
}`

  const userPrompt = JSON.stringify({
    user_description: userText,
    favorite_books: favoriteBooks,
    selected_categories: bookCategories,
    analysis_depth: "implicit_pattern_mining"
  })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      console.error('AI Implicit Analysis Error:', response.status, await response.text())
      return {
        implicit_themes: [],
        hidden_patterns: [],
        literary_dna: {},
        confidence_score: 0
      }
    }

    const result = await response.json()
    const analysis = result.choices[0]?.message?.content

    if (analysis) {
      return JSON.parse(analysis)
    }
    return {
      implicit_themes: [],
      hidden_patterns: [],
      literary_dna: {},
      confidence_score: 0
    }
  } catch (error) {
    console.error('Failed to fetch implicit analysis:', error)
    return {
      implicit_themes: [],
      hidden_patterns: [],
      literary_dna: {},
      confidence_score: 0
    }
  }
}

/**
 * 获取深度兼容性分析
 */
export async function getDeepCompatibilityAnalysis(user1Profile, user2Profile, user1Implicit, user2Implicit) {
  if (!AI_BASE_URL || !AI_API_KEY) {
    return {
      compatibility_score: 0,
      compatibility_dimensions: {},
      synergy_potential: [],
      growth_opportunities: [],
      reading_chemistry: 'unknown'
    }
  }

  const systemPrompt = `You are an expert in reading compatibility and literary relationship dynamics.

Analyze deep compatibility between two readers based on their personality profiles and implicit preferences. Calculate sophisticated compatibility across multiple dimensions:

1. **COGNITIVE SYNERGY**: How well their thinking styles complement each other
2. **AESTHETIC HARMONY**: Alignment in literary taste and style preferences  
3. **INTELLECTUAL GROWTH POTENTIAL**: Capacity to learn from each other
4. **EMOTIONAL RESONANCE**: Shared emotional wavelengths and empathy
5. **EXPLORATORY COMPATIBILITY**: Balance between similar interests and complementary differences

Calculate these compatibility types:
- **MIRROR COMPATIBILITY**: Similar personalities/preferences (comfort zone)
- **COMPLEMENTARY COMPATIBILITY**: Different but synergistic (growth zone)
- **BRIDGE COMPATIBILITY**: One can introduce the other to new territories

Return JSON with:
{
  "compatibility_score": float (0.0-1.0),
  "compatibility_dimensions": {
    "cognitive_synergy": float (0.0-1.0),
    "aesthetic_harmony": float (0.0-1.0),
    "growth_potential": float (0.0-1.0),
    "emotional_resonance": float (0.0-1.0),
    "exploratory_balance": float (0.0-1.0)
  },
  "compatibility_type": "mirror|complementary|bridge|complex",
  "synergy_potential": [array of potential benefits from this pairing],
  "growth_opportunities": [array of ways they could expand each other's horizons],
  "reading_chemistry": "explosive|steady|gentle|challenging|inspiring",
  "recommendation_confidence": float (0.0-1.0),
  "relationship_dynamics": "mentor_mentee|equal_explorers|complementary_guides|kindred_spirits"
}`

  const userPrompt = JSON.stringify({
    user1: {
      personality: user1Profile,
      implicit_preferences: user1Implicit
    },
    user2: {
      personality: user2Profile,
      implicit_preferences: user2Implicit
    },
    analysis_type: "deep_compatibility_assessment"
  })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      console.error('AI Deep Compatibility Error:', response.status, await response.text())
      return {
        compatibility_score: 0,
        compatibility_dimensions: {},
        synergy_potential: [],
        growth_opportunities: [],
        reading_chemistry: 'unknown'
      }
    }

    const result = await response.json()
    const analysis = result.choices[0]?.message?.content

    if (analysis) {
      return JSON.parse(analysis)
    }
    return {
      compatibility_score: 0,
      compatibility_dimensions: {},
      synergy_potential: [],
      growth_opportunities: [],
      reading_chemistry: 'unknown'
    }
  } catch (error) {
    console.error('Failed to fetch deep compatibility analysis:', error)
    return {
      compatibility_score: 0,
      compatibility_dimensions: {},
      synergy_potential: [],
      growth_opportunities: [],
      reading_chemistry: 'unknown'
    }
  }
}

/**
 * 获取智能文本偏好分析
 */
export async function getAiTextPreferenceAnalysis(text1, text2) {
  if (!AI_BASE_URL || !AI_API_KEY || !text1.trim() || !text2.trim()) {
    return { similarity_score: 0, common_elements: [] }
  }

  const systemPrompt = `You are an expert in analyzing reading preferences and literary tastes with deep semantic understanding.

Analyze two users' detailed book preferences and determine their compatibility using advanced semantic analysis:

1. **SURFACE SIMILARITIES**: Direct matches in authors, genres, themes
2. **DEEP SEMANTIC CONNECTIONS**: Conceptual relationships, thematic resonances
3. **STYLISTIC AFFINITIES**: Shared appreciation for narrative techniques, language styles
4. **PSYCHOLOGICAL RESONANCES**: Similar emotional needs fulfilled by reading
5. **CULTURAL/TEMPORAL ALIGNMENTS**: Shared historical/geographic interests

Provide both quantitative scores and qualitative insights.

Return JSON with:
{
  "similarity_score": float (0.0-1.0),
  "semantic_depth_score": float (0.0-1.0),
  "common_elements": [array of shared preferences],
  "deep_connections": [array of non-obvious thematic/stylistic links],
  "analysis_details": "detailed explanation of compatibility",
  "recommendation_reasons": [specific reasons why they'd be good reading partners],
  "potential_book_recommendations": [books both might enjoy together],
  "growth_potential": "how they could expand each other's reading horizons"
}`

  const userPrompt = JSON.stringify({
    preference1: text1,
    preference2: text2,
    analysis_mode: "deep_semantic_compatibility"
  })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      console.error('AI Text Preference API Error:', response.status, await response.text())
      return { similarity_score: 0, common_elements: [] }
    }

    const result = await response.json()
    const analysis = result.choices[0]?.message?.content

    if (analysis) {
      const parsedAnalysis = JSON.parse(analysis)
      return {
        similarity_score: parsedAnalysis.similarity_score || 0,
        semantic_depth_score: parsedAnalysis.semantic_depth_score || 0,
        common_elements: parsedAnalysis.common_elements || [],
        deep_connections: parsedAnalysis.deep_connections || [],
        analysis_details: parsedAnalysis.analysis_details || '',
        recommendation_reasons: parsedAnalysis.recommendation_reasons || [],
        potential_book_recommendations: parsedAnalysis.potential_book_recommendations || [],
        growth_potential: parsedAnalysis.growth_potential || ''
      }
    }
    return { similarity_score: 0, common_elements: [] }
  } catch (error) {
    console.error('Failed to fetch AI text preference analysis:', error)
    return { similarity_score: 0, common_elements: [] }
  }
}

/**
 * 获取综合性AI匹配分析
 */
export async function getAIMatchingAnalysis(profile1, profile2) {
  if (!AI_BASE_URL || !AI_API_KEY) {
    throw new Error('AI服务未配置')
  }

  const systemPrompt = `你是一位专业的读书会配对专家，具有深厚的心理学和社会学背景。你的任务是分析两个用户的全面信息，判断他们作为读书会伙伴的兼容性。

## 分析维度框架

### 1. 相似性分析 (Similarity Analysis)
- **兴趣重叠度**: 共同爱好、相似偏好的程度
- **阅读品味**: 喜欢的书籍类型、作者、主题的重叠
- **阅读节奏**: 阅读速度、投入时间的匹配程度
- **价值观共鸣**: 从阅读偏好中体现的价值观相似性

### 2. 互补性分析 (Complementarity Analysis)  
- **知识互补**: 不同领域的知识可以互相补充
- **技能互补**: 分析能力、表达能力等技能的互补
- **视角多样性**: 不同背景带来的多元视角
- **成长潜力**: 互相促进学习和成长的可能性

### 3. 兼容性分析 (Compatibility Analysis)
- **沟通风格**: 基于偏好推断的沟通方式兼容性  
- **学习方式**: 阅读习惯和学习偏好的匹配
- **时间安排**: 阅读投入度和可用时间的协调性
- **人格特质**: 从阅读偏好推断的性格特征兼容性

## 用户匹配偏好考虑 ⭐ 重要
在分析时必须考虑两个用户的匹配类型偏好：
- **similar**: 用户倾向于寻找相似型搭档（兴趣相近、品味相似）
- **complementary**: 用户倾向于寻找互补型搭档（不同背景、互相学习）
- **no_preference**: 对匹配类型没有特殊偏好

### 偏好匹配规则：
1. **双方都偏好相似型**: 重点突出相似性分析，similarity_score权重增加
2. **双方都偏好互补型**: 重点突出互补性分析，complementarity_score权重增加
3. **一方偏好相似型，一方偏好互补型**: 平衡考虑，适度降低整体匹配分数
4. **至少一方选择"都可以"**: 正常分析，不做特殊调整
5. **偏好不匹配时**: 在分析中明确指出偏好差异，并在potential_challenges中提及

## 评分标准
- **优秀匹配 (8.0-10.0)**: 高度相似 + 良好互补 + 完美兼容
- **良好匹配 (6.0-7.9)**: 中等相似 + 部分互补 + 基本兼容  
- **一般匹配 (4.0-5.9)**: 少量共同点 + 有限互补 + 可接受兼容
- **较差匹配 (2.0-3.9)**: 很少共同点 + 互补不足 + 兼容性问题
- **不匹配 (0.0-1.9)**: 几乎无共同点 + 冲突倾向 + 严重不兼容

## 分析要求
1. 深度分析两个用户的所有可用信息
2. 考虑显性和隐性的匹配因素
3. 提供具体的匹配原因和建议
4. 识别潜在的挑战和解决方案
5. 给出具体的读书会活动建议
6. 重点考虑用户的匹配类型偏好

返回格式必须是JSON:
{
    "compatibility_score": 0.0到10.0的数字,
    "match_type": "相似型/互补型/混合型",
    "confidence_level": 0.0到1.0的置信度,
    "summary": "简洁的匹配总结(1-2句话)",
    "detailed_analysis": {
        "similarity_score": 0.0到10.0,
        "complementarity_score": 0.0到10.0,
        "compatibility_score": 0.0到10.0,
        "similarity_highlights": ["相似点1", "相似点2"],
        "complementarity_highlights": ["互补点1", "互补点2"],  
        "compatibility_highlights": ["兼容点1", "兼容点2"]
    },
    "preference_compatibility": {
        "user1_preference": "similar/complementary/no_preference",
        "user2_preference": "similar/complementary/no_preference", 
        "preference_match": true/false,
        "preference_impact": "positive/neutral/negative",
        "preference_note": "关于偏好匹配的说明"
    },
    "shared_interests": ["共同兴趣1", "共同兴趣2"],
    "shared_books": ["共同书籍1", "共同书籍2"],
    "potential_challenges": ["潜在挑战1", "潜在挑战2"],
    "reading_recommendations": ["推荐书籍1", "推荐书籍2"],
    "activity_suggestions": ["活动建议1", "活动建议2"],
    "growth_opportunities": ["成长机会1", "成长机会2"],
    "exact_matches": 精确匹配数量,
    "semantic_matches": 语义匹配数量,
    "category_matches": 类别匹配数量,
    "match_reasoning": "详细的匹配逻辑说明(3-5句话)"
}`

  const userPrompt = JSON.stringify({
    user1_profile: profile1,
    user2_profile: profile2,
    analysis_request: "进行全面的读书会伙伴兼容性分析",
    focus_areas: ["相似性", "互补性", "兼容性", "成长潜力"]
  })

  try {
    const response = await fetch(AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      errorStore.logError(
        response.status === 429 ? errorStore.ERROR_TYPES.RATE_LIMIT : errorStore.ERROR_TYPES.API_UNAVAILABLE,
        {
          endpoint: 'getAIMatchingAnalysis',
          status: response.status,
          error: errorText
        }
      )
      throw new Error('AI API请求失败')
    }

    const result = await response.json()
    const analysis = result.choices[0]?.message?.content

    if (analysis) {
      return JSON.parse(analysis)
    }
    throw new Error('AI返回格式错误')
  } catch (error) {
    errorStore.logError(errorStore.ERROR_TYPES.NETWORK_ERROR, {
      endpoint: 'getAIMatchingAnalysis',
      error: error.message
    })
    throw error
  }
}