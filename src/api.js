// API 层 - 封装所有外部数据交互
// 使应用的其余部分与数据源（GitHub Gist）解耦

import { CONFIG } from './config.js';
import { Logger, handleAsyncError } from './utils.js';

// API 基础配置
const API_BASE_URL = 'https://api.github.com';

// 通用请求函数
async function makeRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        Logger.debug('API请求', { url, options: finalOptions });
        
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        Logger.debug('API响应', { url, data });
        
        return data;
    } catch (error) {
        Logger.error('API请求失败', { url, error });
        throw error;
    }
}

// === GitHub Gist 相关 API ===

/**
 * 加载成员数据
 */
export async function loadMembers() {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub Gist配置不完整');
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        const gist = await makeRequest(url);
        
        const fileContent = gist.files[CONFIG.GIST_FILENAME];
        if (!fileContent) {
            Logger.warn('Gist中未找到成员数据文件');
            return [];
        }

        const members = JSON.parse(fileContent.content);
        Logger.info(`成功加载 ${members.length} 个成员数据`);
        
        return Array.isArray(members) ? members : [];
    } catch (error) {
        const errorMsg = handleAsyncError(error, '加载成员数据');
        throw new Error(errorMsg);
    }
}

/**
 * 保存成员数据
 */
export async function saveMembers(members) {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub Gist配置不完整');
        }

        if (!Array.isArray(members)) {
            throw new Error('成员数据必须是数组格式');
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        const updateData = {
            files: {
                [CONFIG.GIST_FILENAME]: {
                    content: JSON.stringify(members, null, 2)
                }
            }
        };

        await makeRequest(url, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });

        Logger.info(`成功保存 ${members.length} 个成员数据`);
        return true;
    } catch (error) {
        const errorMsg = handleAsyncError(error, '保存成员数据');
        throw new Error(errorMsg);
    }
}

/**
 * 加载审计日志
 */
export async function loadAuditLogs() {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub Gist配置不完整');
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        const gist = await makeRequest(url);
        
        const fileContent = gist.files[CONFIG.AUDIT_LOG_FILENAME];
        if (!fileContent) {
            Logger.info('未找到审计日志文件，返回空数组');
            return [];
        }

        const logs = JSON.parse(fileContent.content);
        Logger.info(`成功加载 ${logs.length} 条审计日志`);
        
        return Array.isArray(logs) ? logs : [];
    } catch (error) {
        Logger.warn('加载审计日志失败，返回空数组', error);
        return []; // 审计日志加载失败不应该阻止应用运行
    }
}

/**
 * 保存审计日志
 */
export async function saveAuditLogs(logs) {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            Logger.warn('GitHub Gist配置不完整，无法保存审计日志');
            return false;
        }

        if (!Array.isArray(logs)) {
            Logger.warn('审计日志数据格式错误');
            return false;
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        
        // 获取当前 Gist 内容
        const gist = await makeRequest(url);
        
        // 准备更新数据，保留现有文件
        const updateData = {
            files: {
                ...Object.keys(gist.files).reduce((acc, fileName) => {
                    acc[fileName] = { content: gist.files[fileName].content };
                    return acc;
                }, {}),
                [CONFIG.AUDIT_LOG_FILENAME]: {
                    content: JSON.stringify(logs, null, 2)
                }
            }
        };

        await makeRequest(url, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });

        Logger.info(`成功保存 ${logs.length} 条审计日志`);
        return true;
    } catch (error) {
        Logger.error('保存审计日志失败', error);
        return false; // 审计日志保存失败不应该阻止主要功能
    }
}

/**
 * 加载系统配置
 */
export async function loadSystemConfig() {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            Logger.warn('GitHub Gist配置不完整');
            return {};
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        const gist = await makeRequest(url);
        
        const configFileName = 'system_config.json';
        const fileContent = gist.files[configFileName];
        
        if (!fileContent) {
            Logger.info('未找到系统配置文件，使用默认配置');
            return getDefaultSystemConfig();
        }

        const config = JSON.parse(fileContent.content);
        Logger.info('成功加载系统配置');
        
        return { ...getDefaultSystemConfig(), ...config };
    } catch (error) {
        Logger.warn('加载系统配置失败，使用默认配置', error);
        return getDefaultSystemConfig();
    }
}

/**
 * 保存系统配置
 */
export async function saveSystemConfig(config) {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            throw new Error('GitHub Gist配置不完整');
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        const gist = await makeRequest(url);
        
        const configFileName = 'system_config.json';
        const updateData = {
            files: {
                ...Object.keys(gist.files).reduce((acc, fileName) => {
                    acc[fileName] = { content: gist.files[fileName].content };
                    return acc;
                }, {}),
                [configFileName]: {
                    content: JSON.stringify(config, null, 2)
                }
            }
        };

        await makeRequest(url, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });

        Logger.info('系统配置保存成功');
        return true;
    } catch (error) {
        const errorMsg = handleAsyncError(error, '保存系统配置');
        throw new Error(errorMsg);
    }
}

// 默认系统配置
function getDefaultSystemConfig() {
    return {
        enableAiMatching: true,
        maxMatchingResults: 10,
        matchingCooldownHours: 24,
        autoApproveMembers: false,
        enableAuditLog: true,
        systemMaintenanceMode: false
    };
}

// === AI 服务相关 API ===

/**
 * 获取AI语义相似度
 */
export async function getAiSimilarity(interests1, interests2) {
    try {
        if (!CONFIG.AI_BASE_URL || !CONFIG.AI_API_KEY) {
            Logger.warn('AI服务配置不完整，跳过语义分析');
            return 0;
        }

        const prompt = `比较以下两组兴趣标签的语义相似度，返回0-100的相似度分数：
组1: ${interests1.join(', ')}
组2: ${interests2.join(', ')}

请只返回数字分数，不要其他解释。`;

        const response = await fetch(CONFIG.AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.AI_MODEL_NAME,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 10,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`AI API错误: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        const similarity = parseInt(content) || 0;
        
        Logger.debug('AI语义相似度计算完成', { 
            interests1, interests2, similarity 
        });
        
        return Math.max(0, Math.min(100, similarity)); // 确保在0-100范围内
    } catch (error) {
        Logger.warn('AI语义分析失败，返回默认值', error);
        return 0; // 失败时返回0，不影响其他匹配逻辑
    }
}

// === 缓存机制 ===
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 带缓存的数据加载
 */
export async function loadMembersWithCache() {
    const cacheKey = 'members';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        Logger.debug('使用缓存的成员数据');
        return cached.data;
    }
    
    const members = await loadMembers();
    cache.set(cacheKey, {
        data: members,
        timestamp: Date.now()
    });
    
    return members;
}

/**
 * 清除缓存
 */
export function clearCache() {
    cache.clear();
    Logger.info('API缓存已清除');
}

// === 连接测试 ===
export async function testConnection() {
    try {
        if (!CONFIG.GIST_ID || !CONFIG.GITHUB_TOKEN) {
            return {
                success: false,
                message: 'GitHub配置不完整'
            };
        }

        const url = `${API_BASE_URL}/gists/${CONFIG.GIST_ID}`;
        await makeRequest(url);
        
        return {
            success: true,
            message: 'GitHub Gist连接正常'
        };
    } catch (error) {
        return {
            success: false,
            message: `连接失败: ${error.message}`
        };
    }
}