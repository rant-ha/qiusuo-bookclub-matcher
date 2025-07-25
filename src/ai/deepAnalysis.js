// 深度AI分析模块
// 实现阅读人格分析、隐含偏好挖掘和深度兼容性分析

import { Logger } from '../utils.js';
import { apiHealthMonitor, errorMonitoringSystem } from '../api/healthMonitor.js';
import { CONFIG } from '../config.js';

/**
 * 深度AI分析引擎
 * 复现原始系统中的高级AI分析功能
 */
export class DeepAIAnalysisEngine {
    constructor() {
        this.initialized = false;
        Logger.info('深度AI分析引擎初始化');
    }
    
    /**
     * 阅读人格画像分析
     * 分析用户的阅读心理和认知风格
     */
    async getReadingPersonalityProfile(userText, favoriteBooks = []) {
        try {
            // 数据有效性检查
            if (!userText?.trim() && (!favoriteBooks || favoriteBooks.length === 0)) {
                return this.getEmptyPersonalityProfile();
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
    "exploration_vs_certainty": float (0.0-1.0),
    "emotional_vs_rational": float (0.0-1.0),
    "introspective_vs_social": float (0.0-1.0),
    "escapist_vs_realistic": float (0.0-1.0),
    "fast_paced_vs_contemplative": float (0.0-1.0)
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
}`;
            
            const userPrompt = JSON.stringify({
                user_description: userText?.trim() || '',
                favorite_books: favoriteBooks || [],
                analysis_type: 'reading_personality_profile'
            });
            
            const aiResponse = await this.callAIService(
                systemPrompt,
                userPrompt,
                'reading_personality'
            );
            
            return this.validatePersonalityProfile(aiResponse);
        } catch (error) {
            Logger.error('阅读人格分析失败', error);
            errorMonitoringSystem.logError('AI_PERSONALITY_ANALYSIS_ERROR', {
                error: error.message,
                userTextLength: userText?.length || 0,
                favoriteBooksCount: favoriteBooks?.length || 0
            });
            return this.getEmptyPersonalityProfile();
        }
    }
    
    /**
     * 隐含偏好挖掘分析
     * 发现用户隐藏的阅读模式和深层偏好
     */
    async getImplicitPreferenceAnalysis(userText, favoriteBooks = [], bookCategories = []) {
        try {
            if (!userText?.trim() && (!favoriteBooks || favoriteBooks.length === 0)) {
                return this.getEmptyImplicitAnalysis();
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
}`;
            
            const userPrompt = JSON.stringify({
                user_description: userText?.trim() || '',
                favorite_books: favoriteBooks || [],
                book_categories: bookCategories || [],
                analysis_type: 'implicit_preference_mining'
            });
            
            const aiResponse = await this.callAIService(
                systemPrompt,
                userPrompt,
                'implicit_analysis'
            );
            
            return this.validateImplicitAnalysis(aiResponse);
        } catch (error) {
            Logger.error('隐含偏好分析失败', error);
            errorMonitoringSystem.logError('AI_IMPLICIT_ANALYSIS_ERROR', {
                error: error.message,
                userTextLength: userText?.length || 0,
                favoriteBooksCount: favoriteBooks?.length || 0
            });
            return this.getEmptyImplicitAnalysis();
        }
    }
    
    /**
     * 深度兼容性匹配分析
     * 基于人格和隐含偏好进行深度兼容性评估
     */
    async getDeepCompatibilityAnalysis(user1Profile, user2Profile, user1Implicit, user2Implicit) {
        try {
            // 检查输入数据有效性
            if (!user1Profile?.confidence_score || !user2Profile?.confidence_score) {
                return this.getEmptyCompatibilityAnalysis();
            }
            
            // 只有当两个用户的人格分析置信度都足够高时才进行深度分析
            if (user1Profile.confidence_score < 0.3 || user2Profile.confidence_score < 0.3) {
                Logger.debug('用户人格分析置信度不足，跳过深度兼容性分析');
                return this.getEmptyCompatibilityAnalysis();
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
}`;
            
            const userPrompt = JSON.stringify({
                user1: {
                    personality: user1Profile,
                    implicit_preferences: user1Implicit
                },
                user2: {
                    personality: user2Profile,
                    implicit_preferences: user2Implicit
                },
                analysis_type: 'deep_compatibility_assessment'
            });
            
            const aiResponse = await this.callAIService(
                systemPrompt,
                userPrompt,
                'deep_compatibility'
            );
            
            return this.validateCompatibilityAnalysis(aiResponse);
        } catch (error) {
            Logger.error('深度兼容性分析失败', error);
            errorMonitoringSystem.logError('AI_COMPATIBILITY_ANALYSIS_ERROR', {
                error: error.message,
                user1Confidence: user1Profile?.confidence_score || 0,
                user2Confidence: user2Profile?.confidence_score || 0
            });
            return this.getEmptyCompatibilityAnalysis();
        }
    }
    
    /**
     * AI服务调用统一接口
     * 集成重试、错误处理和健康监控
     */
    async callAIService(systemPrompt, userPrompt, analysisType) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    Logger.debug(`AI服务重试 ${attempt}/${maxRetries - 1}，延迟 ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                const response = await fetch(CONFIG.AI_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.AI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: CONFIG.AI_MODEL_NAME,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.3  // 较低温度确保一致性
                    })
                });
                
                if (response.status === 429) {
                    // 速率限制，记录并重试
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('API_RATE_LIMIT', {
                        attempt,
                        analysisType,
                        responseStatus: 429
                    });
                    lastError = new Error('AI API速率限制');
                    continue;
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('API_NETWORK_ERROR', {
                        attempt,
                        analysisType,
                        responseStatus: response.status,
                        responseText: errorText
                    });
                    lastError = new Error(`AI API请求失败: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                
                if (!content) {
                    throw new Error('AI响应内容为空');
                }
                
                // 记录成功
                apiHealthMonitor.recordSuccess();
                
                // 解析JSON响应
                const parsedContent = JSON.parse(content);
                
                Logger.debug(`${analysisType} AI分析成功`, {
                    attempt,
                    contentLength: content.length
                });
                
                return parsedContent;
                
            } catch (error) {
                lastError = error;
                
                if (error.message.includes('JSON')) {
                    errorMonitoringSystem.logError('AI_PARSING_ERROR', {
                        attempt,
                        analysisType,
                        error: error.message
                    });
                } else if (!error.message.includes('速率限制') && !error.message.includes('请求失败')) {
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('AI_TIMEOUT_ERROR', {
                        attempt,
                        analysisType,
                        error: error.message
                    });
                }
                
                // 对于解析错误，不再重试
                if (error.message.includes('JSON')) {
                    break;
                }
            }
        }
        
        throw lastError || new Error('AI服务调用失败');
    }
    
    // === 数据验证和默认值方法 ===
    
    validatePersonalityProfile(profile) {
        const defaultProfile = this.getEmptyPersonalityProfile();
        
        if (!profile || typeof profile !== 'object') {
            return defaultProfile;
        }
        
        // 验证必需字段
        const dimensions = profile.personality_dimensions || {};
        const validatedDimensions = {
            exploration_vs_certainty: this.clampFloat(dimensions.exploration_vs_certainty, 0.5),
            emotional_vs_rational: this.clampFloat(dimensions.emotional_vs_rational, 0.5),  
            introspective_vs_social: this.clampFloat(dimensions.introspective_vs_social, 0.5),
            escapist_vs_realistic: this.clampFloat(dimensions.escapist_vs_realistic, 0.5),
            fast_paced_vs_contemplative: this.clampFloat(dimensions.fast_paced_vs_contemplative, 0.5)
        };
        
        return {
            personality_dimensions: validatedDimensions,
            reading_motivations: Array.isArray(profile.reading_motivations) ? profile.reading_motivations : [],
            cognitive_style: profile.cognitive_style || 'unknown',
            aesthetic_preferences: profile.aesthetic_preferences || defaultProfile.aesthetic_preferences,
            cultural_orientation: profile.cultural_orientation || 'global',
            confidence_score: this.clampFloat(profile.confidence_score, 0.0)
        };
    }
    
    validateImplicitAnalysis(analysis) {
        const defaultAnalysis = this.getEmptyImplicitAnalysis();
        
        if (!analysis || typeof analysis !== 'object') {
            return defaultAnalysis;
        }
        
        return {
            implicit_themes: Array.isArray(analysis.implicit_themes) ? analysis.implicit_themes : [],
            hidden_patterns: Array.isArray(analysis.hidden_patterns) ? analysis.hidden_patterns : [],
            temporal_preferences: analysis.temporal_preferences || defaultAnalysis.temporal_preferences,
            cultural_affinities: Array.isArray(analysis.cultural_affinities) ? analysis.cultural_affinities : [],
            narrative_archetypes: Array.isArray(analysis.narrative_archetypes) ? analysis.narrative_archetypes : [],
            philosophical_leanings: Array.isArray(analysis.philosophical_leanings) ? analysis.philosophical_leanings : [],
            aesthetic_dna: analysis.aesthetic_dna || defaultAnalysis.aesthetic_dna,
            confidence_score: this.clampFloat(analysis.confidence_score, 0.0)
        };
    }
    
    validateCompatibilityAnalysis(analysis) {
        const defaultAnalysis = this.getEmptyCompatibilityAnalysis();
        
        if (!analysis || typeof analysis !== 'object') {
            return defaultAnalysis;
        }
        
        const dimensions = analysis.compatibility_dimensions || {};
        const validatedDimensions = {
            cognitive_synergy: this.clampFloat(dimensions.cognitive_synergy, 0.0),
            aesthetic_harmony: this.clampFloat(dimensions.aesthetic_harmony, 0.0),
            growth_potential: this.clampFloat(dimensions.growth_potential, 0.0),
            emotional_resonance: this.clampFloat(dimensions.emotional_resonance, 0.0),
            exploratory_balance: this.clampFloat(dimensions.exploratory_balance, 0.0)
        };
        
        return {
            compatibility_score: this.clampFloat(analysis.compatibility_score, 0.0),
            compatibility_dimensions: validatedDimensions,
            compatibility_type: analysis.compatibility_type || 'unknown',
            synergy_potential: Array.isArray(analysis.synergy_potential) ? analysis.synergy_potential : [],
            growth_opportunities: Array.isArray(analysis.growth_opportunities) ? analysis.growth_opportunities : [],
            reading_chemistry: analysis.reading_chemistry || 'unknown',
            recommendation_confidence: this.clampFloat(analysis.recommendation_confidence, 0.0),
            relationship_dynamics: analysis.relationship_dynamics || 'unknown'
        };
    }
    
    // === 默认值生成方法 ===
    
    getEmptyPersonalityProfile() {
        return {
            personality_dimensions: {
                exploration_vs_certainty: 0.5,
                emotional_vs_rational: 0.5,
                introspective_vs_social: 0.5,
                escapist_vs_realistic: 0.5,
                fast_paced_vs_contemplative: 0.5
            },
            reading_motivations: [],
            cognitive_style: 'unknown',
            aesthetic_preferences: {
                language_style: 'modern',
                narrative_structure: 'linear',
                emotional_tone: 'varied'
            },
            cultural_orientation: 'global',
            confidence_score: 0.0
        };
    }
    
    getEmptyImplicitAnalysis() {
        return {
            implicit_themes: [],
            hidden_patterns: [],
            temporal_preferences: {
                historical_periods: [],
                contemporary_vs_classic: 0.5
            },
            cultural_affinities: [],
            narrative_archetypes: [],
            philosophical_leanings: [],
            aesthetic_dna: {
                language_texture: 'conversational',
                emotional_register: 'varied',
                complexity_preference: 0.5
            },
            confidence_score: 0.0
        };
    }
    
    getEmptyCompatibilityAnalysis() {
        return {
            compatibility_score: 0.0,
            compatibility_dimensions: {
                cognitive_synergy: 0.0,
                aesthetic_harmony: 0.0,
                growth_potential: 0.0,
                emotional_resonance: 0.0,
                exploratory_balance: 0.0
            },
            compatibility_type: 'unknown',
            synergy_potential: [],
            growth_opportunities: [],
            reading_chemistry: 'unknown',
            recommendation_confidence: 0.0,
            relationship_dynamics: 'unknown'
        };
    }
    
    // === 工具方法 ===
    
    clampFloat(value, defaultValue = 0.0) {
        if (typeof value !== 'number' || isNaN(value)) {
            return defaultValue;
        }
        return Math.max(0.0, Math.min(1.0, value));
    }
}

// 导出单例实例
export const deepAIAnalysisEngine = new DeepAIAnalysisEngine();