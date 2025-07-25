// src/admin/configManager.js

import { Logger } from '../utils.js';
import { loadSystemConfig, saveSystemConfig } from '../api.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS, DEFAULT_MATCHING_WEIGHTS } from '../config.js';

const CONFIG_FILENAME = 'system_config.json';

class ConfigManager {
    constructor() {
        // 完全复现 app.js.backup 中的默认配置结构
        this.defaultConfig = {
            metadata: {
                version: "1.0.0",
                description: "求索书社匹配工具的系统配置",
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: "System"
            },
            aiConfig: {
                enabled: true, // 对应旧的 aiAnalysisEnabled
                provider: "custom",
                baseUrl: "", // 将由静态配置填充
                modelName: "gpt-4.1-mini",
                apiKeyPlaceholder: "在环境变量中设置",
                similarityThreshold: 0.6
            },
            systemParams: {
                logLevel: "INFO",
                matchBatchSize: 10,
                cacheTTL: 300, // 秒
                sessionTimeout: 3600 // 秒
            },
            featureToggles: {
                enableSemanticSearch: true,
                enableUserProfileCustomization: true,
                enableAdminDashboardV2: true,
                enableAuditLogging: true
            },
            matchingWeights: DEFAULT_MATCHING_WEIGHTS
            // 安全相关的配置将独立处理，不在此动态配置中
        };

        this.config = { ...this.defaultConfig };
        this.listeners = new Set();
        Logger.info('ConfigManager initialized.');
    }

    /**
     * 从Gist加载配置，并与默认配置合并。
     * 这是系统启动时的关键步骤。
     */
    async loadConfig() {
        try {
            const remoteConfig = await loadSystemConfig();

            if (remoteConfig) {
                this.config = this.deepMerge(this.defaultConfig, remoteConfig);
                Logger.info('远程系统配置已加载并合并。');
            } else {
                Logger.info('未找到远程配置，使用默认值。首次启动时将创建。');
                this.config = { ...this.defaultConfig };
                // 首次启动时，尝试保存一份默认配置
                await this.saveConfig();
            }
            this.notifyListeners();
        } catch (error) {
            Logger.error('加载远程配置失败，回退到默认配置。', error);
            this.config = { ...this.defaultConfig };
        }
        return this.config;
    }

    /**
     * 将当前配置保存到Gist。
     * @param {string} updatedBy - 执行更新的管理员名称。
     */
    async saveConfig(updatedBy = 'System') {
        // 添加权限检查
        if (updatedBy !== 'System' && (!hasPermission || !await hasPermission(PERMISSIONS.SYSTEM_CONFIG))) {
            Logger.error('权限不足：无法保存系统配置');
            return false;
        }
        
        try {
            // 更新元数据
            this.config.metadata.lastUpdated = new Date().toISOString();
            this.config.metadata.lastUpdatedBy = updatedBy;

            await saveSystemConfig(this.config);
            Logger.info(`配置已由 ${updatedBy} 成功保存。`);
            return true;
        } catch (error) {
            Logger.error('保存配置到Gist失败', error);
            return false;
        }
    }

    /**
     * 返回当前的完整配置对象。
     */
    getConfig() {
        return this.config;
    }

    /**
     * 更新部分配置，并通知所有监听器（热重载）。
     * @param {object} newConfig - 要更新的部分配置。
     * @param {string} adminName - 执行操作的管理员名称。
     */
    async updateConfig(newConfig, adminName) {
        // 添加权限检查
        if (!hasPermission || !await hasPermission(PERMISSIONS.SYSTEM_CONFIG)) {
            Logger.error('权限不足：无法更新系统配置');
            return;
        }
        
        this.config = this.deepMerge(this.config, newConfig);
        Logger.info('配置已在本地更新，正在通知监听器...');
        this.notifyListeners();
        await this.saveConfig(adminName);
    }

    /**
     * 订阅配置更改。这是实现热重载的关键。
     * @param {function} listener - 当配置更改时要执行的回调函数。
     * @returns {function} - 用于取消订阅的函数。
     */
    onUpdate(listener) {
        this.listeners.add(listener);
        // 立即用当前配置调用一次监听器
        listener(this.config);
        return () => this.listeners.delete(listener);
    }

    /**
     * 通知所有订阅者配置已更新。
     */
    notifyListeners() {
        Logger.debug(`正在通知 ${this.listeners.size} 个配置监听器...`);
        for (const listener of this.listeners) {
            try {
                listener(this.config);
            } catch (error) {
                Logger.error('执行配置监听器时出错', error);
            }
        }
    }

    /**
     * 深度合并两个对象。
     */
    deepMerge(target, source) {
        const output = { ...target };
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
}

export const configManager = new ConfigManager();