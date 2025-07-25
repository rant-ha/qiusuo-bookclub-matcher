// 应用程序主入口
// 负责初始化、协调各个模块并启动应用

import { store } from './state.js';
import { Logger } from './utils.js';
import { testConnection } from './api.js';
import { validateSession } from './auth.js';
import { showLoginView, showLoggedInView, initializeEventListeners } from './ui/views.js';
import { configManager } from './admin/configManager.js';

/**
 * 应用程序初始化函数
 */
export async function initializeApp() {
    try {
        Logger.info('🚀 应用程序启动中...');

        // 阶段1: 基础初始化
        await initializeCore();

        // 阶段1.5: 加载动态配置
        await configManager.loadConfig();

        // 阶段2: 恢复用户会话
        await restoreUserSession();

        // 阶段3: 初始化UI
        await initializeUI();

        // 阶段4: 连接测试
        await performConnectionTest();

        Logger.info('✅ 应用程序启动完成');
        
    } catch (error) {
        Logger.error('❌ 应用程序启动失败', error);
        showErrorState(error.message);
    }
}

/**
 * 核心系统初始化
 */
async function initializeCore() {
    Logger.info('🔧 初始化核心系统...');
    
    // 初始化状态管理
    store.debug();
    
    // 设置全局错误处理
    setupGlobalErrorHandling();
    
    // 设置性能监控
    if (import.meta.env.DEV) {
        setupPerformanceMonitoring();
    }
    
    Logger.info('✅ 核心系统初始化完成');
}

/**
 * 恢复用户会话
 */
async function restoreUserSession() {
    Logger.info('🔄 恢复用户会话...');
    
    try {
        // 从 sessionStorage 恢复状态
        store.restoreSession();
        
        // 验证会话有效性
        const sessionValidation = validateSession();
        
        if (sessionValidation.valid) {
            Logger.info('✅ 用户会话恢复成功', {
                user: sessionValidation.user?.name,
                isAdmin: sessionValidation.isAdmin
            });
        } else {
            Logger.info('ℹ️ 未找到有效会话，将显示登录页面');
            store.clearSession();
        }
        
    } catch (error) {
        Logger.warn('⚠️ 会话恢复失败，清除无效会话', error);
        store.clearSession();
    }
}

/**
 * 初始化用户界面
 */
async function initializeUI() {
    Logger.info('🎨 初始化用户界面...');
    
    try {
        // 初始化事件监听器
        initializeEventListeners();
        
        // 根据当前状态显示相应界面
        const currentUser = store.getCurrentUser();
        
        if (currentUser) {
            await showLoggedInView();
        } else {
            showLoginView();
        }
        
        // 订阅状态变化
        setupStateSubscriptions();
        
        Logger.info('✅ 用户界面初始化完成');
        
    } catch (error) {
        Logger.error('❌ UI初始化失败', error);
        throw new Error('界面初始化失败，请刷新页面重试');
    }
}

/**
 * 执行连接测试
 */
async function performConnectionTest() {
    Logger.info('🔗 测试外部服务连接...');
    
    try {
        const connectionResult = await testConnection();
        
        if (connectionResult.success) {
            Logger.info('✅ 服务连接正常');
            store.setError(null);
        } else {
            Logger.warn('⚠️ 服务连接异常', connectionResult.message);
            store.setError(`服务连接异常: ${connectionResult.message}`);
        }
        
    } catch (error) {
        Logger.warn('⚠️ 连接测试失败', error);
        store.setError('无法连接到服务器，部分功能可能受限');
    }
}

/**
 * 设置状态订阅
 */
function setupStateSubscriptions() {
    Logger.debug('📡 设置状态订阅...');
    
    // 订阅用户状态变化
    store.subscribe((state, changeType) => {
        if (changeType === 'currentUser') {
            handleUserStateChange(state.currentUser);
        }
    }, 'currentUser');
    
    // 订阅管理员状态变化
    store.subscribe((state, changeType) => {
        if (changeType === 'admin') {
            handleAdminStateChange(state.isAdmin, state.currentAdminRole);
        }
    }, 'admin');
    
    // 订阅错误状态变化
    store.subscribe((state, changeType) => {
        if (changeType === 'error') {
            handleErrorStateChange(state.errorMessage);
        }
    }, 'error');
    
    // 订阅加载状态变化
    store.subscribe((state, changeType) => {
        if (changeType === 'loading') {
            handleLoadingStateChange(state.isLoading);
        }
    }, 'loading');
}

/**
 * 处理用户状态变化
 */
function handleUserStateChange(currentUser) {
    Logger.debug('👤 用户状态变化', { user: currentUser?.name });
    
    if (currentUser) {
        // 用户登录成功
        showLoggedInView();
        updateUserIndicator(currentUser);
    } else {
        // 用户登出
        showLoginView();
        clearUserIndicator();
    }
}

/**
 * 处理管理员状态变化
 */
function handleAdminStateChange(isAdmin, adminRole) {
    Logger.debug('🔐 管理员状态变化', { isAdmin, role: adminRole });
    
    if (isAdmin) {
        updateAdminIndicator(adminRole);
        updateAdminTheme(adminRole);
    } else {
        clearAdminIndicator();
        clearAdminTheme();
    }
}

/**
 * 处理错误状态变化
 */
function handleErrorStateChange(errorMessage) {
    const errorContainer = document.getElementById('errorContainer');
    
    if (errorMessage) {
        if (errorContainer) {
            errorContainer.textContent = errorMessage;
            errorContainer.style.display = 'block';
        } else {
            // 如果没有错误容器，使用alert作为后备
            console.error('Error:', errorMessage);
        }
    } else {
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }
}

/**
 * 处理加载状态变化
 */
function handleLoadingStateChange(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // 更新页面光标
    document.body.style.cursor = isLoading ? 'wait' : 'default';
}

/**
 * 更新用户指示器
 */
function updateUserIndicator(user) {
    const indicator = document.getElementById('userIndicator');
    if (indicator) {
        indicator.textContent = `欢迎，${user.name}`;
        indicator.style.display = 'inline';
    }
}

/**
 * 清除用户指示器
 */
function clearUserIndicator() {
    const indicator = document.getElementById('userIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * 更新管理员指示器
 */
function updateAdminIndicator(role) {
    const indicator = document.getElementById('adminRoleIndicator');
    if (indicator) {
        const config = {
            super_admin: { icon: '👑', text: '超级管理员' },
            regular_admin: { icon: '⚙️', text: '管理员' },
            legacy_admin: { icon: '⚙️', text: '管理员' }
        };
        
        const roleConfig = config[role] || config.regular_admin;
        indicator.innerHTML = `
            <span class="admin-role-icon">${roleConfig.icon}</span>
            <span class="admin-role-text">${roleConfig.text}</span>
        `;
        indicator.style.display = 'inline-flex';
    }
}

/**
 * 清除管理员指示器
 */
function clearAdminIndicator() {
    const indicator = document.getElementById('adminRoleIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * 更新管理员主题
 */
function updateAdminTheme(role) {
    document.body.classList.remove('super-admin-theme', 'regular-admin-theme', 'legacy-admin-theme');
    
    if (role) {
        document.body.classList.add('admin-theme');
        document.body.classList.add(`${role.replace('_', '-')}-theme`);
    }
}

/**
 * 清除管理员主题
 */
function clearAdminTheme() {
    document.body.classList.remove(
        'admin-theme', 
        'super-admin-theme', 
        'regular-admin-theme', 
        'legacy-admin-theme'
    );
}

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling() {
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
        Logger.error('未处理的Promise错误', event.reason);
        store.setError('系统发生异常，请刷新页面重试');
        event.preventDefault();
    });
    
    // 捕获JavaScript运行时错误
    window.addEventListener('error', (event) => {
        Logger.error('JavaScript运行时错误', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // 对于严重错误，显示错误消息
        if (event.error && event.error.name !== 'ChunkLoadError') {
            store.setError('页面发生错误，请刷新页面重试');
        }
    });
}

/**
 * 设置性能监控
 */
function setupPerformanceMonitoring() {
    // 监控页面加载性能
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            Logger.info('页面加载性能', {
                totalLoadTime: `${loadTime}ms`,
                domReady: `${timing.domContentLoadedEventEnd - timing.navigationStart}ms`,
                firstPaint: `${timing.responseEnd - timing.navigationStart}ms`
            });
        }, 0);
    });
    
    // 监控内存使用（如果浏览器支持）
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            Logger.debug('内存使用情况', {
                used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
                total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
                limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
            });
        }, 30000); // 每30秒记录一次
    }
}

/**
 * 显示错误状态
 */
function showErrorState(message) {
    const app = document.getElementById('app') || document.body;
    app.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <h1 style="color: #e74c3c; margin-bottom: 20px;">⚠️ 应用启动失败</h1>
            <p style="color: #7f8c8d; margin-bottom: 30px; max-width: 500px;">
                ${message}
            </p>
            <button onclick="location.reload()" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
            ">
                刷新页面
            </button>
        </div>
    `;
}

/**
 * 应用程序关闭清理
 */
export function shutdownApp() {
    Logger.info('🔌 应用程序关闭中...');
    
    // 清理状态
    store.clearSession();
    
    // 移除事件监听器
    // (具体的清理逻辑可以在各个模块中实现)
    
    Logger.info('✅ 应用程序已关闭');
}

// 在页面卸载时清理资源
window.addEventListener('beforeunload', shutdownApp);

// 开发模式下暴露到全局，便于调试
if (import.meta.env.DEV) {
    window.__app = {
        store,
        initializeApp,
        shutdownApp
    };
}