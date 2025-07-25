// 数据迁移UI管理器
// 负责数据迁移界面的显示和交互

import { Logger } from '../utils.js';
import { dataMigrationManager } from './dataMigration.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';
import { createMigrationDetails, createBackupListItem, showMigrationStatus } from './components.js';

/**
 * 数据迁移UI管理器类
 */
class DataMigrationUIManager {
    constructor() {
        this.isInitialized = false;
        this.currentMigrationInfo = null;
        Logger.info('数据迁移UI管理器初始化');
    }

    /**
     * 初始化数据迁移界面
     */
    async initialize() {
        try {
            // 检查权限
            if (!await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
                Logger.warn('用户无权限访问数据迁移');
                showMigrationStatus('权限不足：无法访问数据迁移功能', 'error');
                return;
            }

            await this.setupEventListeners();
            await this.loadMigrationStatus();
            
            this.isInitialized = true;
            Logger.info('数据迁移UI界面初始化完成');
            
        } catch (error) {
            Logger.error('数据迁移UI界面初始化失败', error);
            showMigrationStatus('初始化失败：' + error.message, 'error');
        }
    }

    /**
     * 设置事件监听器
     */
    async setupEventListeners() {
        // 检查迁移按钮
        const checkBtn = document.getElementById('checkMigrationBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.handleCheckMigration());
        }

        // 执行迁移按钮
        const performBtn = document.getElementById('performMigrationBtn');
        if (performBtn) {
            performBtn.addEventListener('click', () => this.handlePerformMigration());
        }

        // 验证数据按钮
        const validateBtn = document.getElementById('validateDataBtn');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.handleValidateData());
        }

        // 创建备份按钮
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => this.handleCreateBackup());
        }

        // 备份列表按钮
        const listBackupsBtn = document.getElementById('listBackupsBtn');
        if (listBackupsBtn) {
            listBackupsBtn.addEventListener('click', () => this.handleListBackups());
        }

        // 清理备份按钮
        const cleanupBtn = document.getElementById('cleanupBackupsBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => this.handleCleanupBackups());
        }

        // 导入备份按钮
        const importBackupBtn = document.getElementById('importBackupBtn');
        if (importBackupBtn) {
            importBackupBtn.addEventListener('click', () => this.handleImportBackup());
        }

        Logger.debug('数据迁移事件监听器设置完成');
    }

    /**
     * 加载迁移状态
     */
    async loadMigrationStatus() {
        try {
            // 更新状态卡片
            const currentVersion = localStorage.getItem('appVersion') || '1.0.0';
            const migrationStatus = localStorage.getItem('migrationStatus') || 'not_started';
            const lastMigration = localStorage.getItem('migrationDate') || '--';

            this.updateStatusCard('migrationcurrentVersion', currentVersion);
            this.updateStatusCard('migrationmigrationStatus', migrationStatus);
            this.updateStatusCard('migrationlastMigration', 
                lastMigration === '--' ? '--' : new Date(lastMigration).toLocaleString('zh-CN')
            );

            // 获取数据数量
            try {
                const { loadMembers } = await import('../api.js');
                const members = await loadMembers();
                this.updateStatusCard('migrationdataCount', members ? members.length.toString() : '0');
            } catch (error) {
                this.updateStatusCard('migrationdataCount', '加载失败');
            }

        } catch (error) {
            Logger.error('加载迁移状态失败', error);
        }
    }

    /**
     * 更新状态卡片
     * @param {string} cardId - 卡片ID
     * @param {string} value - 新值
     */
    updateStatusCard(cardId, value) {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * 处理检查迁移操作
     */
    async handleCheckMigration() {
        try {
            showMigrationStatus('正在检查迁移需求...', 'info');
            
            const migrationInfo = await dataMigrationManager.checkMigrationNeeded();
            this.currentMigrationInfo = migrationInfo;
            
            // 更新状态
            this.updateStatusCard('migrationmigrationStatus', 
                migrationInfo.needsMigration ? '需要迁移' : '无需迁移'
            );

            // 显示详细信息
            const detailsContainer = document.getElementById('migrationDetails');
            if (detailsContainer) {
                detailsContainer.innerHTML = '';
                const detailsElement = createMigrationDetails(migrationInfo);
                detailsContainer.appendChild(detailsElement);
                detailsContainer.style.display = 'block';
            }

            // 更新按钮状态
            const performBtn = document.getElementById('performMigrationBtn');
            if (performBtn) {
                performBtn.disabled = !migrationInfo.needsMigration;
            }

            const message = migrationInfo.needsMigration 
                ? `检查完成，发现 ${migrationInfo.dataIssues.length} 个数据问题需要迁移`
                : '检查完成，数据无需迁移';
            
            showMigrationStatus(message, migrationInfo.needsMigration ? 'warning' : 'success');
            
        } catch (error) {
            Logger.error('检查迁移失败', error);
            showMigrationStatus('检查迁移失败：' + error.message, 'error');
        }
    }

    /**
     * 处理执行迁移操作
     */
    async handlePerformMigration() {
        if (!this.currentMigrationInfo || !this.currentMigrationInfo.needsMigration) {
            showMigrationStatus('请先执行迁移检查', 'warning');
            return;
        }

        const confirmed = confirm(
            `确定要执行数据迁移吗？\n\n` +
            `将迁移 ${this.currentMigrationInfo.membersCount} 条用户数据\n` +
            `发现 ${this.currentMigrationInfo.dataIssues.length} 个问题需要修复\n\n` +
            `迁移前会自动创建备份，建议在低峰期执行。`
        );

        if (!confirmed) return;

        try {
            showMigrationStatus('正在执行数据迁移，请稍候...', 'info');
            
            // 禁用迁移按钮
            const performBtn = document.getElementById('performMigrationBtn');
            if (performBtn) {
                performBtn.disabled = true;
                performBtn.textContent = '迁移中...';
            }

            const migrationResult = await dataMigrationManager.performMigration({
                fromVersion: this.currentMigrationInfo.fromVersion,
                stopOnError: false
            });

            // 恢复按钮状态
            if (performBtn) {
                performBtn.disabled = false;
                performBtn.textContent = '🚀 执行迁移';
            }

            if (migrationResult.success) {
                const message = `迁移成功完成！\n` +
                    `成功迁移：${migrationResult.migratedCount} 条\n` +
                    `错误数量：${migrationResult.errorCount} 条`;
                
                showMigrationStatus(message, 'success');
                
                // 刷新状态
                await this.loadMigrationStatus();
                
                // 清空详情显示
                const detailsContainer = document.getElementById('migrationDetails');
                if (detailsContainer) {
                    detailsContainer.style.display = 'none';
                }
                
            } else {
                showMigrationStatus('迁移失败，请查看详细错误信息', 'error');
            }

        } catch (error) {
            Logger.error('执行迁移失败', error);
            showMigrationStatus('执行迁移失败：' + error.message, 'error');
            
            // 恢复按钮状态
            const performBtn = document.getElementById('performMigrationBtn');
            if (performBtn) {
                performBtn.disabled = false;
                performBtn.textContent = '🚀 执行迁移';
            }
        }
    }

    /**
     * 处理验证数据操作
     */
    async handleValidateData() {
        try {
            showMigrationStatus('正在验证数据完整性...', 'info');
            
            const { loadMembers } = await import('../api.js');
            const members = await loadMembers();
            
            if (!members || members.length === 0) {
                showMigrationStatus('没有找到用户数据', 'warning');
                return;
            }

            const validationResult = await dataMigrationManager.validateMigratedData(members);
            
            const message = validationResult.isValid 
                ? `数据验证通过！有效用户：${validationResult.statistics.validMembers} 个`
                : `数据验证发现问题：${validationResult.issues.length} 个问题`;
            
            showMigrationStatus(message, validationResult.isValid ? 'success' : 'error');
            
        } catch (error) {
            Logger.error('验证数据失败', error);
            showMigrationStatus('验证数据失败：' + error.message, 'error');
        }
    }

    /**
     * 处理创建备份操作
     */
    async handleCreateBackup() {
        try {
            showMigrationStatus('正在创建数据备份...', 'info');
            
            const backupResult = await dataMigrationManager.createBackup();
            
            if (backupResult.success) {
                showMigrationStatus('备份创建成功', 'success');
                
                // 如果备份列表正在显示，刷新它
                const backupListContainer = document.getElementById('backupListContainer');
                if (backupListContainer && backupListContainer.style.display !== 'none') {
                    await this.handleListBackups();
                }
            } else {
                showMigrationStatus('备份创建失败：' + backupResult.error, 'error');
            }
            
        } catch (error) {
            Logger.error('创建备份失败', error);
            showMigrationStatus('创建备份失败：' + error.message, 'error');
        }
    }

    /**
     * 处理备份列表操作
     */
    async handleListBackups() {
        try {
            const backupHistory = dataMigrationManager.getBackupHistory();
            const backupListContainer = document.getElementById('backupListContainer');
            
            if (!backupListContainer) return;

            backupListContainer.innerHTML = '';

            if (backupHistory.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.textContent = '暂无备份记录';
                emptyMessage.style.cssText = 'text-align: center; padding: 20px; color: #6c757d; font-style: italic;';
                backupListContainer.appendChild(emptyMessage);
            } else {
                backupHistory.forEach(backup => {
                    const backupItem = createBackupListItem(backup);
                    
                    // 绑定恢复和删除事件
                    const restoreBtn = backupItem.querySelector(`#restore_${backup.key}`);
                    const deleteBtn = backupItem.querySelector(`#delete_${backup.key}`);
                    const exportBtn = backupItem.querySelector(`#export_${backup.key}`);
                    
                    if (restoreBtn) {
                        restoreBtn.addEventListener('click', () => this.handleRestoreBackup(backup.key));
                    }
                    
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', () => this.handleDeleteBackup(backup.key));
                    }
                    
                    if (exportBtn) {
                        exportBtn.addEventListener('click', () => this.handleExportBackup(backup.key));
                    }
                    
                    backupListContainer.appendChild(backupItem);
                });
            }

            // 切换显示状态
            const isVisible = backupListContainer.style.display !== 'none';
            backupListContainer.style.display = isVisible ? 'none' : 'block';
            
            const listBtn = document.getElementById('listBackupsBtn');
            if (listBtn) {
                listBtn.textContent = isVisible ? '📋 备份列表' : '❌ 隐藏列表';
            }

        } catch (error) {
            Logger.error('获取备份列表失败', error);
            showMigrationStatus('获取备份列表失败：' + error.message, 'error');
        }
    }

    /**
     * 处理恢复备份操作
     */
    async handleRestoreBackup(backupKey) {
        const confirmed = confirm(`确定要恢复到此备份吗？\n\n当前数据将被覆盖，此操作不可撤销！`);
        if (!confirmed) return;

        try {
            showMigrationStatus('正在恢复备份...', 'info');
            
            const rollbackResult = await dataMigrationManager.rollbackToBackup(backupKey);
            
            if (rollbackResult.success) {
                showMigrationStatus(`备份恢复成功，已回滚到版本 ${rollbackResult.restoredVersion}`, 'success');
                
                // 刷新状态
                await this.loadMigrationStatus();
                
                // 建议刷新页面
                setTimeout(() => {
                    if (confirm('备份恢复完成，建议刷新页面以确保数据同步，是否立即刷新？')) {
                        window.location.reload();
                    }
                }, 2000);
            }
            
        } catch (error) {
            Logger.error('恢复备份失败', error);
            showMigrationStatus('恢复备份失败：' + error.message, 'error');
        }
    }

    /**
     * 处理删除备份操作
     */
    async handleDeleteBackup(backupKey) {
        const confirmed = confirm('确定要删除此备份吗？删除后无法恢复！');
        if (!confirmed) return;

        try {
            localStorage.removeItem(backupKey);
            
            // 更新备份历史
            const backupHistory = dataMigrationManager.getBackupHistory();
            const updatedHistory = backupHistory.filter(backup => backup.key !== backupKey);
            localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));
            
            showMigrationStatus('备份已删除', 'success');
            
            // 刷新备份列表
            await this.handleListBackups();
            
        } catch (error) {
            Logger.error('删除备份失败', error);
            showMigrationStatus('删除备份失败：' + error.message, 'error');
        }
    }

    /**
     * 处理清理备份操作
     */
    async handleCleanupBackups() {
        const confirmed = confirm('确定要清理旧备份吗？将只保留最近3个备份。');
        if (!confirmed) return;

        try {
            dataMigrationManager.cleanupOldBackups(3);
            showMigrationStatus('旧备份清理完成', 'success');
            
            // 如果备份列表正在显示，刷新它
            const backupListContainer = document.getElementById('backupListContainer');
            if (backupListContainer && backupListContainer.style.display !== 'none') {
                await this.handleListBackups();
            }
            
        } catch (error) {
            Logger.error('清理备份失败', error);
            showMigrationStatus('清理备份失败：' + error.message, 'error');
        }
    }

    /**
     * 处理备份导出操作
     * @param {string} backupKey - 备份键名
     */
    async handleExportBackup(backupKey) {
        try {
            await dataMigrationManager.exportBackupToFile(backupKey);
            showMigrationStatus('备份已导出到文件', 'success');
        } catch (error) {
            Logger.error('导出备份失败', error);
            showMigrationStatus('导出备份失败：' + error.message, 'error');
        }
    }

    /**
     * 处理备份导入操作  
     */
    async handleImportBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const confirmed = confirm('确定要导入此备份吗？当前数据将被覆盖！');
            if (!confirmed) return;

            try {
                showMigrationStatus('正在导入备份...', 'info');
                const result = await dataMigrationManager.importBackupFromFile(file);
                showMigrationStatus(`备份导入成功，共${result.memberCount}个用户`, 'success');
                
                // 刷新状态
                await this.loadMigrationStatus();
                
                // 建议刷新页面
                setTimeout(() => {
                    if (confirm('备份导入完成，建议刷新页面以确保数据同步，是否立即刷新？')) {
                        window.location.reload();
                    }
                }, 2000);
                
            } catch (error) {
                Logger.error('导入备份失败', error);
                showMigrationStatus('导入备份失败：' + error.message, 'error');
            }
        };
        
        input.click();
    }

    /**
     * 显示数据迁移面板
     */
    async showPanel() {
        const panel = document.getElementById('dataMigrationPanel');
        if (panel) {
            panel.style.display = 'block';
            
            if (!this.isInitialized) {
                await this.initialize();
            } else {
                await this.loadMigrationStatus();
            }
        }
    }

    /**
     * 隐藏数据迁移面板
     */
    hidePanel() {
        const panel = document.getElementById('dataMigrationPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
}

// 创建全局实例
export const dataMigrationUIManager = new DataMigrationUIManager();

Logger.info('数据迁移UI管理模块已加载');