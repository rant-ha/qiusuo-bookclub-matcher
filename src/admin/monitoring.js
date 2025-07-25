// 管理员监控和控制模块
// 提供系统健康监控、API状态、缓存、内存和配置的实时视图

import { apiHealthMonitor, errorMonitoringSystem } from '../api/healthMonitor.js';
import { Logger } from '../utils.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';
import { configManager } from './configManager.js';
import { createMetricCard, createChartContainer, createAdminButton, createSafeTextElement } from './components.js';
// 引入一个简单的图表库
import Chart from 'chart.js/auto';

/**
 * 高级管理员系统监控类
 */
export class AdminMonitoringSystem {
    constructor() {
        this.initialized = false;
        this.charts = {}; // 存储图表实例
        this.updateIntervalId = null; // 存储定时器ID
        Logger.info('高级管理员监控系统初始化');
    }

    /**
     * 初始化监控UI
     */
    initializeMonitoringUI() {
        if (this.initialized) return;
        
        this.addMonitoringControls();
        this.startPeriodicUpdates();
        
        this.initialized = true;
        Logger.info('高级管理员监控UI已初始化');
    }

    /**
     * 添加监控控件到UI
     */
    addMonitoringControls() {
        const adminPanel = document.getElementById('monitoringPanel');
        if (!adminPanel) return;

        // 清空现有内容
        adminPanel.innerHTML = '';
        
        // 创建标题
        const title = createSafeTextElement('🔍 系统实时监控', 'h2');
        adminPanel.appendChild(title);
        
        // 创建指标网格容器
        const metricsGrid = this.createMetricsGrid();
        adminPanel.appendChild(metricsGrid);
        
        // 创建图表网格容器
        const chartsGrid = this.createChartsGrid();
        adminPanel.appendChild(chartsGrid);
        
        // 创建操作按钮区域
        const actionsContainer = this.createActionsContainer();
        adminPanel.appendChild(actionsContainer);
        
        this.bindEventHandlers();
        this.initializeCharts();
    }

    /**
     * 创建指标网格容器
     * @returns {HTMLElement} 指标网格容器
     */
    createMetricsGrid() {
        const grid = document.createElement('div');
        grid.className = 'monitoring-grid';
        
        // 创建各个指标卡片
        const metrics = [
            { label: '系统总健康', id: 'overallHealth' },
            { label: 'API状态', id: 'apiStatus' },
            { label: '缓存命中率', id: 'cacheHitRate' },
            { label: '内存使用', id: 'memoryUsage' }
        ];
        
        metrics.forEach(metric => {
            const card = createMetricCard(metric.label, metric.id);
            grid.appendChild(card);
        });
        
        return grid;
    }

    /**
     * 创建图表网格容器
     * @returns {HTMLElement} 图表网格容器
     */
    createChartsGrid() {
        const grid = document.createElement('div');
        grid.className = 'charts-grid';
        
        // 创建API请求历史图表
        const apiHistoryChart = createChartContainer('apiHistoryChart', 'API请求历史');
        grid.appendChild(apiHistoryChart);
        
        // 创建错误类型分布图表
        const errorDistChart = createChartContainer('errorDistributionChart', '错误类型分布');
        grid.appendChild(errorDistChart);
        
        return grid;
    }

    /**
     * 创建操作按钮容器
     * @returns {HTMLElement} 操作按钮容器
     */
    createActionsContainer() {
        const container = document.createElement('div');
        container.className = 'monitoring-actions';
        
        // 创建详细报告按钮
        const reportButton = createAdminButton('showHealthReportBtn', '📊 详细报告', 'admin-btn');
        container.appendChild(reportButton);
        
        // 创建重置监控按钮
        const resetButton = createAdminButton('resetApiHealthBtn', '🔄 重置监控', 'admin-btn danger');
        container.appendChild(resetButton);
        
        return container;
    }

    /**
     * 绑定事件处理器
     */
    bindEventHandlers() {
        document.getElementById('showHealthReportBtn')?.addEventListener('click', () => this.showDetailedHealthReport());
        document.getElementById('resetApiHealthBtn')?.addEventListener('click', () => this.resetMonitoring());
    }

    /**
     * 初始化图表
     */
    initializeCharts() {
        this.charts.apiHistory = this.createLineChart('apiHistoryChart', 'API请求');
        this.charts.errorDistribution = this.createDoughnutChart('errorDistributionChart', '错误分布');
    }

    /**
     * 开始定期更新监控数据
     */
    startPeriodicUpdates() {
        // 如果已经有定时器，先清除它
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
        }
        
        this.updateMonitoringDisplay(); // 立即执行一次
        this.updateIntervalId = setInterval(() => {
            this.updateMonitoringDisplay();
        }, 5000); // 每5秒更新一次
        
        Logger.debug('监控数据定时更新已启动');
    }

    /**
     * 更新所有监控显示
     */
    updateMonitoringDisplay() {
        const healthReport = this.getHealthReport();
        
        // 更新指标卡
        document.getElementById('overallHealth').textContent = healthReport.systemHealth.overall;
        document.getElementById('apiStatus').textContent = healthReport.systemHealth.api;
        document.getElementById('cacheHitRate').textContent = healthReport.cacheHealth.aiCacheHitRate;
        document.getElementById('memoryUsage').textContent = healthReport.memoryHealth.profileCacheSize + ' profiles';

        // 更新图表
        this.updateApiHistoryChart(healthReport.performance.history);
        this.updateErrorDistributionChart(healthReport.errorStats.byCategory);
    }

    /**
     * 获取完整的健康报告
     */
    getHealthReport() {
        const healthStats = apiHealthMonitor.getHealthStats();
        const errorReport = errorMonitoringSystem.getErrorReport();
        const degradationStatus = apiHealthMonitor.getDegradationStatus();

        // TODO: 实现缓存监控后，替换这里的模拟数据
        const cacheHealth = { aiCacheHitRate: 'N/A' };
        
        // TODO: 实现内存监控后，替换这里的模拟数据
        const memoryHealth = { profileCacheSize: 'N/A' };

        // 计算系统总健康状态
        let overallHealth = '良好';
        if (degradationStatus.degraded) {
            overallHealth = '降级';
        } else if (healthStats.errorRate > 0.1) {
            overallHealth = '警告';
        }

        return {
            systemHealth: {
                overall: overallHealth,
                api: degradationStatus.degraded ? '降级' : '正常',
                cache: 'N/A', // 占位符
                memory: 'N/A'  // 占位符
            },
            cacheHealth: cacheHealth,
            memoryHealth: memoryHealth,
            performance: {
                history: errorMonitoringSystem.getPerformanceHistory(), // 使用真实历史数据
                ...healthStats
            },
            errorStats: errorReport
        };
    }

    /**
     * 更新API历史图表
     */
    updateApiHistoryChart(history = []) {
        const chart = this.charts.apiHistory;
        if (!chart) return;

        const labels = history.map(h => new Date(h.time).toLocaleTimeString());
        const successData = history.map(h => h.success ? h.latency : null);
        const errorData = history.map(h => !h.success ? h.latency : null);

        chart.data.labels = labels;
        chart.data.datasets[0].data = successData;
        chart.data.datasets[1].data = errorData;
        chart.update();
    }

    /**
     * 更新错误分布图表
     */
    updateErrorDistributionChart(errorCategories = {}) {
        const chart = this.charts.errorDistribution;
        if (!chart) return;

        const labels = Object.keys(errorCategories);
        const data = Object.values(errorCategories).map(c => c.count);

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    /**
     * 显示详细健康报告
     */
    async showDetailedHealthReport() {
        if (!await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
            alert('权限不足'); return;
        }
        const report = this.getHealthReport();
        alert(JSON.stringify(report, null, 2));
    }

    /**
     * 重置监控数据
     */
    async resetMonitoring() {
        if (!await hasPermission(PERMISSIONS.API_MANAGEMENT)) {
            alert('权限不足'); return;
        }
        if (confirm('确定要重置所有监控统计数据吗？')) {
            apiHealthMonitor.forceReset();
            errorMonitoringSystem.resetMonitoring();
            this.updateMonitoringDisplay();
            Logger.info('管理员重置了监控数据');
            alert('监控数据已重置');
        }
    }

    // --- 图表创建辅助函数 ---
    createLineChart(canvasId, label) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '成功 (ms)',
                    data: [],
                    borderColor: 'rgba(40, 167, 69, 0.8)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.3
                }, {
                    label: '失败 (ms)',
                    data: [],
                    borderColor: 'rgba(220, 53, 69, 0.8)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    createDoughnutChart(canvasId, label) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    /**
     * 销毁监控系统，清理资源
     */
    destroy() {
        // 清理定时器
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
            Logger.debug('监控定时器已清理');
        }
        
        // 销毁所有图表实例
        Object.keys(this.charts).forEach(chartKey => {
            if (this.charts[chartKey] && typeof this.charts[chartKey].destroy === 'function') {
                this.charts[chartKey].destroy();
                Logger.debug(`图表 ${chartKey} 已销毁`);
            }
        });
        this.charts = {};
        
        // 重置状态
        this.initialized = false;
        
        Logger.info('监控系统已销毁，资源已清理');
    }
}

export const adminMonitoringSystem = new AdminMonitoringSystem();