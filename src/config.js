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
    DATA_REFRESH: 'data_refresh'
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
        PERMISSIONS.DATA_REFRESH
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