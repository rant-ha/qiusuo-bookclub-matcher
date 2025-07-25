// 高级匹配算法模块
// 包含AI语义分析、动态权重调整和多维度匹配评分

import { Logger, measureAsyncPerformance } from '../utils.js';
import { getAiSimilarity } from '../api.js';
import { apiHealthMonitor, errorMonitoringSystem } from '../api/healthMonitor.js';
import { deepAIAnalysisEngine } from '../ai/deepAnalysis.js';
import { DEFAULT_MATCHING_WEIGHTS } from '../config.js';
import { configManager } from '../admin/configManager.js';

/**
 * 匹配引擎类 - 策略模式实现不同匹配算法
 */
export class MatchingEngine {
    constructor() {
        // 缓存配置
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存
        
        // 初始化权重配置（从配置管理器获取，回退到默认值）
        this.initializeWeights();
        
        // 订阅配置变更以实现动态权重调整
        this.subscribeToConfigChanges();
        
        Logger.info('动态匹配引擎初始化完成');
    }
    
    /**
     * 初始化权重配置
     */
    initializeWeights() {
        try {
            const config = configManager.getConfig();
            const matchingConfig = config.matchingWeights || {};
            
            // 合并自定义配置和默认配置
            this.weights = {
                traditional: { ...DEFAULT_MATCHING_WEIGHTS.traditional, ...matchingConfig.traditional },
                ai: { ...DEFAULT_MATCHING_WEIGHTS.ai, ...matchingConfig.ai },
                smart: { ...DEFAULT_MATCHING_WEIGHTS.smart, ...matchingConfig.smart },
                deep: { ...DEFAULT_MATCHING_WEIGHTS.deep, ...matchingConfig.deep }
            };
            
            Logger.info('匹配权重配置已加载', this.weights);
        } catch (error) {
            Logger.warn('加载匹配权重配置失败，使用默认配置', error);
            this.weights = { ...DEFAULT_MATCHING_WEIGHTS };
        }
    }
    
    /**
     * 订阅配置变更
     */
    subscribeToConfigChanges() {
        configManager.onUpdate((newConfig) => {
            if (newConfig.matchingWeights) {
                Logger.info('检测到匹配权重配置变更，正在更新...');
                this.initializeWeights();
                this.clearCache(); // 清除缓存以使用新权重
                Logger.info('匹配权重配置已更新');
            }
        });
    }
    
    /**
     * 清除匹配结果缓存
     */
    clearCache() {
        this.cache.clear();
        Logger.debug('匹配结果缓存已清空');
    }
    
    /**
     * 获取当前权重配置
     */
    getCurrentWeights() {
        return { ...this.weights };
    }
    
    /**
     * 动态更新权重配置
     * @param {Object} newWeights - 新的权重配置
     */
    updateWeights(newWeights) {
        try {
            // 验证权重配置的有效性
            this.validateWeights(newWeights);
            
            // 更新权重配置
            this.weights = {
                traditional: { ...this.weights.traditional, ...newWeights.traditional },
                ai: { ...this.weights.ai, ...newWeights.ai },
                smart: { ...this.weights.smart, ...newWeights.smart },
                deep: { ...this.weights.deep, ...newWeights.deep }
            };
            
            // 清除缓存
            this.clearCache();
            
            Logger.info('匹配权重配置已动态更新', this.weights);
            return true;
        } catch (error) {
            Logger.error('更新匹配权重配置失败', error);
            return false;
        }
    }
    
    /**
     * 验证权重配置的有效性
     * @param {Object} weights - 要验证的权重配置
     */
    validateWeights(weights) {
        const validateGroup = (group, groupName) => {
            if (!group || typeof group !== 'object') return;
            
            const sum = Object.values(group).reduce((acc, val) => acc + (val || 0), 0);
            if (Math.abs(sum - 1.0) > 0.01) {
                throw new Error(`${groupName}权重总和必须为1.0，当前为${sum}`);
            }
            
            Object.entries(group).forEach(([key, value]) => {
                if (typeof value !== 'number' || value < 0 || value > 1) {
                    throw new Error(`${groupName}.${key}权重必须为0-1之间的数字，当前为${value}`);
                }
            });
        };
        
        if (weights.traditional) validateGroup(weights.traditional, 'traditional');
        if (weights.ai) validateGroup(weights.ai, 'ai');
        if (weights.smart) validateGroup(weights.smart, 'smart');
        if (weights.deep) validateGroup(weights.deep, 'deep');
    }
    
    /**
     * AI增强的深度兼容性计算（完整版）
     * 复现原始系统的多维度深度分析
     */
    async calculateAICompatibility(user1, user2) {
        try {
            // 检查缓存
            const cacheKey = this.generateCacheKey(user1, user2);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                Logger.debug('使用缓存的深度AI匹配结果', { users: [user1.name, user2.name] });
                return cachedResult;
            }
            
            // 检查性别偏好匹配
            if (!this.checkGenderPreferenceMatch(user1, user2)) {
                const result = {
                    score: 0,
                    reason: "性别偏好不匹配",
                    genderPreferenceCompatible: false,
                    analysis: null
                };
                this.setCache(cacheKey, result);
                return result;
            }
            
            // 检查AI服务可用性
            if (!apiHealthMonitor.shouldUseAI()) {
                Logger.warn('AI服务不可用，使用传统算法降级');
                const result = await this.calculateTraditionalCompatibility(user1, user2);
                result.degraded = true;
                result.degradationReason = 'AI服务降级';
                return result;
            }
            
            // 执行深度AI分析
            let result;
            try {
                result = await this.performDeepAIAnalysis(user1, user2);
                apiHealthMonitor.recordSuccess();
                
            } catch (aiError) {
                Logger.warn('深度AI分析失败，降级到传统算法', aiError);
                
                // 记录错误
                apiHealthMonitor.recordError();
                errorMonitoringSystem.logError('AI_DEEP_ANALYSIS_ERROR', {
                    error: aiError.message,
                    users: [user1.name, user2.name]
                });
                
                // 降级到传统算法
                result = await this.calculateTraditionalCompatibility(user1, user2);
                result.degraded = true;
                result.degradationReason = aiError.message;
            }
            
            // 缓存结果
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            Logger.error('AI兼容性计算失败', error);
            errorMonitoringSystem.logError('AI_COMPATIBILITY_ERROR', {
                error: error.message,
                users: [user1.name, user2.name]
            });
            throw error;
        }
    }
    /**
     * 执行深度AI分析（复现原始算法的完整流程）
     */
    async performDeepAIAnalysis(user1, user2) {
        const migrated1 = this.migrateUserData(user1);
        const migrated2 = this.migrateUserData(user2);
        
        // 初始化结果结构
        const result = {
            score: 0,
            reason: '',
            genderPreferenceCompatible: true,
            analysis: {
                ai_analysis: {},
                traditional_analysis: {}
            },
            personalityProfiles: {
                member1: null,
                member2: null
            },
            implicitAnalysis: {
                member1: null,
                member2: null
            },
            deepCompatibilityAnalysis: null,
            matchingDimensions: {
                traditional_similarity: 0,
                personality_compatibility: 0,
                implicit_resonance: 0,
                growth_potential: 0,
                overall_chemistry: 0
            },
            commonInterests: [],
            commonBooks: []
        };
        
        // === 第一阶段：并行执行深度AI分析 ===
        Logger.debug('开始深度AI分析', { users: [user1.name, user2.name] });
        
        const [personality1, personality2, implicit1, implicit2] = await Promise.all([
            deepAIAnalysisEngine.getReadingPersonalityProfile(
                this.extractUserDescription(migrated1),
                this.extractUserBooks(migrated1)
            ),
            deepAIAnalysisEngine.getReadingPersonalityProfile(
                this.extractUserDescription(migrated2),
                this.extractUserBooks(migrated2)
            ),
            deepAIAnalysisEngine.getImplicitPreferenceAnalysis(
                this.extractUserDescription(migrated1),
                this.extractUserBooks(migrated1),
                migrated1.questionnaire?.bookCategories || []
            ),
            deepAIAnalysisEngine.getImplicitPreferenceAnalysis(
                this.extractUserDescription(migrated2),
                this.extractUserBooks(migrated2),
                migrated2.questionnaire?.bookCategories || []
            )
        ]);
        
        result.personalityProfiles.member1 = personality1;
        result.personalityProfiles.member2 = personality2;
        result.implicitAnalysis.member1 = implicit1;
        result.implicitAnalysis.member2 = implicit2;
        
        // === 第二阶段：深度兼容性分析 ===
        if (personality1.confidence_score > 0.3 && personality2.confidence_score > 0.3) {
            result.deepCompatibilityAnalysis = await deepAIAnalysisEngine.getDeepCompatibilityAnalysis(
                personality1, personality2, implicit1, implicit2
            );
            
            // 计算各个深度维度分数（复现原始权重逻辑）
            if (result.deepCompatibilityAnalysis.compatibility_score > 0) {
                const compatDimensions = result.deepCompatibilityAnalysis.compatibility_dimensions;
                
                result.matchingDimensions.personality_compatibility = 
                    (compatDimensions.cognitive_synergy || 0) * 2 +
                    (compatDimensions.emotional_resonance || 0) * 1.5;
                    
                result.matchingDimensions.implicit_resonance = 
                    (compatDimensions.aesthetic_harmony || 0) * 2 +
                    (compatDimensions.exploratory_balance || 0) * 1.3;
                    
                result.matchingDimensions.growth_potential = 
                    (compatDimensions.growth_potential || 0) * 2.5;
                    
                result.matchingDimensions.overall_chemistry = 
                    result.deepCompatibilityAnalysis.compatibility_score * 3;
            }
        }
        
        // === 第三阶段：传统算法作为基线 ===
        const traditionalResult = await this.calculateTraditionalCompatibility(user1, user2);
        result.matchingDimensions.traditional_similarity = traditionalResult.score;
        result.commonInterests = traditionalResult.commonInterests || [];
        result.commonBooks = traditionalResult.commonBooks || [];
        
        // === 第四阶段：智能权重计算最终分数 ===
        const finalScore = this.calculateDeepScore(result);
        result.score = Math.min(Math.max(Math.round(finalScore), 0), 10);
        
        // 生成分析原因
        result.reason = this.generateDeepAnalysisReason(result);
        result.analysis.ai_analysis = result.deepCompatibilityAnalysis;
        result.analysis.traditional_analysis = traditionalResult.analysis?.traditional_analysis || {};
        
        Logger.debug('深度AI分析完成', {
            users: [user1.name, user2.name],
            finalScore: result.score,
            personalityConfidence: [personality1.confidence_score, personality2.confidence_score],
            compatibilityScore: result.deepCompatibilityAnalysis?.compatibility_score || 0
        });
        
        return result;
    }
    
    /**
     * 传统匹配算法（作为AI的降级策略）
     */
    async calculateTraditionalCompatibility(user1, user2) {
        const migrated1 = this.migrateUserData(user1);
        const migrated2 = this.migrateUserData(user2);
        
        let totalScore = 0;
        let weightSum = 0;
        
        const result = {
            score: 0,
            reason: '',
            genderPreferenceCompatible: true,
            analysis: {
                traditional_analysis: {
                    basic_similarity: 0,
                    reading_similarity: 0,
                    interest_similarity: 0,
                    personality_similarity: 0
                }
            },
            commonInterests: [],
            commonBooks: [],
            matchingDimensions: {
                traditional_similarity: 0,
                ai_semantic_similarity: 0,
                overall_compatibility: 0
            }
        };
        
        // 基本信息相似度
        const basicScore = this.calculateBasicSimilarity(migrated1, migrated2);
        totalScore += basicScore * this.weights.traditional.basic;
        weightSum += this.weights.traditional.basic;
        result.analysis.traditional_analysis.basic_similarity = basicScore;
        
        // 阅读偏好相似度
        const readingScore = this.calculateReadingPreferenceSimilarity(migrated1, migrated2);
        totalScore += readingScore * this.weights.traditional.reading;
        weightSum += this.weights.traditional.reading;
        result.analysis.traditional_analysis.reading_similarity = readingScore;
        
        // 兴趣爱好相似度
        const interestScore = await this.calculateInterestSimilarity(migrated1, migrated2);
        totalScore += interestScore * this.weights.traditional.interest;
        weightSum += this.weights.traditional.interest;
        result.analysis.traditional_analysis.interest_similarity = interestScore;
        result.commonInterests = this.findCommonInterests(migrated1, migrated2);
        
        // 性格特征相似度
        const personalityScore = this.calculatePersonalitySimilarity(migrated1, migrated2);
        totalScore += personalityScore * this.weights.traditional.personality;
        weightSum += this.weights.traditional.personality;
        result.analysis.traditional_analysis.personality_similarity = personalityScore;
        
        // 计算最终分数
        const finalScore = weightSum > 0 ? (totalScore / weightSum) : 0;
        result.score = Math.min(Math.max(Math.round(finalScore), 0), 10);
        result.matchingDimensions.traditional_similarity = result.score;
        result.matchingDimensions.overall_compatibility = result.score;
        
        // 生成匹配原因
        result.reason = this.generateMatchReason(result, 'traditional');
        
        Logger.debug('传统匹配算法完成', {
            users: [user1.name, user2.name],
            score: result.score,
            components: {
                basic: basicScore,
                reading: readingScore,
                interest: interestScore,
                personality: personalityScore
            }
        });
        
        return result;
    }
    
    /**
     * 构建AI分析请求
     */
    buildAIAnalysisRequest(user1, user2) {
        const migrated1 = this.migrateUserData(user1);
        const migrated2 = this.migrateUserData(user2);
        
        // 提取关键信息用于AI分析
        const user1Info = {
            interests: this.extractUserInterests(migrated1),
            books: this.extractUserBooks(migrated1),
            personality: migrated1.questionnaire?.personality || {},
            preferences: {
                reading_commitment: migrated1.questionnaire?.readingCommitment,
                book_categories: migrated1.questionnaire?.bookCategories || []
            }
        };
        
        const user2Info = {
            interests: this.extractUserInterests(migrated2),
            books: this.extractUserBooks(migrated2),
            personality: migrated2.questionnaire?.personality || {},
            preferences: {
                reading_commitment: migrated2.questionnaire?.readingCommitment,
                book_categories: migrated2.questionnaire?.bookCategories || []
            }
        };
        
        return {
            user1: user1Info,
            user2: user2Info,
            analysis_type: 'comprehensive_compatibility',
            focus_areas: ['相似性', '互补性', '兼容性', '成长潜力']
        };
    }
    
    /**
     * 执行AI分析（带重试机制）
     */
    async executeAIAnalysisWithRetry(analysisRequest) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(
                        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                        this.retryConfig.maxDelay
                    );
                    Logger.debug(`AI分析重试 ${attempt}/${this.retryConfig.maxRetries}，延迟 ${delay}ms`);
                    await this.sleep(delay);
                }
                
                // 调用AI服务
                const response = await this.callAIService(analysisRequest);
                return response;
                
            } catch (error) {
                lastError = error;
                
                if (error.message.includes('429') || error.message.includes('rate limit')) {
                    // 速率限制，继续重试
                    errorMonitoringSystem.logError('API_RATE_LIMIT', {
                        attempt,
                        error: error.message
                    });
                    continue;
                } else if (error.message.includes('timeout')) {
                    // 超时错误
                    errorMonitoringSystem.logError('API_TIMEOUT', {
                        attempt,
                        error: error.message
                    });
                    continue;
                } else {
                    // 其他错误，直接抛出
                    throw error;
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * 调用AI服务
     */
    async callAIService(analysisRequest) {
        // 这里调用实际的AI API
        // 暂时使用现有的getAiSimilarity作为基础
        const interests1 = analysisRequest.user1.interests;
        const interests2 = analysisRequest.user2.interests;
        
        if (interests1.length === 0 || interests2.length === 0) {
            return {
                compatibility_score: 0,
                match_type: '数据不足',
                confidence_level: 0.1,
                summary: '用户数据不足，无法进行AI分析',
                detailed_analysis: {}
            };
        }
        
        try {
            const aiScore = await getAiSimilarity(interests1, interests2);
            
            // 构建标准化的AI响应格式
            return {
                compatibility_score: Math.min(Math.max(aiScore / 10, 0), 10), // 转换为0-10分
                match_type: aiScore > 70 ? '高度相似' : aiScore > 40 ? '中等相似' : '低相似度',
                confidence_level: Math.min(aiScore / 100, 1),
                summary: `AI语义分析完成，相似度评分：${aiScore}%`,
                detailed_analysis: {
                    semantic_similarity: aiScore,
                    common_themes: [],
                    complementary_aspects: []
                },
                shared_interests: interests1.filter(i => interests2.includes(i)),
                potential_challenges: [],
                growth_opportunities: []
            };
        } catch (error) {
            Logger.error('AI服务调用失败', error);
            throw error;
        }
    }
    
    /**
     * 构建综合结果
     */
    async buildComprehensiveResult(user1, user2, aiAnalysis) {
        // 先计算传统算法结果
        const traditionalResult = await this.calculateTraditionalCompatibility(user1, user2);
        
        // 融合AI分析结果
        const aiScore = aiAnalysis.compatibility_score || 0;
        const traditionalScore = traditionalResult.score;
        
        // 使用权重融合分数
        const finalScore = Math.round(
            traditionalScore * this.weights.ai.traditional + 
            aiScore * this.weights.ai.semantic
        );
        
        const result = {
            score: Math.min(Math.max(finalScore, 0), 10),
            reason: aiAnalysis.summary || '综合AI分析完成',
            genderPreferenceCompatible: true,
            analysis: {
                ai_analysis: aiAnalysis,
                traditional_analysis: traditionalResult.analysis.traditional_analysis
            },
            commonInterests: aiAnalysis.shared_interests || traditionalResult.commonInterests,
            commonBooks: traditionalResult.commonBooks,
            matchingDimensions: {
                traditional_similarity: traditionalScore,
                ai_semantic_similarity: aiScore,
                overall_compatibility: finalScore
            },
            confidence_level: aiAnalysis.confidence_level || 0.5,
            match_type: aiAnalysis.match_type || '综合匹配'
        };
        
        Logger.debug('AI增强匹配分析完成', {
            users: [user1.name, user2.name],
            traditionalScore,
            aiScore,
            finalScore,
            confidenceLevel: result.confidence_level
        });
        
        return result;
    }
    
    /**
     * 检查性别偏好匹配
     */
    checkGenderPreferenceMatch(user1, user2) {
        const pref1 = user1.questionnaire?.matchGenderPreference;
        const pref2 = user2.questionnaire?.matchGenderPreference;
        const gender1 = user1.questionnaire?.gender;
        const gender2 = user2.questionnaire?.gender;
        
        // 如果任一用户没有设置偏好，则认为匹配
        if (!pref1 || !pref2 || pref1 === 'no_preference' || pref2 === 'no_preference') {
            return true;
        }
        
        // 检查双向偏好匹配
        const user1PreferenceMatch = pref1 === 'no_preference' || pref1 === gender2;
        const user2PreferenceMatch = pref2 === 'no_preference' || pref2 === gender1;
        
        return user1PreferenceMatch && user2PreferenceMatch;
    }
    
    // === 辅助方法 ===
    
    generateCacheKey(user1, user2) {
        const id1 = user1.studentId || user1.id;
        const id2 = user2.studentId || user2.id;
        return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    migrateUserData(user) {
        // 数据迁移逻辑，确保兼容性
        return {
            ...user,
            questionnaire: user.questionnaire || {}
        };
    }
    
    extractUserInterests(user) {
        const interests = [];
        const q = user.questionnaire || {};
        
        if (q.interests) {
            Object.values(q.interests).forEach(interest => {
                if (typeof interest === 'string') {
                    interests.push(...interest.split(/[,，、\s]+/).filter(i => i.trim()));
                }
            });
        }
        
        return [...new Set(interests)];
    }
    
    extractUserBooks(user) {
        const books = [];
        const q = user.questionnaire || {};
        
        if (q.favoriteBooks) {
            if (Array.isArray(q.favoriteBooks)) {
                books.push(...q.favoriteBooks);
            } else if (typeof q.favoriteBooks === 'string') {
                books.push(...q.favoriteBooks.split(/[,，、\n]+/).filter(b => b.trim()));
            }
        }
        
        return books;
    }
    
    findCommonInterests(user1, user2) {
        const interests1 = this.extractUserInterests(user1);
        const interests2 = this.extractUserInterests(user2);
        return interests1.filter(interest => interests2.includes(interest));
    }
    
    generateMatchReason(result, type) {
        const score = result.score;
        const commonCount = result.commonInterests?.length || 0;
        
        if (type === 'traditional') {
            if (score >= 8) {
                return `传统算法分析：高度匹配（评分 ${score}/10），发现 ${commonCount} 个共同兴趣`;
            } else if (score >= 5) {
                return `传统算法分析：中等匹配（评分 ${score}/10），有一定共同点`;
            } else {
                return `传统算法分析：匹配度较低（评分 ${score}/10）`;
            }
        }
        
        return `匹配分析完成，综合评分：${score}/10`;
    }
    
    // === 具体相似度计算方法 ===
    
    calculateBasicSimilarity(user1, user2) {
        const q1 = user1.questionnaire?.basicInfo || {};
        const q2 = user2.questionnaire?.basicInfo || {};
        
        let matches = 0;
        let total = 0;
        
        if (q1.grade && q2.grade) {
            matches += q1.grade === q2.grade ? 1 : 0;
            total += 1;
        }
        
        if (q1.major && q2.major) {
            matches += q1.major === q2.major ? 1 : 0.5;
            total += 1;
        }
        
        return total > 0 ? (matches / total) * 100 : 0;
    }
    
    calculateReadingPreferenceSimilarity(user1, user2) {
        const cats1 = user1.questionnaire?.bookCategories || [];
        const cats2 = user2.questionnaire?.bookCategories || [];
        
        if (cats1.length === 0 && cats2.length === 0) return 0;
        if (cats1.length === 0 || cats2.length === 0) return 0;
        
        const intersection = cats1.filter(cat => cats2.includes(cat));
        const union = new Set([...cats1, ...cats2]);
        
        return (intersection.length / union.size) * 100;
    }
    
    async calculateInterestSimilarity(user1, user2) {
        const interests1 = this.extractUserInterests(user1);
        const interests2 = this.extractUserInterests(user2);
        
        if (interests1.length === 0 && interests2.length === 0) return 0;
        if (interests1.length === 0 || interests2.length === 0) return 0;
        
        const intersection = interests1.filter(interest => interests2.includes(interest));
        const union = new Set([...interests1, ...interests2]);
        
        return (intersection.length / union.size) * 100;
    }
    
    calculatePersonalitySimilarity(user1, user2) {
        const p1 = user1.questionnaire?.personality || {};
        const p2 = user2.questionnaire?.personality || {};
        
        let similarity = 0;
        let count = 0;
        
        ['introversion', 'creativity', 'analyticalThinking', 'empathy'].forEach(trait => {
            if (p1[trait] && p2[trait]) {
                const diff = Math.abs(p1[trait] - p2[trait]);
                similarity += (5 - diff) / 5;
                count += 1;
            }
        });
        
        return count > 0 ? (similarity / count) * 100 : 0;
    }
    
    // === 深度分析支持方法 ===
    
    /**
     * 提取用户描述文本
     */
    extractUserDescription(user) {
        const q = user.questionnaire || {};
        const parts = [];
        
        // 收集各种描述性文本
        if (q.personalDescription) parts.push(q.personalDescription);
        if (q.readingGoals) parts.push(q.readingGoals);
        if (q.bookPreferences) parts.push(q.bookPreferences);
        if (q.aboutMe) parts.push(q.aboutMe);
        
        return parts.join(' ').trim();
    }
    
    /**
     * 计算深度分析的最终评分
     * 复现原始算法的动态权重系统
     */
    calculateDeepScore(analysisResult) {
        const dimensions = analysisResult.matchingDimensions;
        
        // 数据完整性调节因子
        const dataCompleteness = this.calculateDataCompleteness(analysisResult);
        const dataCompletenessMultiplier = Math.min(dataCompleteness + 0.2, 1.0);
        
        // 深度分析可用性检查
        const hasDeepAnalysis = analysisResult.deepCompatibilityAnalysis?.compatibility_score > 0;
        
        if (hasDeepAnalysis) {
            // 使用深度分析权重
            const weightedScore = 
                (dimensions.traditional_similarity || 0) * this.weights.deep.traditional_similarity +
                (dimensions.personality_compatibility || 0) * this.weights.deep.personality_compatibility +
                (dimensions.implicit_resonance || 0) * this.weights.deep.implicit_resonance +
                (dimensions.growth_potential || 0) * this.weights.deep.growth_potential;
            
            return weightedScore * dataCompletenessMultiplier;
        } else {
            // 回退到传统评分，但仍应用数据完整性调节
            return (dimensions.traditional_similarity || 0) * dataCompletenessMultiplier;
        }
    }
    
    /**
     * 计算数据完整性
     */
    calculateDataCompleteness(analysisResult) {
        let completeness = 0;
        let factors = 0;
        
        // 检查人格分析完整性
        const personality1 = analysisResult.personalityProfiles?.member1;
        const personality2 = analysisResult.personalityProfiles?.member2;
        
        if (personality1?.confidence_score > 0) {
            completeness += personality1.confidence_score;
            factors += 1;
        }
        
        if (personality2?.confidence_score > 0) {
            completeness += personality2.confidence_score;
            factors += 1;
        }
        
        // 检查隐含分析完整性
        const implicit1 = analysisResult.implicitAnalysis?.member1;
        const implicit2 = analysisResult.implicitAnalysis?.member2;
        
        if (implicit1?.confidence_score > 0) {
            completeness += implicit1.confidence_score * 0.8; // 隐含分析权重稍低
            factors += 0.8;
        }
        
        if (implicit2?.confidence_score > 0) {
            completeness += implicit2.confidence_score * 0.8;
            factors += 0.8;
        }
        
        // 检查深度兼容性分析
        if (analysisResult.deepCompatibilityAnalysis?.recommendation_confidence > 0) {
            completeness += analysisResult.deepCompatibilityAnalysis.recommendation_confidence;
            factors += 1;
        }
        
        return factors > 0 ? completeness / factors : 0.5; // 默认中等完整性
    }
    
    /**
     * 生成深度分析的匹配原因
     */
    generateDeepAnalysisReason(analysisResult) {
        const score = analysisResult.score;
        const deepAnalysis = analysisResult.deepCompatibilityAnalysis;
        
        if (!deepAnalysis || deepAnalysis.compatibility_score === 0) {
            return `传统算法分析：评分 ${score}/10`;
        }
        
        const chemistry = deepAnalysis.reading_chemistry || 'unknown';
        const compatType = deepAnalysis.compatibility_type || 'unknown';
        const confidence = Math.round((deepAnalysis.recommendation_confidence || 0) * 100);
        
        let reason = `深度AI分析：${compatType}型匹配，`;
        
        switch (chemistry) {
            case 'explosive':
                reason += '化学反应强烈，极具潜力';
                break;
            case 'inspiring':
                reason += '相互启发，成长导向';
                break;
            case 'steady':
                reason += '稳定和谐，长期兼容';
                break;
            case 'challenging':
                reason += '互相挑战，促进成长';
                break;
            case 'gentle':
                reason += '温和共鸣，舒适匹配';
                break;
            default:
                reason += '综合兼容性良好';
        }
        
        reason += `（评分 ${score}/10，置信度 ${confidence}%）`;
        
        return reason;
    }
}

// 导出匹配引擎实例
export const matchingEngine = new MatchingEngine();