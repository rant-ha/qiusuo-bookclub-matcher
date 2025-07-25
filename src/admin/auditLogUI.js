// 审计日志UI管理器
// 负责审计日志界面的显示和交互

import { Logger } from '../utils.js';
import { auditLogManager } from './auditLog.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';
import { createAuditLogEntry, showAuditLogStatus } from './components.js';

/**
 * 审计日志UI管理器类
 */
class AuditLogUIManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentFilters = {};
        this.isInitialized = false;
        Logger.info('审计日志UI管理器初始化');
    }

    /**
     * 初始化审计日志界面
     */
    async initialize() {
        try {
            // 检查权限
            if (!await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
                Logger.warn('用户无权限访问审计日志');
                showAuditLogStatus('权限不足：无法访问审计日志功能', 'error');
                return;
            }

            await this.setupEventListeners();
            await this.loadAndDisplayLogs();
            await this.updateStatistics();
            
            this.isInitialized = true;
            Logger.info('审计日志UI界面初始化完成');
            
        } catch (error) {
            Logger.error('审计日志UI界面初始化失败', error);
            showAuditLogStatus('初始化失败：' + error.message, 'error');
        }
    }

    /**
     * 设置事件监听器
     */
    async setupEventListeners() {
        // 搜索按钮
        const searchBtn = document.getElementById('auditSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // 重置按钮
        const resetBtn = document.getElementById('auditResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }

        // 导出按钮
        const exportBtn = document.getElementById('auditExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        // 过滤器变化监听
        const filterElements = [
            'auditActionFilter',
            'auditAdminFilter', 
            'auditStartDate',
            'auditEndDate'
        ];

        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.handleFilterChange());
            }
        });

        Logger.debug('审计日志事件监听器设置完成');
    }

    /**
     * 处理搜索操作
     */
    async handleSearch() {
        try {
            this.currentPage = 1;
            this.collectFilters();
            await this.loadAndDisplayLogs();
            showAuditLogStatus('搜索完成', 'success');
        } catch (error) {
            Logger.error('搜索审计日志失败', error);
            showAuditLogStatus('搜索失败：' + error.message, 'error');
        }
    }

    /**
     * 处理重置操作
     */
    async handleReset() {
        try {
            // 清空所有过滤器
            document.getElementById('auditActionFilter').value = '';
            document.getElementById('auditAdminFilter').value = '';
            document.getElementById('auditStartDate').value = '';
            document.getElementById('auditEndDate').value = '';

            this.currentFilters = {};
            this.currentPage = 1;
            
            await this.loadAndDisplayLogs();
            showAuditLogStatus('过滤器已重置', 'info');
        } catch (error) {
            Logger.error('重置过滤器失败', error);
            showAuditLogStatus('重置失败：' + error.message, 'error');
        }
    }

    /**
     * 处理导出操作
     */
    async handleExport() {
        try {
            showAuditLogStatus('正在导出审计日志...', 'info');
            
            const exportData = await auditLogManager.exportLogs(this.currentFilters);
            
            // 创建并下载文件
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showAuditLogStatus(`审计日志导出成功，共${exportData.totalLogs}条记录`, 'success');
            
        } catch (error) {
            Logger.error('导出审计日志失败', error);
            showAuditLogStatus('导出失败：' + error.message, 'error');
        }
    }

    /**
     * 处理过滤器变化
     */
    handleFilterChange() {
        // 防抖处理
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.handleSearch();
        }, 500);
    }

    /**
     * 收集当前过滤器条件
     */
    collectFilters() {
        this.currentFilters = {
            action: document.getElementById('auditActionFilter')?.value || '',
            adminName: document.getElementById('auditAdminFilter')?.value || '',
            startDate: document.getElementById('auditStartDate')?.value || '',
            endDate: document.getElementById('auditEndDate')?.value || '',
            page: this.currentPage,
            pageSize: this.pageSize
        };
    }

    /**
     * 加载并显示日志
     */
    async loadAndDisplayLogs() {
        try {
            this.collectFilters();
            const result = auditLogManager.getLogs(this.currentFilters);
            
            await this.renderLogList(result.logs);
            await this.renderPagination(result);
            await this.updateStatistics();
            
        } catch (error) {
            Logger.error('加载审计日志失败', error);
            showAuditLogStatus('加载日志失败：' + error.message, 'error');
        }
    }

    /**
     * 渲染日志列表
     * @param {Array} logs - 日志数组
     */
    async renderLogList(logs) {
        const container = document.getElementById('auditLogList');
        if (!container) return;

        container.innerHTML = '';

        if (logs.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'audit-log-empty';
            emptyMessage.textContent = '暂无符合条件的审计日志';
            container.appendChild(emptyMessage);
            return;
        }

        logs.forEach(logEntry => {
            const logElement = createAuditLogEntry(logEntry);
            container.appendChild(logElement);
        });

        Logger.debug(`已渲染 ${logs.length} 条审计日志`);
    }

    /**
     * 渲染分页控件
     * @param {Object} paginationData - 分页数据
     */
    async renderPagination(paginationData) {
        const container = document.getElementById('auditLogPagination');
        if (!container) return;

        container.innerHTML = '';

        if (paginationData.totalPages <= 1) return;

        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        // 上一页按钮
        if (paginationData.page > 1) {
            const prevButton = this.createPaginationButton('上一页', paginationData.page - 1);
            pagination.appendChild(prevButton);
        }

        // 页码按钮
        const startPage = Math.max(1, paginationData.page - 2);
        const endPage = Math.min(paginationData.totalPages, paginationData.page + 2);

        if (startPage > 1) {
            const firstButton = this.createPaginationButton('1', 1);
            pagination.appendChild(firstButton);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pagination.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = this.createPaginationButton(i.toString(), i);
            if (i === paginationData.page) {
                pageButton.classList.add('active');
            }
            pagination.appendChild(pageButton);
        }

        if (endPage < paginationData.totalPages) {
            if (endPage < paginationData.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pagination.appendChild(ellipsis);
            }
            
            const lastButton = this.createPaginationButton(paginationData.totalPages.toString(), paginationData.totalPages);
            pagination.appendChild(lastButton);
        }

        // 下一页按钮
        if (paginationData.page < paginationData.totalPages) {
            const nextButton = this.createPaginationButton('下一页', paginationData.page + 1);
            pagination.appendChild(nextButton);
        }

        container.appendChild(pagination);
    }

    /**
     * 创建分页按钮
     * @param {string} text - 按钮文本
     * @param {number} page - 目标页码
     * @returns {HTMLElement} 按钮元素
     */
    createPaginationButton(text, page) {
        const button = document.createElement('button');
        button.className = 'pagination-button';
        button.textContent = text;
        button.addEventListener('click', () => this.goToPage(page));
        return button;
    }

    /**
     * 跳转到指定页码
     * @param {number} page - 目标页码
     */
    async goToPage(page) {
        this.currentPage = page;
        await this.loadAndDisplayLogs();
    }

    /**
     * 更新统计信息
     */
    async updateStatistics() {
        try {
            const stats = auditLogManager.getStatistics();
            
            // 更新统计卡片
            const totalElement = document.getElementById('audittotalLogs');
            if (totalElement) {
                totalElement.textContent = stats.totalLogs.toString();
            }

            const last24hElement = document.getElementById('auditlast24Hours');
            if (last24hElement) {
                last24hElement.textContent = stats.last24Hours.toString();
            }

            const last7dElement = document.getElementById('auditlast7Days');
            if (last7dElement) {
                last7dElement.textContent = stats.last7Days.toString();
            }

            // 更新当前页面信息
            const currentResult = auditLogManager.getLogs(this.currentFilters);
            const currentPageElement = document.getElementById('auditcurrentPage');
            if (currentPageElement) {
                currentPageElement.textContent = `${this.currentPage}/${currentResult.totalPages}`;
            }

        } catch (error) {
            Logger.error('更新审计日志统计信息失败', error);
        }
    }

    /**
     * 显示审计日志面板
     */
    async showPanel() {
        const panel = document.getElementById('auditLogPanel');
        if (panel) {
            panel.style.display = 'block';
            
            if (!this.isInitialized) {
                await this.initialize();
            } else {
                await this.loadAndDisplayLogs();
                await this.updateStatistics();
            }
        }
    }

    /**
     * 隐藏审计日志面板
     */
    hidePanel() {
        const panel = document.getElementById('auditLogPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * 刷新日志列表
     */
    async refresh() {
        if (this.isInitialized) {
            await this.loadAndDisplayLogs();
            await this.updateStatistics();
            showAuditLogStatus('审计日志已刷新', 'success');
        }
    }
}

// 创建全局实例
export const auditLogUIManager = new AuditLogUIManager();

Logger.info('审计日志UI管理模块已加载');