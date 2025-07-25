// 审计日志管理模块
// 记录和管理所有关键系统操作的审计日志

import { Logger } from '../utils.js';
import { store } from '../state.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';

/**
 * 审计日志管理器类
 */
class AuditLogManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000; // 最大日志条数
        this.retentionDays = 90; // 日志保留天数
        Logger.info('审计日志管理器初始化');
    }

    /**
     * 记录审计日志
     * @param {string} action - 操作类型
     * @param {string} details - 操作详情
     * @param {string} adminName - 操作管理员姓名
     * @param {Object} metadata - 额外元数据
     */
    async logAction(action, details, adminName = 'Unknown', metadata = {}) {
        try {
            const logEntry = {
                id: this.generateLogId(),
                timestamp: new Date().toISOString(),
                action: this.sanitizeInput(action),
                details: this.sanitizeInput(details),
                adminName: this.sanitizeInput(adminName),
                userAgent: navigator.userAgent,
                ip: await this.getClientIP(),
                sessionId: this.getSessionId(),
                metadata: this.sanitizeMetadata(metadata)
            };

            this.logs.unshift(logEntry);
            
            // 限制日志数量
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(0, this.maxLogs);
            }

            // 更新状态管理器
            store.setAuditLogs([...this.logs]);

            // 持久化日志（异步）
            this.persistLogs();

            Logger.debug('审计日志已记录', logEntry);
            return logEntry;

        } catch (error) {
            Logger.error('记录审计日志失败', error);
            return null;
        }
    }

    /**
     * 生成唯一日志ID
     * @returns {string} 日志ID
     */
    generateLogId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取客户端IP（尽力而为）
     * @returns {Promise<string>} IP地址
     */
    async getClientIP() {
        try {
            // 在实际部署中，可能需要通过API获取真实IP
            return 'client-ip-unknown';
        } catch {
            return 'ip-unavailable';
        }
    }

    /**
     * 获取会话ID
     * @returns {string} 会话ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('auditSessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('auditSessionId', sessionId);
        }
        return sessionId;
    }

    /**
     * 清理输入内容
     * @param {string} input - 输入内容
     * @returns {string} 清理后的内容
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        return input.replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]')
                   .replace(/javascript:/gi, 'javascript-removed:')
                   .substring(0, 1000); // 限制长度
    }

    /**
     * 清理元数据
     * @param {Object} metadata - 元数据对象
     * @returns {Object} 清理后的元数据
     */
    sanitizeMetadata(metadata) {
        const cleaned = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (key.length <= 50 && typeof value !== 'function') {
                cleaned[this.sanitizeInput(key)] = this.sanitizeInput(String(value));
            }
        }
        return cleaned;
    }

    /**
     * 获取审计日志列表
     * @param {Object} filters - 过滤条件
     * @returns {Array} 过滤后的日志列表
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        // 按操作类型过滤
        if (filters.action) {
            filteredLogs = filteredLogs.filter(log => 
                log.action.toLowerCase().includes(filters.action.toLowerCase())
            );
        }

        // 按管理员过滤
        if (filters.adminName) {
            filteredLogs = filteredLogs.filter(log => 
                log.adminName.toLowerCase().includes(filters.adminName.toLowerCase())
            );
        }

        // 按时间范围过滤
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= startDate
            );
        }

        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= endDate
            );
        }

        // 分页处理
        const page = parseInt(filters.page) || 1;
        const pageSize = parseInt(filters.pageSize) || 50;
        const startIndex = (page - 1) * pageSize;
        
        return {
            logs: filteredLogs.slice(startIndex, startIndex + pageSize),
            total: filteredLogs.length,
            page,
            pageSize,
            totalPages: Math.ceil(filteredLogs.length / pageSize)
        };
    }

    /**
     * 持久化日志到存储
     */
    async persistLogs() {
        try {
            // 只保存最近的日志，避免存储过载
            const recentLogs = this.logs.slice(0, 1000);
            localStorage.setItem('auditLogs', JSON.stringify({
                logs: recentLogs,
                lastSaved: new Date().toISOString()
            }));
            
            Logger.debug(`已持久化 ${recentLogs.length} 条审计日志`);
        } catch (error) {
            Logger.error('持久化审计日志失败', error);
        }
    }

    /**
     * 从存储加载日志
     */
    async loadLogs() {
        try {
            const saved = localStorage.getItem('auditLogs');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.logs && Array.isArray(data.logs)) {
                    this.logs = data.logs;
                    store.setAuditLogs([...this.logs]);
                    Logger.info(`已加载 ${this.logs.length} 条审计日志`);
                }
            }
        } catch (error) {
            Logger.error('加载审计日志失败', error);
        }
    }

    /**
     * 清理过期日志
     */
    cleanupExpiredLogs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        
        const originalCount = this.logs.length;
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        const removedCount = originalCount - this.logs.length;
        if (removedCount > 0) {
            Logger.info(`清理了 ${removedCount} 条过期审计日志`);
            store.setAuditLogs([...this.logs]);
            this.persistLogs();
        }
    }

    /**
     * 导出审计日志
     * @param {Object} filters - 导出过滤条件
     * @returns {Object} 导出结果
     */
    async exportLogs(filters = {}) {
        try {
            // 检查权限
            if (!await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
                throw new Error('权限不足：无法导出审计日志');
            }

            const result = this.getLogs(filters);
            const exportData = {
                exportTime: new Date().toISOString(),
                filters,
                totalLogs: result.total,
                logs: result.logs
            };

            // 记录导出操作
            await this.logAction(
                'AUDIT_LOG_EXPORT',
                `导出审计日志，条件：${JSON.stringify(filters)}，共${result.total}条`,
                store.getState().currentAdminRole || 'Unknown'
            );

            return exportData;

        } catch (error) {
            Logger.error('导出审计日志失败', error);
            throw error;
        }
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
            totalLogs: this.logs.length,
            last24Hours: this.logs.filter(log => new Date(log.timestamp) > last24h).length,
            last7Days: this.logs.filter(log => new Date(log.timestamp) > last7d).length,
            topActions: this.getTopActions(10),
            topAdmins: this.getTopAdmins(10)
        };

        return stats;
    }

    /**
     * 获取最频繁的操作类型
     * @param {number} limit - 返回数量限制
     * @returns {Array} 操作类型统计
     */
    getTopActions(limit = 10) {
        const actionCounts = {};
        this.logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        });

        return Object.entries(actionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([action, count]) => ({ action, count }));
    }

    /**
     * 获取最活跃的管理员
     * @param {number} limit - 返回数量限制
     * @returns {Array} 管理员活动统计
     */
    getTopAdmins(limit = 10) {
        const adminCounts = {};
        this.logs.forEach(log => {
            adminCounts[log.adminName] = (adminCounts[log.adminName] || 0) + 1;
        });

        return Object.entries(adminCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([adminName, count]) => ({ adminName, count }));
    }

    /**
     * 清空所有日志（危险操作）
     */
    async clearAllLogs() {
        // 检查权限
        if (!await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
            throw new Error('权限不足：无法清空审计日志');
        }

        const logCount = this.logs.length;
        this.logs = [];
        store.setAuditLogs([]);
        localStorage.removeItem('auditLogs');

        Logger.warn(`已清空所有审计日志，共 ${logCount} 条`);
        
        // 记录清空操作
        await this.logAction(
            'AUDIT_LOG_CLEAR',
            `清空所有审计日志，共删除${logCount}条记录`,
            store.getState().currentAdminRole || 'Unknown'
        );
    }
}

// 创建全局实例
export const auditLogManager = new AuditLogManager();

// 初始化时加载现有日志
auditLogManager.loadLogs();

// 定期清理过期日志（每小时执行一次）
setInterval(() => {
    auditLogManager.cleanupExpiredLogs();
}, 60 * 60 * 1000);

Logger.info('审计日志管理模块已加载');