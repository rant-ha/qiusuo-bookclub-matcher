// 主题管理系统
// 支持深色/浅色主题切换，适配Netlify部署环境

import { Logger } from '../utils.js';

/**
 * 主题管理器类
 * 负责主题切换、保存用户偏好、动态样式应用
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'light'; // 默认浅色主题
        this.themes = {
            light: {
                name: '浅色主题',
                icon: '☀️',
                colors: {
                    primary: '#2563eb',
                    secondary: '#64748b',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    card: '#ffffff',
                    text: '#1e293b',
                    textSecondary: '#64748b',
                    border: '#e2e8f0',
                    success: '#10b981',
                    warning: '#f59e0b',
                    error: '#ef4444',
                    info: '#3b82f6'
                }
            },
            dark: {
                name: '深色主题',
                icon: '🌙',
                colors: {
                    primary: '#3b82f6',
                    secondary: '#94a3b8',
                    background: '#0f172a',
                    surface: '#1e293b',
                    card: '#334155',
                    text: '#f1f5f9',
                    textSecondary: '#94a3b8',
                    border: '#475569',
                    success: '#22c55e',
                    warning: '#fbbf24',
                    error: '#f87171',
                    info: '#60a5fa'
                }
            },
            auto: {
                name: '跟随系统',
                icon: '🔄',
                colors: null // 自动检测系统主题
            }
        };
        
        this.mediaQuery = null;
        this.initialized = false;
        
        Logger.info('主题管理器初始化');
    }

    /**
     * 初始化主题系统
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // 从localStorage加载用户主题偏好
            const savedTheme = localStorage.getItem('userTheme') || 'light';
            
            // 设置系统主题检测
            if (window.matchMedia) {
                this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                this.mediaQuery.addEventListener('change', () => {
                    if (this.currentTheme === 'auto') {
                        this.applySystemTheme();
                    }
                });
            }

            // 应用保存的主题
            await this.setTheme(savedTheme);
            
            this.initialized = true;
            Logger.info('✅ 主题系统初始化完成', { theme: this.currentTheme });
            
        } catch (error) {
            Logger.error('主题系统初始化失败', error);
            // 回退到默认主题
            await this.setTheme('light');
        }
    }

    /**
     * 设置主题
     * @param {string} themeName - 主题名称 ('light', 'dark', 'auto')
     */
    async setTheme(themeName) {
        if (!this.themes[themeName]) {
            Logger.warn(`未知主题: ${themeName}，使用默认主题`);
            themeName = 'light';
        }

        this.currentTheme = themeName;
        
        // 保存到localStorage
        localStorage.setItem('userTheme', themeName);

        if (themeName === 'auto') {
            this.applySystemTheme();
        } else {
            this.applyTheme(this.themes[themeName]);
        }

        // 触发主题变更事件
        this.dispatchThemeChangeEvent(themeName);
        
        Logger.info('主题已切换', { 
            theme: themeName, 
            actualTheme: this.getActualTheme() 
        });
    }

    /**
     * 应用系统主题
     */
    applySystemTheme() {
        const prefersDark = this.mediaQuery && this.mediaQuery.matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        this.applyTheme(this.themes[systemTheme]);
        
        Logger.debug('应用系统主题', { systemTheme, prefersDark });
    }

    /**
     * 应用主题样式
     * @param {Object} theme - 主题配置对象
     */
    applyTheme(theme) {
        if (!theme || !theme.colors) return;

        const root = document.documentElement;
        
        // 应用CSS自定义属性
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });

        // 更新body类名用于条件样式
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${this.getActualTheme()}`);

        // 更新meta标签（移动端状态栏）
        this.updateMetaThemeColor(theme.colors.primary);
    }

    /**
     * 更新移动端主题色
     * @param {string} color - 主题色
     */
    updateMetaThemeColor(color) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = color;
    }

    /**
     * 获取当前实际应用的主题
     * @returns {string} 实际主题名称
     */
    getActualTheme() {
        if (this.currentTheme === 'auto') {
            return this.mediaQuery && this.mediaQuery.matches ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    /**
     * 获取当前主题配置
     * @returns {Object} 主题配置
     */
    getCurrentThemeConfig() {
        const actualTheme = this.getActualTheme();
        return this.themes[actualTheme];
    }

    /**
     * 获取所有可用主题
     * @returns {Object} 主题列表
     */
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            key,
            name: this.themes[key].name,
            icon: this.themes[key].icon,
            current: this.currentTheme === key
        }));
    }

    /**
     * 切换到下一个主题
     */
    toggleTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    /**
     * 触发主题变更事件
     * @param {string} themeName - 新主题名称
     */
    dispatchThemeChangeEvent(themeName) {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: themeName,
                actualTheme: this.getActualTheme(),
                config: this.getCurrentThemeConfig()
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * 监听主题变更
     * @param {Function} callback - 回调函数
     */
    onThemeChange(callback) {
        window.addEventListener('themechange', callback);
    }

    /**
     * 移除主题变更监听
     * @param {Function} callback - 回调函数
     */
    offThemeChange(callback) {
        window.removeEventListener('themechange', callback);
    }

    /**
     * 获取主题相关的CSS类名
     * @returns {Array} CSS类名数组
     */
    getThemeClasses() {
        const actualTheme = this.getActualTheme();
        return [
            `theme-${actualTheme}`,
            `theme-${this.currentTheme}`, // 保留用户选择的主题标识
        ];
    }

    /**
     * 检查是否支持深色模式
     * @returns {boolean} 是否支持
     */
    supportsDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all';
    }

    /**
     * 导出主题设置
     * @returns {Object} 主题设置数据
     */
    exportSettings() {
        return {
            currentTheme: this.currentTheme,
            actualTheme: this.getActualTheme(),
            supportsDarkMode: this.supportsDarkMode(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 导入主题设置
     * @param {Object} settings - 主题设置数据
     */
    async importSettings(settings) {
        if (settings && settings.currentTheme) {
            await this.setTheme(settings.currentTheme);
            Logger.info('主题设置已导入', settings);
        }
    }

    /**
     * 重置主题设置
     */
    async resetToDefault() {
        localStorage.removeItem('userTheme');
        await this.setTheme('light');
        Logger.info('主题设置已重置为默认');
    }

    /**
     * 销毁主题管理器
     */
    destroy() {
        if (this.mediaQuery) {
            this.mediaQuery.removeEventListener('change', this.applySystemTheme);
        }
        this.initialized = false;
        Logger.info('主题管理器已销毁');
    }
}

// 创建全局主题管理器实例
export const themeManager = new ThemeManager();

// 页面加载时自动初始化
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager.initialize();
    });
}

Logger.info('主题管理模块已加载');