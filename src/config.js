// 应用程序配置和常量
// 从环境变量中获取配置信息

// 角色和权限定义
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    REGULAR_ADMIN: 'regular_admin',
    LEGACY_ADMIN: 'legacy_admin'
};

export const PERMISSIONS = {
    USER_MANAGEMENT: 'user_management',
    SYSTEM_MONITORING: 'system_monitoring',
    API_MANAGEMENT: 'api_management',
    CACHE_MANAGEMENT: 'cache_management',
    MEMBER_MANAGEMENT: 'member_management',
    MATCHING_FUNCTIONS: 'matching_functions',
    DATA_REFRESH: 'data_refresh',
    SYSTEM_CONFIG: 'system_config'
};

// 管理员角色配置
export const ADMIN_ROLE_CONFIG = {
    [ROLES.SUPER_ADMIN]: {
        icon: '👑',
        text: '超级管理员',
        description: '拥有所有系统权限'
    },
    [ROLES.REGULAR_ADMIN]: {
        icon: '⚙️',
        text: '管理员',
        description: '拥有管理权限'
    },
    [ROLES.LEGACY_ADMIN]: {
        icon: '⚙️',
        text: '管理员',
        description: '拥有管理权限'
    }
};

// 权限配置 - 集中管理便于维护
export const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.USER_MANAGEMENT,
        PERMISSIONS.SYSTEM_MONITORING,
        PERMISSIONS.API_MANAGEMENT,
        PERMISSIONS.CACHE_MANAGEMENT,
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS,
        PERMISSIONS.DATA_REFRESH,
        PERMISSIONS.SYSTEM_CONFIG
    ],
    [ROLES.REGULAR_ADMIN]: [
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS,
        PERMISSIONS.DATA_REFRESH
    ],
    [ROLES.LEGACY_ADMIN]: [
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS,
        PERMISSIONS.DATA_REFRESH
    ]
};

// 环境变量配置
export const CONFIG = {
    // GitHub Gist 配置
    GITHUB_TOKEN: import.meta.env.VITE_GITHUB_TOKEN,
    GIST_ID: import.meta.env.VITE_GIST_ID,
    
    // 管理员密码
    ADMIN_PASSWORD: import.meta.env.VITE_ADMIN_PASSWORD,
    SUPER_ADMIN_PASSWORD: import.meta.env.VITE_SUPER_ADMIN_PASSWORD,
    REGULAR_ADMIN_PASSWORD: import.meta.env.VITE_REGULAR_ADMIN_PASSWORD,
    
    // AI 服务配置
    AI_BASE_URL: import.meta.env.VITE_AI_BASE_URL,
    AI_API_KEY: import.meta.env.VITE_AI_API_KEY,
    AI_MODEL_NAME: import.meta.env.VITE_AI_MODEL_NAME || 'gpt-4.1-mini',
    
    // 文件名常量
    GIST_FILENAME: 'bookclub_members.json',
    AUDIT_LOG_FILENAME: 'audit_log.json'
};

// 开发模式检查
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

// 匹配算法默认权重配置
export const DEFAULT_MATCHING_WEIGHTS = {
    traditional: {
        basic: 0.1,           // 基本信息权重
        reading: 0.3,         // 阅读偏好权重
        interest: 0.4,        // 兴趣爱好权重
        personality: 0.2      // 性格特征权重
    },
    ai: {
        traditional: 0.7,     // 传统算法权重
        semantic: 0.3         // AI语义分析权重
    },
    smart: {
        similarity: 0.6,      // 相似性权重
        complementarity: 0.4  // 互补性权重
    },
    deep: {
        traditional_similarity: 0.25,    // 传统相似度权重
        personality_compatibility: 0.35, // 人格兼容度权重
        implicit_resonance: 0.25,       // 隐含共鸣权重
        growth_potential: 0.15           // 成长潜力权重
    }
};

// 权重配置的元数据
export const MATCHING_WEIGHT_METADATA = {
    traditional: {
        name: '传统匹配算法',
        description: '基于基本信息、阅读偏好、兴趣爱好和性格特征的传统匹配算法',
        factors: {
            basic: { name: '基本信息', description: '年级、专业等基本信息的匹配度' },
            reading: { name: '阅读偏好', description: '书籍类别、阅读承诺等偏好的匹配度' },
            interest: { name: '兴趣爱好', description: '喜欢的书籍、兴趣爱好的匹配度' },
            personality: { name: '性格特征', description: '性格特征的匹配度' }
        }
    },
    ai: {
        name: 'AI增强匹配算法',
        description: '结合传统算法和AI语义分析的增强匹配算法',
        factors: {
            traditional: { name: '传统算法', description: '传统匹配算法的结果权重' },
            semantic: { name: 'AI语义分析', description: 'AI语义分析的结果权重' }
        }
    },
    smart: {
        name: '智能匹配算法',
        description: '平衡相似性和互补性的智能匹配算法',
        factors: {
            similarity: { name: '相似性', description: '用户间的相似程度权重' },
            complementarity: { name: '互补性', description: '用户间的互补程度权重' }
        }
    },
    deep: {
        name: '深度兼容性分析',
        description: '多维度深度分析的匹配算法',
        factors: {
            traditional_similarity: { name: '传统相似度', description: '基础相似度分析权重' },
            personality_compatibility: { name: '人格兼容度', description: '性格特征兼容度权重' },
            implicit_resonance: { name: '隐含共鸣', description: '深层兴趣共鸣权重' },
            growth_potential: { name: '成长潜力', description: '匹配后成长潜力权重' }
        }
    }
};