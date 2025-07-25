// 深度AI分析功能测试
// 验证恢复的深度分析功能是否正常工作

import { deepAIAnalysisEngine } from './ai/deepAnalysis.js';
import { matchingEngine } from './matching/algorithms.js';

/**
 * 简单的功能验证测试
 */
async function testDeepAnalysisIntegration() {
    console.log('🧪 开始深度AI分析功能测试...\n');
    
    // 模拟用户数据
    const testUser1 = {
        name: '测试用户1',
        studentId: 'test001',
        questionnaire: {
            personalDescription: '喜欢科幻小说和心理学书籍，对人类行为很感兴趣',
            favoriteBooks: ['《三体》', '《心理学与生活》', '《人类简史》'],
            bookCategories: ['sci_fi_fantasy', 'social_science_philosophy'],
            personality: {
                introversion: 3,
                creativity: 4,
                analyticalThinking: 5,
                empathy: 4
            },
            gender: 'male',
            matchGenderPreference: 'no_preference'
        }
    };
    
    const testUser2 = {
        name: '测试用户2',
        studentId: 'test002',
        questionnaire: {
            personalDescription: '热爱文学作品，尤其是现代小说，关注社会问题',
            favoriteBooks: ['《百年孤独》', '《挪威的森林》', '《活着》'],
            bookCategories: ['literature_fiction', 'social_science_philosophy'],
            personality: {
                introversion: 4,
                creativity: 5,
                analyticalThinking: 3,
                empathy: 5
            },
            gender: 'female',
            matchGenderPreference: 'no_preference'
        }
    };
    
    try {
        // 测试1: 阅读人格分析
        console.log('📊 测试1: 阅读人格分析');
        const personality1 = await deepAIAnalysisEngine.getReadingPersonalityProfile(
            testUser1.questionnaire.personalDescription,
            testUser1.questionnaire.favoriteBooks
        );
        console.log('用户1人格分析结果：', {
            confidence: personality1.confidence_score,
            cognitive_style: personality1.cognitive_style,
            has_dimensions: Object.keys(personality1.personality_dimensions).length > 0
        });
        
        // 测试2: 隐含偏好分析
        console.log('\n🔍 测试2: 隐含偏好分析');
        const implicit1 = await deepAIAnalysisEngine.getImplicitPreferenceAnalysis(
            testUser1.questionnaire.personalDescription,
            testUser1.questionnaire.favoriteBooks,
            testUser1.questionnaire.bookCategories
        );
        console.log('用户1隐含分析结果：', {
            confidence: implicit1.confidence_score,
            themes_count: implicit1.implicit_themes.length,
            patterns_count: implicit1.hidden_patterns.length
        });
        
        // 测试3: 深度兼容性分析
        console.log('\n💫 测试3: 深度兼容性分析');
        if (personality1.confidence_score > 0.3) {
            const personality2 = await deepAIAnalysisEngine.getReadingPersonalityProfile(
                testUser2.questionnaire.personalDescription,
                testUser2.questionnaire.favoriteBooks
            );
            
            const implicit2 = await deepAIAnalysisEngine.getImplicitPreferenceAnalysis(
                testUser2.questionnaire.personalDescription,
                testUser2.questionnaire.favoriteBooks,
                testUser2.questionnaire.bookCategories
            );
            
            if (personality2.confidence_score > 0.3) {
                const compatibility = await deepAIAnalysisEngine.getDeepCompatibilityAnalysis(
                    personality1, personality2, implicit1, implicit2
                );
                
                console.log('深度兼容性分析结果：', {
                    compatibility_score: compatibility.compatibility_score,
                    compatibility_type: compatibility.compatibility_type,
                    reading_chemistry: compatibility.reading_chemistry,
                    confidence: compatibility.recommendation_confidence
                });
            }
        }
        
        // 测试4: 完整匹配算法集成
        console.log('\n🎯 测试4: 完整匹配算法集成');
        const matchResult = await matchingEngine.calculateAICompatibility(testUser1, testUser2);
        console.log('完整匹配结果：', {
            score: matchResult.score,
            reason: matchResult.reason,
            has_deep_analysis: !!matchResult.deepCompatibilityAnalysis,
            degraded: matchResult.degraded || false
        });
        
        console.log('\n✅ 深度AI分析功能测试完成！');
        
        // 返回测试结果摘要
        return {
            success: true,
            personality_analysis: personality1.confidence_score > 0,
            implicit_analysis: implicit1.confidence_score > 0,
            compatibility_analysis: matchResult.deepCompatibilityAnalysis?.compatibility_score > 0,
            final_score: matchResult.score,
            integration_working: matchResult.score > 0 && !matchResult.degraded
        };
        
    } catch (error) {
        console.error('❌ 测试失败：', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    testDeepAnalysisIntegration().then(result => {
        console.log('\n📋 测试摘要：', result);
        process.exit(result.success ? 0 : 1);
    });
}

export { testDeepAnalysisIntegration };