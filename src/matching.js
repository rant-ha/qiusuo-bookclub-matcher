// 匹配算法模块
// 包含相似性匹配、互补性匹配和AI语义匹配的核心业务逻辑

import { Logger, measureAsyncPerformance, shuffleArray } from './utils.js';
import { getAiSimilarity } from './api.js';
import { matchingEngine } from './matching/algorithms.js';
import { apiHealthMonitor } from './api/healthMonitor.js';

/**
 * 计算两个用户之间的相似度
 */
export function calculateSimilarity(member1, member2) {
    try {
        if (!member1 || !member2) {
            return 0;
        }

        let totalSimilarity = 0;
        let weightSum = 0;

        // 基本信息相似度 (权重: 0.1)
        const basicSimilarity = calculateBasicSimilarity(member1, member2);
        totalSimilarity += basicSimilarity * 0.1;
        weightSum += 0.1;

        // 阅读偏好相似度 (权重: 0.3)
        const readingSimilarity = calculateReadingPreferenceSimilarity(member1, member2);
        totalSimilarity += readingSimilarity * 0.3;
        weightSum += 0.3;

        // 兴趣爱好相似度 (权重: 0.4)
        const interestSimilarity = calculateInterestSimilarity(member1, member2);
        totalSimilarity += interestSimilarity * 0.4;
        weightSum += 0.4;

        // 性格特征相似度 (权重: 0.2)
        const personalitySimilarity = calculatePersonalitySimilarity(member1, member2);
        totalSimilarity += personalitySimilarity * 0.2;
        weightSum += 0.2;

        const finalSimilarity = weightSum > 0 ? Math.round(totalSimilarity / weightSum) : 0;
        
        Logger.debug('相似度计算完成', {
            members: [member1.name, member2.name],
            basic: basicSimilarity,
            reading: readingSimilarity,
            interest: interestSimilarity,
            personality: personalitySimilarity,
            final: finalSimilarity
        });

        return Math.max(0, Math.min(100, finalSimilarity));
    } catch (error) {
        Logger.error('相似度计算失败', error);
        return 0;
    }
}

/**
 * 计算两个用户之间的互补性
 */
export function calculateComplementarity(member1, member2) {
    try {
        if (!member1 || !member2) {
            return 0;
        }

        // 互补性基于差异度计算
        // 某些维度的差异可能是有益的（比如性格互补）
        let totalComplementarity = 0;
        let weightSum = 0;

        // 阅读类型互补 (权重: 0.3)
        const readingComplementarity = calculateReadingComplementarity(member1, member2);
        totalComplementarity += readingComplementarity * 0.3;
        weightSum += 0.3;

        // 兴趣互补 (权重: 0.4)
        const interestComplementarity = calculateInterestComplementarity(member1, member2);
        totalComplementarity += interestComplementarity * 0.4;
        weightSum += 0.4;

        // 性格互补 (权重: 0.3)
        const personalityComplementarity = calculatePersonalityComplementarity(member1, member2);
        totalComplementarity += personalityComplementarity * 0.3;
        weightSum += 0.3;

        const finalComplementarity = weightSum > 0 ? Math.round(totalComplementarity / weightSum) : 0;
        
        Logger.debug('互补性计算完成', {
            members: [member1.name, member2.name],
            reading: readingComplementarity,
            interest: interestComplementarity,
            personality: personalityComplementarity,
            final: finalComplementarity
        });

        return Math.max(0, Math.min(100, finalComplementarity));
    } catch (error) {
        Logger.error('互补性计算失败', error);
        return 0;
    }
}

/**
 * 执行匹配算法并返回结果（升级版）
 * 集成AI增强算法和自动降级机制
 */
export async function findMatches(currentUser, members, matchType, useAi = false) {
    try {
        if (!currentUser || !Array.isArray(members)) {
            throw new Error('参数无效');
        }

        // 检查API健康状态
        const healthStatus = apiHealthMonitor.getDegradationStatus();
        const actualUseAi = useAi && apiHealthMonitor.shouldUseAI();
        
        Logger.info('开始匹配', { 
            user: currentUser.name, 
            type: matchType, 
            requestedAi: useAi,
            actualUseAi,
            degraded: healthStatus.degraded,
            totalMembers: members.length 
        });

        return await measureAsyncPerformance('匹配算法执行', async () => {
            // 过滤掉当前用户和状态不符的成员
            const candidateMembers = members.filter(member => 
                member.studentId !== currentUser.studentId && 
                member.status === 'approved'
            );

            if (candidateMembers.length === 0) {
                return [];
            }

            let matches = [];

            switch (matchType) {
                case 'similar':
                    matches = await findSimilarMatches(currentUser, candidateMembers, actualUseAi);
                    break;
                case 'complementary':
                    matches = await findComplementaryMatches(currentUser, candidateMembers, actualUseAi);
                    break;
                case 'smart':
                    matches = await findSmartMatches(currentUser, candidateMembers, actualUseAi);
                    break;
                default:
                    throw new Error(`未知的匹配类型: ${matchType}`);
            }

            // 限制结果数量并排序
            const sortedMatches = matches
                .filter(match => match && match.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);

            Logger.info('匹配完成', {
                user: currentUser.name,
                type: matchType,
                requestedAi: useAi,
                actualUseAi,
                degraded: healthStatus.degraded,
                matches: sortedMatches.length,
                topScore: sortedMatches[0]?.score || 0
            });

            return sortedMatches;
        });

    } catch (error) {
        Logger.error('匹配过程失败', error);
        throw error;
    }
}

/**
 * 相似性匹配（升级版）
 * 使用AI增强算法或传统算法降级
 */
async function findSimilarMatches(currentUser, candidates, useAi) {
    const matches = [];
    const batchSize = apiHealthMonitor.getDynamicBatchSize();
    
    Logger.debug('开始相似性匹配', {
        candidateCount: candidates.length,
        useAi,
        batchSize
    });

    // 分批处理候选者
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, Math.min(i + batchSize, candidates.length));
        const batchPromises = batch.map(async (candidate) => {
            try {
                let matchResult;
                
                if (useAi) {
                    // 使用AI增强算法
                    matchResult = await matchingEngine.calculateAICompatibility(currentUser, candidate);
                } else {
                    // 使用传统算法
                    matchResult = await matchingEngine.calculateTraditionalCompatibility(currentUser, candidate);
                }
                
                if (matchResult.score > 0) {
                    return {
                        member: candidate,
                        score: matchResult.score,
                        type: 'similar',
                        details: {
                            reason: matchResult.reason,
                            commonInterests: matchResult.commonInterests || [],
                            matchType: matchResult.match_type || '相似性匹配',
                            confidenceLevel: matchResult.confidence_level,
                            degraded: matchResult.degraded || false,
                            analysis: matchResult.analysis
                        }
                    };
                }
                return null;
            } catch (error) {
                Logger.warn(`候选者匹配失败: ${candidate.name}`, error);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        matches.push(...batchResults.filter(result => result !== null));
        
        // 批次间延迟，避免API压力
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    Logger.debug('相似性匹配完成', {
        totalMatches: matches.length,
        avgScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0
    });

    return matches;
}

/**
 * 互补性匹配（升级版）
 * 使用AI增强算法分析用户间的互补性
 */
async function findComplementaryMatches(currentUser, candidates, useAi) {
    const matches = [];
    const batchSize = apiHealthMonitor.getDynamicBatchSize();
    
    Logger.debug('开始互补性匹配', {
        candidateCount: candidates.length,
        useAi,
        batchSize
    });

    // 分批处理候选者
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, Math.min(i + batchSize, candidates.length));
        const batchPromises = batch.map(async (candidate) => {
            try {
                let matchResult;
                
                if (useAi) {
                    // 使用AI增强算法进行互补性分析
                    matchResult = await matchingEngine.calculateAICompatibility(currentUser, candidate);
                    
                    // AI结果需要从相似性转换为互补性视角
                    if (matchResult.analysis?.ai_analysis) {
                        const aiAnalysis = matchResult.analysis.ai_analysis;
                        // 互补性分析：相似度低但兼容性高的情况
                        const complementarityScore = Math.max(0, 
                            (matchResult.score * 0.3) + // 基础兼容性
                            ((10 - (aiAnalysis.semantic_similarity || 50) / 10) * 0.7) // 差异度转互补性
                        );
                        matchResult.score = Math.round(complementarityScore);
                        matchResult.reason = `AI互补性分析：发现潜在的互补优势`;
                    }
                } else {
                    // 使用传统互补性算法
                    const complementarityScore = calculateComplementarity(currentUser, candidate);
                    matchResult = {
                        score: Math.min(Math.max(Math.round(complementarityScore / 10), 0), 10),
                        reason: `传统互补性分析：评分 ${Math.round(complementarityScore)}%`,
                        analysis: {
                            traditional_analysis: {
                                complementarity_score: complementarityScore
                            }
                        },
                        commonInterests: []
                    };
                }
                
                if (matchResult.score > 0) {
                    return {
                        member: candidate,
                        score: matchResult.score,
                        type: 'complementary',
                        details: {
                            reason: matchResult.reason,
                            commonInterests: matchResult.commonInterests || [],
                            matchType: matchResult.match_type || '互补性匹配',
                            confidenceLevel: matchResult.confidence_level,
                            degraded: matchResult.degraded || false,
                            analysis: matchResult.analysis
                        }
                    };
                }
                return null;
            } catch (error) {
                Logger.warn(`互补性匹配失败: ${candidate.name}`, error);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        matches.push(...batchResults.filter(result => result !== null));
        
        // 批次间延迟
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 120));
        }
    }

    Logger.debug('互补性匹配完成', {
        totalMatches: matches.length,
        avgScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0
    });

    return matches;
}

/**
 * 智能匹配（升级版）
 * 综合相似性和互补性，使用AI增强分析
 */
async function findSmartMatches(currentUser, candidates, useAi) {
    const matches = [];
    const batchSize = apiHealthMonitor.getDynamicBatchSize();
    
    Logger.debug('开始智能匹配', {
        candidateCount: candidates.length,
        useAi,
        batchSize
    });

    // 分批处理候选者
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, Math.min(i + batchSize, candidates.length));
        const batchPromises = batch.map(async (candidate) => {
            try {
                let matchResult;
                
                if (useAi) {
                    // 使用AI增强算法进行综合分析
                    matchResult = await matchingEngine.calculateAICompatibility(currentUser, candidate);
                } else {
                    // 传统智能匹配：结合相似性和互补性
                    const similarityScore = calculateSimilarity(currentUser, candidate);
                    const complementarityScore = calculateComplementarity(currentUser, candidate);
                    
                    const baseScore = Math.round(similarityScore * 0.6 + complementarityScore * 0.4);
                    
                    matchResult = {
                        score: Math.min(Math.max(Math.round(baseScore / 10), 0), 10), // 转换为0-10分
                        reason: `智能匹配分析：相似性${Math.round(similarityScore)}% + 互补性${Math.round(complementarityScore)}%`,
                        analysis: {
                            traditional_analysis: {
                                similarity_score: similarityScore,
                                complementarity_score: complementarityScore
                            }
                        },
                        commonInterests: generateMatchDetails(currentUser, candidate, 'smart').commonInterests
                    };
                }
                
                if (matchResult.score > 0) {
                    return {
                        member: candidate,
                        score: matchResult.score,
                        type: 'smart',
                        details: {
                            reason: matchResult.reason,
                            similarity: matchResult.analysis?.traditional_analysis?.similarity_score,
                            complementarity: matchResult.analysis?.traditional_analysis?.complementarity_score,
                            commonInterests: matchResult.commonInterests || [],
                            matchType: matchResult.match_type || '智能匹配',
                            confidenceLevel: matchResult.confidence_level,
                            degraded: matchResult.degraded || false,
                            analysis: matchResult.analysis
                        }
                    };
                }
                return null;
            } catch (error) {
                Logger.warn(`智能匹配失败: ${candidate.name}`, error);
                return null;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        matches.push(...batchResults.filter(result => result !== null));
        
        // 批次间延迟
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    Logger.debug('智能匹配完成', {
        totalMatches: matches.length,
        avgScore: matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0
    });

    return matches;
}

// === 细分相似度计算函数 ===

function calculateBasicSimilarity(member1, member2) {
    const q1 = member1.questionnaire?.basicInfo || {};
    const q2 = member2.questionnaire?.basicInfo || {};
    
    let matches = 0;
    let total = 0;
    
    // 年级相似度
    if (q1.grade && q2.grade) {
        matches += q1.grade === q2.grade ? 1 : 0;
        total += 1;
    }
    
    // 专业相似度
    if (q1.major && q2.major) {
        matches += q1.major === q2.major ? 1 : 0.5; // 同专业1分，不同专业0.5分
        total += 1;
    }
    
    return total > 0 ? (matches / total) * 100 : 0;
}

function calculateReadingPreferenceSimilarity(member1, member2) {
    const r1 = member1.questionnaire?.readingPreferences || {};
    const r2 = member2.questionnaire?.readingPreferences || {};
    
    // 获取书籍类型标签
    const types1 = getBookTypes(r1);
    const types2 = getBookTypes(r2);
    
    return calculateTagSimilarity(types1, types2);
}

function calculateInterestSimilarity(member1, member2) {
    const i1 = member1.questionnaire?.interests || {};
    const i2 = member2.questionnaire?.interests || {};
    
    // 获取兴趣标签
    const interests1 = getInterestTags(i1);
    const interests2 = getInterestTags(i2);
    
    return calculateTagSimilarity(interests1, interests2);
}

function calculatePersonalitySimilarity(member1, member2) {
    const p1 = member1.questionnaire?.personality || {};
    const p2 = member2.questionnaire?.personality || {};
    
    let similarity = 0;
    let count = 0;
    
    // 比较性格特征
    ['introversion', 'creativity', 'analyticalThinking', 'empathy'].forEach(trait => {
        if (p1[trait] && p2[trait]) {
            const diff = Math.abs(p1[trait] - p2[trait]);
            similarity += (5 - diff) / 5; // 转换为0-1相似度
            count += 1;
        }
    });
    
    return count > 0 ? (similarity / count) * 100 : 0;
}

// === 互补性计算函数 ===

function calculateReadingComplementarity(member1, member2) {
    const r1 = member1.questionnaire?.readingPreferences || {};
    const r2 = member2.questionnaire?.readingPreferences || {};
    
    const types1 = getBookTypes(r1);
    const types2 = getBookTypes(r2);
    
    // 互补性是差异的反面 - 不同类型的书籍偏好可能互补
    const overlap = types1.filter(type => types2.includes(type)).length;
    const totalUnique = new Set([...types1, ...types2]).size;
    
    return totalUnique > 0 ? ((totalUnique - overlap) / totalUnique) * 100 : 0;
}

function calculateInterestComplementarity(member1, member2) {
    const i1 = member1.questionnaire?.interests || {};
    const i2 = member2.questionnaire?.interests || {};
    
    const interests1 = getInterestTags(i1);
    const interests2 = getInterestTags(i2);
    
    // 计算差异度作为互补性
    const overlap = interests1.filter(interest => interests2.includes(interest)).length;
    const totalUnique = new Set([...interests1, ...interests2]).size;
    
    return totalUnique > 0 ? ((totalUnique - overlap) / totalUnique) * 100 : 0;
}

function calculatePersonalityComplementarity(member1, member2) {
    const p1 = member1.questionnaire?.personality || {};
    const p2 = member2.questionnaire?.personality || {};
    
    let complementarity = 0;
    let count = 0;
    
    // 某些性格特征的差异可能是互补的
    ['introversion', 'creativity', 'analyticalThinking', 'empathy'].forEach(trait => {
        if (p1[trait] && p2[trait]) {
            const diff = Math.abs(p1[trait] - p2[trait]);
            complementarity += diff / 5; // 差异越大，互补性越强
            count += 1;
        }
    });
    
    return count > 0 ? (complementarity / count) * 100 : 0;
}

// === AI增强函数 ===

async function calculateAiSimilarity(member1, member2) {
    try {
        const interests1 = getInterestTags(member1.questionnaire?.interests || {});
        const interests2 = getInterestTags(member2.questionnaire?.interests || {});
        
        if (interests1.length === 0 || interests2.length === 0) {
            return 0;
        }
        
        return await getAiSimilarity(interests1, interests2);
    } catch (error) {
        Logger.warn('AI相似度计算失败', error);
        return 0;
    }
}

async function calculateAiComplementarity(member1, member2) {
    try {
        const interests1 = getInterestTags(member1.questionnaire?.interests || {});
        const interests2 = getInterestTags(member2.questionnaire?.interests || {});
        
        if (interests1.length === 0 || interests2.length === 0) {
            return 0;
        }
        
        // AI分析互补性（这里可以用不同的提示词）
        const similarity = await getAiSimilarity(interests1, interests2);
        return 100 - similarity; // 相似度的反面作为互补性
    } catch (error) {
        Logger.warn('AI互补性计算失败', error);
        return 0;
    }
}

// === 辅助函数 ===

function calculateTagSimilarity(tags1, tags2) {
    if (tags1.length === 0 && tags2.length === 0) return 0;
    if (tags1.length === 0 || tags2.length === 0) return 0;
    
    const intersection = tags1.filter(tag => tags2.includes(tag));
    const union = new Set([...tags1, ...tags2]);
    
    return (intersection.length / union.size) * 100;
}

function getBookTypes(readingPreferences) {
    const types = [];
    if (readingPreferences.fiction) types.push('小说');
    if (readingPreferences.nonFiction) types.push('非小说');
    if (readingPreferences.biography) types.push('传记');
    if (readingPreferences.history) types.push('历史');
    if (readingPreferences.science) types.push('科学');
    if (readingPreferences.philosophy) types.push('哲学');
    if (readingPreferences.psychology) types.push('心理学');
    if (readingPreferences.selfHelp) types.push('自助');
    return types;
}

function getInterestTags(interests) {
    const tags = [];
    Object.entries(interests).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
            // 分割标签并清理
            const keyTags = value.split(/[,，、\s]+/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            tags.push(...keyTags);
        }
    });
    return [...new Set(tags)]; // 去重
}

function generateMatchDetails(member1, member2, matchType) {
    const details = {
        commonInterests: [],
        complementaryAspects: [],
        matchReason: ''
    };
    
    // 找出共同兴趣
    const interests1 = getInterestTags(member1.questionnaire?.interests || {});
    const interests2 = getInterestTags(member2.questionnaire?.interests || {});
    details.commonInterests = interests1.filter(interest => interests2.includes(interest));
    
    // 根据匹配类型生成原因
    switch (matchType) {
        case 'similar':
            details.matchReason = `你们有 ${details.commonInterests.length} 个共同兴趣`;
            break;
        case 'complementary':
            details.matchReason = '你们的兴趣和性格具有很好的互补性';
            break;
        case 'smart':
            details.matchReason = '综合考虑相似性和互补性，你们很匹配';
            break;
    }
    
    return details;
}

// === 批量匹配优化 ===

/**
 * 批量预计算匹配分数（用于性能优化）
 */
export function precomputeMatchScores(members, matchType = 'similar') {
    const scoreMatrix = new Map();
    
    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            const member1 = members[i];
            const member2 = members[j];
            const key = `${member1.studentId}-${member2.studentId}`;
            
            let score = 0;
            switch (matchType) {
                case 'similar':
                    score = calculateSimilarity(member1, member2);
                    break;
                case 'complementary':
                    score = calculateComplementarity(member1, member2);
                    break;
            }
            
            scoreMatrix.set(key, score);
        }
    }
    
    Logger.info('匹配分数预计算完成', { 
        members: members.length,
        pairs: scoreMatrix.size 
    });
    
    return scoreMatrix;
}