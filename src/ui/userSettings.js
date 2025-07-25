// 用户设置管理系统
// 负责个人设置的保存、同步和管理

import { Logger } from '../utils.js';
import { themeManager } from './themeManager.js';

/**
 * 用户设置管理器
 * 负责用户个人设置的管理，包括主题、通知、界面偏好等
 */
class UserSettingsManager {
    constructor() {
        this.settings = {
            // 主题设置
            theme: {
                mode: 'light', // light, dark, auto
                colorScheme: 'default'
            },
            
            // 界面设置
            ui: {
                language: 'zh-CN',
                fontSize: 'medium', // small, medium, large
                compactMode: false,
                showAnimations: true,
                showTooltips: true
            },
            
            // 通知设置
            notifications: {
                enabled: true,
                sound: true,
                desktop: false,
                email: false,
                matchNotifications: true,
                systemNotifications: true
            },
            
            // 隐私设置
            privacy: {
                showOnlineStatus: true,
                allowDataCollection: true,
                shareReadingStats: true
            },
            
            // 功能偏好
            preferences: {
                defaultMatchType: 'smart',
                autoRefresh: true,
                rememberFilters: true,
                quickActions: true
            }
        };
        
        this.initialized = false;
        this.changeListeners = new Set();
        
        Logger.info('用户设置管理器初始化');
    }

    /**
     * 初始化设置管理器
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // 从localStorage加载设置
            await this.loadSettings();
            
            // 应用设置
            await this.applySettings();
            
            this.initialized = true;
            Logger.info('✅ 用户设置管理器初始化完成');
            
        } catch (error) {
            Logger.error('用户设置管理器初始化失败', error);
            // 使用默认设置
            await this.resetToDefaults();
        }
    }

    /**
     * 从localStorage加载设置
     */
    async loadSettings() {
        const savedSettings = localStorage.getItem('userSettings');
        
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                this.settings = this.mergeSettings(this.settings, parsed);
                Logger.debug('用户设置已加载', this.settings);
            } catch (error) {
                Logger.error('设置解析失败', error);
                throw new Error('设置数据损坏');
            }
        }
    }

    /**
     * 保存设置到localStorage
     */
    async saveSettings() {
        try {
            const settingsJson = JSON.stringify(this.settings);
            localStorage.setItem('userSettings', settingsJson);
            
            // 保存时间戳
            localStorage.setItem('userSettingsTimestamp', new Date().toISOString());
            
            Logger.debug('用户设置已保存');
        } catch (error) {
            Logger.error('设置保存失败', error);
            throw new Error('无法保存设置');
        }
    }

    /**
     * 合并设置对象（深度合并）
     * @param {Object} defaults - 默认设置
     * @param {Object} custom - 自定义设置
     * @returns {Object} 合并后的设置
     */
    mergeSettings(defaults, custom) {
        const result = { ...defaults };
        
        for (const key in custom) {
            if (custom[key] && typeof custom[key] === 'object' && !Array.isArray(custom[key])) {
                result[key] = this.mergeSettings(defaults[key] || {}, custom[key]);
            } else {
                result[key] = custom[key];
            }
        }
        
        return result;
    }

    /**
     * 应用所有设置
     */
    async applySettings() {
        try {
            // 应用主题设置
            if (themeManager.initialized) {
                await themeManager.setTheme(this.settings.theme.mode);
            }
            
            // 应用界面设置
            this.applyUISettings();
            
            // 应用其他设置
            this.applyNotificationSettings();
            
            Logger.debug('所有设置已应用');
        } catch (error) {
            Logger.error('应用设置失败', error);
        }
    }

    /**
     * 应用界面设置
     */
    applyUISettings() {
        const { ui } = this.settings;
        const root = document.documentElement;
        
        // 字体大小
        const fontSizeMap = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        root.style.setProperty('--base-font-size', fontSizeMap[ui.fontSize] || fontSizeMap.medium);
        
        // 紧凑模式
        document.body.classList.toggle('compact-mode', ui.compactMode);
        
        // 动画设置
        if (!ui.showAnimations) {
            root.style.setProperty('--animation-duration', '0s');
        } else {
            root.style.removeProperty('--animation-duration');
        }
        
        // 工具提示设置
        document.body.classList.toggle('no-tooltips', !ui.showTooltips);
        
        Logger.debug('界面设置已应用', ui);
    }

    /**
     * 应用通知设置
     */
    applyNotificationSettings() {
        const { notifications } = this.settings;
        
        // 请求桌面通知权限
        if (notifications.desktop && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    Logger.debug('桌面通知权限', permission);
                });
            }
        }
        
        Logger.debug('通知设置已应用', notifications);
    }

    /**
     * 获取设置值
     * @param {string} path - 设置路径，如 'theme.mode' 或 'ui.fontSize'
     * @returns {*} 设置值
     */
    get(path) {
        const keys = path.split('.');
        let value = this.settings;
        
        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * 设置值
     * @param {string} path - 设置路径
     * @param {*} value - 新值
     */
    async set(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        
        // 导航到目标位置
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // 设置值
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // 保存设置
        await this.saveSettings();
        
        // 应用特定设置
        await this.applySpecificSetting(path, value, oldValue);
        
        // 通知监听器
        this.notifyChange(path, value, oldValue);
        
        Logger.debug('设置已更新', { path, value, oldValue });
    }

    /**
     * 应用特定设置
     * @param {string} path - 设置路径
     * @param {*} newValue - 新值
     * @param {*} oldValue - 旧值
     */
    async applySpecificSetting(path, newValue, oldValue) {
        if (path.startsWith('theme.')) {
            if (path === 'theme.mode') {
                await themeManager.setTheme(newValue);
            }
        } else if (path.startsWith('ui.')) {
            this.applyUISettings();
        } else if (path.startsWith('notifications.')) {
            this.applyNotificationSettings();
        }
    }

    /**
     * 批量更新设置
     * @param {Object} updates - 设置更新对象
     */
    async updateMultiple(updates) {
        const oldSettings = JSON.parse(JSON.stringify(this.settings));
        
        // 应用所有更新
        for (const [path, value] of Object.entries(updates)) {
            const keys = path.split('.');
            let current = this.settings;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            current[keys[keys.length - 1]] = value;
        }
        
        // 保存并应用
        await this.saveSettings();
        await this.applySettings();
        
        // 通知变更
        this.notifyChange('*', this.settings, oldSettings);
        
        Logger.info('批量设置更新完成', updates);
    }

    /**
     * 重置到默认设置
     */
    async resetToDefaults() {
        const defaultSettings = {
            theme: { mode: 'light', colorScheme: 'default' },
            ui: {
                language: 'zh-CN',
                fontSize: 'medium',
                compactMode: false,
                showAnimations: true,
                showTooltips: true
            },
            notifications: {
                enabled: true,
                sound: true,
                desktop: false,
                email: false,
                matchNotifications: true,
                systemNotifications: true
            },
            privacy: {
                showOnlineStatus: true,
                allowDataCollection: true,
                shareReadingStats: true
            },
            preferences: {
                defaultMatchType: 'smart',
                autoRefresh: true,
                rememberFilters: true,
                quickActions: true
            }
        };
        
        this.settings = defaultSettings;
        await this.saveSettings();
        await this.applySettings();
        
        this.notifyChange('*', this.settings, {});
        
        Logger.info('设置已重置为默认值');
    }

    /**
     * 添加变更监听器
     * @param {Function} listener - 监听器函数
     */
    onChange(listener) {
        this.changeListeners.add(listener);
    }

    /**
     * 移除变更监听器
     * @param {Function} listener - 监听器函数
     */
    offChange(listener) {
        this.changeListeners.delete(listener);
    }

    /**
     * 通知设置变更
     * @param {string} path - 变更路径
     * @param {*} newValue - 新值
     * @param {*} oldValue - 旧值
     */
    notifyChange(path, newValue, oldValue) {
        const event = {
            path,
            newValue,
            oldValue,
            timestamp: new Date().toISOString()
        };
        
        this.changeListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                Logger.error('设置变更监听器执行失败', error);
            }
        });
    }

    /**
     * 导出所有设置
     * @returns {Object} 设置数据
     */
    exportSettings() {
        return {
            settings: JSON.parse(JSON.stringify(this.settings)),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    /**
     * 导入设置
     * @param {Object} data - 设置数据
     */
    async importSettings(data) {
        if (!data || !data.settings) {
            throw new Error('无效的设置数据');
        }
        
        const oldSettings = JSON.parse(JSON.stringify(this.settings));
        this.settings = this.mergeSettings(this.settings, data.settings);
        
        await this.saveSettings();
        await this.applySettings();
        
        this.notifyChange('*', this.settings, oldSettings);
        
        Logger.info('设置导入完成', data);
    }

    /**
     * 获取设置摘要
     * @returns {Object} 设置摘要
     */
    getSummary() {
        return {
            theme: this.settings.theme.mode,
            language: this.settings.ui.language,
            notifications: this.settings.notifications.enabled,
            lastModified: localStorage.getItem('userSettingsTimestamp')
        };
    }

    /**
     * 销毁设置管理器
     */
    destroy() {
        this.changeListeners.clear();
        this.initialized = false;
        Logger.info('用户设置管理器已销毁');
    }
}

// 创建全局设置管理器实例
export const userSettingsManager = new UserSettingsManager();

// 页面加载时自动初始化
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        userSettingsManager.initialize();
    });
}

Logger.info('用户设置管理模块已加载');