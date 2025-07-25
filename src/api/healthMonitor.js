// API健康监控模块
// 负责监控外部API的健康状态，实现自动降级和恢复机制

import { Logger } from '../utils.js';

/**
 * API健康监控器 - 单例模式
 * 管理API错误率统计、自动降级和恢复逻辑
 */
class ApiHealthMonitor {
    constructor() {
        // 基础统计数据
        this.errorCount = 0;
        this.successCount = 0;
        this.consecutiveErrors = 0;
        this.lastErrorTime = null;
        
        // 批处理管理
        this.currentBatchSize = 3;
        this.maxBatchSize = 5;
        this.minBatchSize = 1;
        
        // 降级管理
        this.degradedMode = false;
        this.degradationStartTime = null;
        this.degradationThreshold = 5;          // 连续错误阈值
        this.recoveryThreshold = 3;             // 恢复检测阈值
        this.degradationCooldown = 5 * 60 * 1000; // 5分钟冷却期
        
        // 错误率计算窗口
        this.errorWindow = [];
        this.windowSize = 100; // 最近100次请求
        
        Logger.info('API健康监控器初始化完成');
    }
    
    /**
     * 记录成功请求
     */
    recordSuccess() {
        this.successCount++;
        this.consecutiveErrors = 0;
        
        // 更新错误窗口
        this.errorWindow.push(false);
        if (this.errorWindow.length > this.windowSize) {
            this.errorWindow.shift();
        }
        
        // 检查是否可以从降级模式恢复
        this.checkRecovery();
        
        Logger.debug('API请求成功', {
            successCount: this.successCount,
            consecutiveErrors: this.consecutiveErrors,
            degradedMode: this.degradedMode
        });
    }
    
    /**
     * 记录错误请求
     */
    recordError() {
        this.errorCount++;
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        
        // 更新错误窗口
        this.errorWindow.push(true);
        if (this.errorWindow.length > this.windowSize) {
            this.errorWindow.shift();
        }
        
        // 检查是否需要进入降级模式
        this.checkDegradation();
        
        // 动态调整批处理大小
        this.adjustBatchSize();
        
        Logger.warn('API请求失败', {
            errorCount: this.errorCount,
            consecutiveErrors: this.consecutiveErrors,
            degradedMode: this.degradedMode,
            batchSize: this.currentBatchSize
        });
    }
    
    /**
     * 检查是否需要进入降级模式
     */
    checkDegradation() {
        if (!this.degradedMode && this.consecutiveErrors >= this.degradationThreshold) {
            this.enterDegradedMode();
        }
    }
    
    /**
     * 检查是否可以从降级模式恢复
     */
    checkRecovery() {
        if (this.degradedMode && this.consecutiveErrors === 0) {
            // 检查冷却期
            const now = Date.now();
            const timeSinceDegradation = now - this.degradationStartTime;
            
            if (timeSinceDegradation >= this.degradationCooldown) {
                this.exitDegradedMode();
            }
        }
    }
    
    /**
     * 进入降级模式
     */
    enterDegradedMode() {
        this.degradedMode = true;
        this.degradationStartTime = Date.now();
        
        Logger.warn('进入API降级模式', {
            consecutiveErrors: this.consecutiveErrors,
            errorRate: this.getErrorRate()
        });
    }
    
    /**
     * 退出降级模式
     */
    exitDegradedMode() {
        const degradationDuration = Date.now() - this.degradationStartTime;
        
        this.degradedMode = false;
        this.degradationStartTime = null;
        this.currentBatchSize = Math.min(this.currentBatchSize + 1, this.maxBatchSize);
        
        Logger.info('退出API降级模式', {
            degradationDuration: Math.round(degradationDuration / 1000) + '秒',
            newBatchSize: this.currentBatchSize
        });
    }
    
    /**
     * 动态调整批处理大小
     */
    adjustBatchSize() {
        if (this.consecutiveErrors >= 3) {
            this.currentBatchSize = Math.max(this.currentBatchSize - 1, this.minBatchSize);
            Logger.debug('降低批处理大小', { newSize: this.currentBatchSize });
        }
    }
    
    /**
     * 获取当前错误率
     */
    getErrorRate() {
        const totalRequests = this.errorCount + this.successCount;
        if (totalRequests === 0) return 0;
        
        // 使用滑动窗口计算更准确的错误率
        if (this.errorWindow.length > 0) {
            const windowErrors = this.errorWindow.filter(error => error).length;
            return windowErrors / this.errorWindow.length;
        }
        
        return this.errorCount / totalRequests;
    }
    
    /**
     * 判断是否应该使用AI
     */
    shouldUseAI() {
        return !this.degradedMode;
    }
    
    /**
     * 获取动态批处理大小
     */
    getDynamicBatchSize() {
        const errorRate = this.getErrorRate();
        
        if (errorRate > 0.3) {
            return 1; // 高错误率时使用最小批次
        } else if (errorRate > 0.1) {
            return Math.max(2, this.currentBatchSize);
        } else {
            return this.currentBatchSize;
        }
    }
    
    /**
     * 获取降级状态详情
     */
    getDegradationStatus() {
        const now = Date.now();
        return {
            degraded: this.degradedMode,
            consecutiveErrors: this.consecutiveErrors,
            errorRate: this.getErrorRate(),
            startTime: this.degradationStartTime,
            duration: this.degradedMode ? now - this.degradationStartTime : 0,
            canRecover: this.consecutiveErrors === 0 && this.degradedMode
        };
    }
    
    /**
     * 强制重置健康状态（管理员功能）
     */
    forceReset() {
        this.errorCount = 0;
        this.successCount = 0;
        this.consecutiveErrors = 0;
        this.lastErrorTime = null;
        this.currentBatchSize = 3;
        this.degradedMode = false;
        this.degradationStartTime = null;
        this.errorWindow = [];
        
        Logger.info('API健康状态已强制重置');
    }
    
    /**
     * 获取健康统计信息
     */
    getHealthStats() {
        return {
            errorCount: this.errorCount,
            successCount: this.successCount,
            consecutiveErrors: this.consecutiveErrors,
            errorRate: this.getErrorRate(),
            currentBatchSize: this.currentBatchSize,
            degradedMode: this.degradedMode,
            degradationDuration: this.degradedMode 
                ? Date.now() - this.degradationStartTime 
                : 0
        };
    }
}

// 导出单例实例
export const apiHealthMonitor = new ApiHealthMonitor();

/**
 * 错误监控系统 - 更详细的错误分析和处理
 */
export class ErrorMonitoringSystem {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 1000;
        
        // 错误分类配置
        this.errorCategories = {
            'API_TIMEOUT': {
                name: 'API超时',
                severity: 'high',
                count: 0,
                lastOccurred: null
            },
            'API_RATE_LIMIT': {
                name: 'API速率限制',
                severity: 'medium',
                count: 0,
                lastOccurred: null
            },
            'API_NETWORK_ERROR': {
                name: 'API网络错误',
                severity: 'high',
                count: 0,
                lastOccurred: null
            },
            'AI_PARSING_ERROR': {
                name: 'AI响应解析错误',
                severity: 'medium',
                count: 0,
                lastOccurred: null
            },
            'CACHE_ERROR': {
                name: '缓存系统错误',
                severity: 'low',
                count: 0,
                lastOccurred: null
            }
        };
        
        Logger.info('错误监控系统初始化完成');
    }
    
    /**
     * 记录错误
     */
    logError(errorType, errorDetails = {}) {
        const timestamp = Date.now();
        const errorCategory = this.errorCategories[errorType];
        
        if (errorCategory) {
            errorCategory.count++;
            errorCategory.lastOccurred = timestamp;
        }
        
        // 记录到错误日志
        const errorEntry = {
            timestamp,
            type: errorType,
            details: errorDetails,
            severity: errorCategory?.severity || 'unknown'
        };
        
        this.errorLog.push(errorEntry);
        
        // 保持日志大小限制
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        Logger.error(`错误监控: ${errorType}`, errorDetails);
    }
    
    /**
     * 获取错误统计报告
     */
    getErrorReport() {
        const now = Date.now();
        const last24h = 24 * 60 * 60 * 1000;
        const lastHour = 60 * 60 * 1000;
        const last5min = 5 * 60 * 1000;
        
        const recent24h = this.errorLog.filter(e => now - e.timestamp <= last24h);
        const recentHour = this.errorLog.filter(e => now - e.timestamp <= lastHour);
        const recent5min = this.errorLog.filter(e => now - e.timestamp <= last5min);
        
        return {
            total: this.errorLog.length,
            last24h: recent24h.length,
            lastHour: recentHour.length,
            last5min: recent5min.length,
            overallErrorRate: apiHealthMonitor.getErrorRate(),
            byCategory: Object.fromEntries(
                Object.entries(this.errorCategories).map(([key, value]) => [
                    key,
                    { count: value.count, lastOccurred: value.lastOccurred }
                ])
            ),
            bySeverity: {
                high: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'high').length,
                medium: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'medium').length,
                low: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'low').length
            }
        };
    }
    
    /**
     * 重置监控数据
     */
    resetMonitoring() {
        this.errorLog = [];
        Object.keys(this.errorCategories).forEach(key => {
            this.errorCategories[key].count = 0;
            this.errorCategories[key].lastOccurred = null;
        });
        
        Logger.info('错误监控数据已重置');
    }
}

// 导出错误监控系统实例
export const errorMonitoringSystem = new ErrorMonitoringSystem();