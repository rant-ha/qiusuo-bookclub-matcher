// P3功能集成管理器
// 统一管理主题切换、用户设置、数据导出功能

import { Logger } from '../utils.js';
import { themeManager } from './themeManager.js';
import { userSettingsManager } from './userSettings.js';
import { dataExportManager } from './dataExport.js';
import { 
    createUserSettingsPanel, 
    createDataExportPanel, 
    createSettingsQuickActions,
    createSettingsSearchBox,
    showExportStatus 
} from './p3Components.js';

/**
 * P3功能集成管理器
 * 负责整合所有P3阶段的UI/UX改进功能
 */
class P3IntegrationManager {
    constructor() {
        this.initialized = false;
        this.activePanel = null;
        this.searchFilter = '';
        
        // 绑定事件处理方法
        this.handleSettingChange = this.handleSettingChange.bind(this);
        this.handleSettingAction = this.handleSettingAction.bind(this);
        this.handleQuickAction = this.handleQuickAction.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        
        Logger.info('P3功能集成管理器初始化');
    }

    /**
     * 初始化P3功能
     */
    async initialize() {
        if (this.initialized) return;

        try {
            Logger.info('开始初始化P3功能...');
            
            // 初始化各个管理器
            await Promise.all([
                themeManager.initialize(),
                userSettingsManager.initialize()
            ]);
            
            // 设置主题变更监听
            themeManager.onThemeChange(this.handleThemeChange.bind(this));
            
            // 设置用户设置变更监听
            userSettingsManager.onChange(this.handleUserSettingsChange.bind(this));
            
            // 初始化UI
            this.initializeUI();
            
            // 绑定全局事件
            this.bindGlobalEvents();
            
            this.initialized = true;
            Logger.info('✅ P3功能初始化完成');
            
        } catch (error) {
            Logger.error('P3功能初始化失败', error);
            throw error;
        }
    }

    /**
     * 初始化UI元素
     */
    initializeUI() {
        try {
            // 在导航栏添加主题切换按钮
            this.addThemeToggleToNavbar();
            
            // 在用户菜单添加设置入口
            this.addSettingsMenuItems();
            
            // 创建设置面板容器
            this.createSettingsPanelContainer();
            
            // 创建导出面板容器
            this.createExportPanelContainer();
            
            Logger.debug('P3 UI元素初始化完成');
            
        } catch (error) {
            Logger.error('P3 UI初始化失败', error);
        }
    }

    /**
     * 在导航栏添加主题切换按钮
     */
    addThemeToggleToNavbar() {
        const navbar = document.querySelector('.navbar') || document.querySelector('header');
        if (!navbar) return;

        const currentTheme = themeManager.getCurrentThemeConfig();
        const themes = themeManager.getAvailableThemes();
        
        // 创建主题切换按钮
        const themeButton = document.createElement('button');
        themeButton.className = 'theme-toggle-navbar';
        themeButton.innerHTML = `${currentTheme?.icon || '🌓'} <span class="theme-name">${currentTheme?.name || '主题'}</span>`;
        themeButton.title = '切换主题';
        
        themeButton.addEventListener('click', () => {
            themeManager.toggleTheme();
        });
        
        // 添加到导航栏
        const navActions = navbar.querySelector('.nav-actions') || navbar;
        navActions.appendChild(themeButton);
        
        Logger.debug('主题切换按钮已添加到导航栏');
    }

    /**
     * 添加设置菜单项
     */
    addSettingsMenuItems() {
        // 查找用户菜单或创建设置入口
        const userMenu = document.querySelector('.user-menu') || 
                        document.querySelector('.user-profile-section');
        
        if (!userMenu) return;

        // 创建设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn btn-outline settings-btn';
        settingsBtn.innerHTML = '⚙️ 个人设置';
        settingsBtn.addEventListener('click', () => this.showSettingsPanel());
        
        // 创建数据导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-outline export-btn';
        exportBtn.innerHTML = '📤 数据导出';
        exportBtn.addEventListener('click', () => this.showExportPanel());
        
        // 添加到用户菜单
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'user-menu-buttons';
        buttonsContainer.appendChild(settingsBtn);
        buttonsContainer.appendChild(exportBtn);
        
        userMenu.appendChild(buttonsContainer);
        
        Logger.debug('设置菜单项已添加');
    }

    /**
     * 创建设置面板容器
     */
    createSettingsPanelContainer() {
        const container = document.createElement('div');
        container.id = 'settingsPanelContainer';
        container.className = 'modal-overlay settings-modal';
        container.style.display = 'none';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content settings-modal-content';
        
        // 模态框头部
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.textContent = '个人设置';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => this.hideSettingsPanel());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // 模态框内容
        const content = document.createElement('div');
        content.className = 'modal-body settings-modal-body';
        content.id = 'settingsModalBody';
        
        modal.appendChild(header);
        modal.appendChild(content);
        container.appendChild(modal);
        
        // 点击遮罩关闭
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                this.hideSettingsPanel();
            }
        });
        
        document.body.appendChild(container);
    }

    /**
     * 创建导出面板容器
     */
    createExportPanelContainer() {
        const container = document.createElement('div');
        container.id = 'exportPanelContainer';
        container.className = 'modal-overlay export-modal';
        container.style.display = 'none';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content export-modal-content';
        
        // 模态框头部
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.textContent = '数据导出';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => this.hideExportPanel());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // 模态框内容
        const content = document.createElement('div');
        content.className = 'modal-body export-modal-body';
        content.id = 'exportModalBody';
        
        modal.appendChild(header);
        modal.appendChild(content);
        container.appendChild(modal);
        
        // 点击遮罩关闭
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                this.hideExportPanel();
            }
        });
        
        document.body.appendChild(container);
    }

    /**
     * 显示设置面板
     */
    async showSettingsPanel() {
        try {
            const container = document.getElementById('settingsPanelContainer');
            const body = document.getElementById('settingsModalBody');
            
            if (!container || !body) return;

            // 获取当前设置
            const currentSettings = userSettingsManager.settings;
            
            // 清空内容
            body.innerHTML = '';
            
            // 添加搜索框
            const searchBox = createSettingsSearchBox(this.handleSearch);
            body.appendChild(searchBox);
            
            // 添加快捷操作栏
            const quickActions = createSettingsQuickActions(currentSettings, this.handleQuickAction);
            body.appendChild(quickActions);
            
            // 创建设置面板
            const settingsPanel = createUserSettingsPanel(currentSettings, this.handleSettingChange);
            body.appendChild(settingsPanel);
            
            // 添加操作按钮区域
            const actions = document.createElement('div');
            actions.className = 'settings-actions';
            actions.innerHTML = `
                <button class="btn btn-secondary" onclick="p3IntegrationManager.handleSettingAction('reset')">
                    🔄 重置默认
                </button>
                <button class="btn btn-info" onclick="p3IntegrationManager.handleSettingAction('export')">
                    📤 导出设置
                </button>
                <button class="btn btn-info" onclick="p3IntegrationManager.handleSettingAction('import')">
                    📥 导入设置
                </button>
            `;
            body.appendChild(actions);
            
            // 显示模态框
            container.style.display = 'flex';
            this.activePanel = 'settings';
            
            Logger.debug('设置面板已显示');
            
        } catch (error) {
            Logger.error('显示设置面板失败', error);
        }
    }

    /**
     * 隐藏设置面板
     */
    hideSettingsPanel() {
        const container = document.getElementById('settingsPanelContainer');
        if (container) {
            container.style.display = 'none';
            this.activePanel = null;
        }
    }

    /**
     * 显示导出面板
     */
    async showExportPanel() {
        try {
            const container = document.getElementById('exportPanelContainer');
            const body = document.getElementById('exportModalBody');
            
            if (!container || !body) return;

            // 获取导出历史
            const exportHistory = dataExportManager.getExportHistory();
            
            // 清空内容并创建导出面板
            body.innerHTML = '';
            const exportPanel = createDataExportPanel(exportHistory, this.handleExport);
            body.appendChild(exportPanel);
            
            // 显示模态框
            container.style.display = 'flex';
            this.activePanel = 'export';
            
            Logger.debug('导出面板已显示');
            
        } catch (error) {
            Logger.error('显示导出面板失败', error);
        }
    }

    /**
     * 隐藏导出面板
     */
    hideExportPanel() {
        const container = document.getElementById('exportPanelContainer');
        if (container) {
            container.style.display = 'none';
            this.activePanel = null;
        }
    }

    /**
     * 处理设置变更
     * @param {string} path - 设置路径
     * @param {*} value - 新值
     */
    async handleSettingChange(path, value) {
        try {
            await userSettingsManager.set(path, value);
            Logger.debug('设置已更新', { path, value });
        } catch (error) {
            Logger.error('设置更新失败', error);
            showExportStatus('设置更新失败', 'error');
        }
    }

    /**
     * 处理设置操作
     * @param {string} action - 操作类型
     * @param {*} data - 操作数据
     */
    async handleSettingAction(action, data) {
        try {
            switch (action) {
                case 'reset':
                    if (confirm('确定要重置所有设置为默认值吗？')) {
                        await userSettingsManager.resetToDefaults();
                        showExportStatus('设置已重置为默认值', 'success');
                        this.showSettingsPanel(); // 刷新面板
                    }
                    break;
                    
                case 'export':
                    const settings = userSettingsManager.exportSettings();
                    const settingsBlob = new Blob([JSON.stringify(settings, null, 2)], {
                        type: 'application/json'
                    });
                    const url = URL.createObjectURL(settingsBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bookclub_settings_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showExportStatus('设置已导出', 'success');
                    break;
                    
                case 'import':
                    if (data instanceof File) {
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            try {
                                const importedSettings = JSON.parse(e.target.result);
                                await userSettingsManager.importSettings(importedSettings);
                                showExportStatus('设置导入成功', 'success');
                                this.showSettingsPanel(); // 刷新面板
                            } catch (error) {
                                Logger.error('设置导入失败', error);
                                showExportStatus('设置导入失败', 'error');
                            }
                        };
                        reader.readAsText(data);
                    } else {
                        // 打开文件选择对话框
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                this.handleSettingAction('import', file);
                            }
                        };
                        input.click();
                    }
                    break;
                    
                default:
                    Logger.warn('未知的设置操作', action);
            }
        } catch (error) {
            Logger.error('设置操作失败', error);
            showExportStatus('操作失败', 'error');
        }
    }

    /**
     * 处理快捷操作
     * @param {string} action - 操作类型
     */
    async handleQuickAction(action) {
        try {
            switch (action) {
                case 'toggleTheme':
                    themeManager.toggleTheme();
                    break;
                    
                case 'increaseFontSize':
                    const currentSize = userSettingsManager.get('ui.fontSize');
                    const sizeMap = { small: 'medium', medium: 'large', large: 'large' };
                    await userSettingsManager.set('ui.fontSize', sizeMap[currentSize] || 'medium');
                    break;
                    
                case 'decreaseFontSize':
                    const currentSizeDown = userSettingsManager.get('ui.fontSize');
                    const sizeMapDown = { large: 'medium', medium: 'small', small: 'small' };
                    await userSettingsManager.set('ui.fontSize', sizeMapDown[currentSizeDown] || 'medium');
                    break;
                    
                case 'toggleCompactMode':
                    const currentCompact = userSettingsManager.get('ui.compactMode');
                    await userSettingsManager.set('ui.compactMode', !currentCompact);
                    break;
                    
                default:
                    Logger.warn('未知的快捷操作', action);
            }
        } catch (error) {
            Logger.error('快捷操作失败', error);
        }
    }

    /**
     * 处理数据导出
     * @param {string} type - 导出类型
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     */
    async handleExport(type, format, options = {}) {
        try {
            showExportStatus('正在准备导出...', 'info');
            
            let result;
            
            switch (type) {
                case 'users':
                    result = await dataExportManager.exportUserData(format, options);
                    break;
                    
                case 'matches':
                    result = await dataExportManager.exportMatchingHistory(format, options);
                    break;
                    
                case 'settings':
                    result = await dataExportManager.exportSystemSettings(format);
                    break;
                    
                case 'batch':
                    const batchTasks = [];
                    if (options.includeUsers) {
                        batchTasks.push({ type: 'users', format, options: {} });
                    }
                    if (options.includeMatches) {
                        batchTasks.push({ type: 'matches', format, options: {} });
                    }
                    if (options.includeSettings) {
                        batchTasks.push({ type: 'settings', format, options: {} });
                    }
                    
                    const batchResults = await dataExportManager.batchExport(batchTasks);
                    const successCount = batchResults.filter(r => r.success).length;
                    
                    showExportStatus(
                        `批量导出完成：${successCount}/${batchResults.length} 个文件成功`,
                        successCount === batchResults.length ? 'success' : 'error'
                    );
                    
                    // 刷新导出面板以显示新的历史记录
                    if (this.activePanel === 'export') {
                        setTimeout(() => this.showExportPanel(), 1000);
                    }
                    return;
                    
                default:
                    throw new Error(`不支持的导出类型: ${type}`);
            }
            
            if (result && result.success) {
                showExportStatus(
                    `导出成功：${result.filename} (${result.recordCount} 条记录)`,
                    'success'
                );
                
                // 刷新导出面板
                if (this.activePanel === 'export') {
                    setTimeout(() => this.showExportPanel(), 1000);
                }
            }
            
        } catch (error) {
            Logger.error('数据导出失败', error);
            showExportStatus(`导出失败：${error.message}`, 'error');
        }
    }

    /**
     * 处理搜索
     * @param {string} query - 搜索查询
     */
    handleSearch(query) {
        this.searchFilter = query.toLowerCase();
        this.filterSettingItems();
    }

    /**
     * 过滤设置项
     */
    filterSettingItems() {
        const settingItems = document.querySelectorAll('.setting-item');
        const settingGroups = document.querySelectorAll('.setting-group');
        
        settingItems.forEach(item => {
            const label = item.querySelector('.setting-label');
            const text = label ? label.textContent.toLowerCase() : '';
            const matches = !this.searchFilter || text.includes(this.searchFilter);
            
            item.style.display = matches ? 'block' : 'none';
        });
        
        // 隐藏空的设置组
        settingGroups.forEach(group => {
            const visibleItems = group.querySelectorAll('.setting-item[style*="block"], .setting-item:not([style])');
            group.style.display = visibleItems.length > 0 ? 'block' : 'none';
        });
    }

    /**
     * 处理主题变更
     * @param {Object} event - 主题变更事件
     */
    handleThemeChange(event) {
        Logger.debug('主题已变更', event.detail);
        
        // 更新导航栏主题按钮
        const themeButton = document.querySelector('.theme-toggle-navbar');
        if (themeButton) {
            const config = event.detail.config;
            themeButton.innerHTML = `${config?.icon || '🌓'} <span class="theme-name">${config?.name || '主题'}</span>`;
        }
        
        // 如果设置面板打开，刷新快捷操作栏
        if (this.activePanel === 'settings') {
            const quickActions = document.querySelector('.settings-quick-actions');
            if (quickActions) {
                const themeToggle = quickActions.querySelector('.theme-quick-toggle .quick-action-icon');
                if (themeToggle) {
                    themeToggle.textContent = event.detail.actualTheme === 'dark' ? '🌙' : '☀️';
                }
            }
        }
    }

    /**
     * 处理用户设置变更
     * @param {Object} event - 设置变更事件
     */
    handleUserSettingsChange(event) {
        Logger.debug('用户设置已变更', event);
        
        // 如果设置面板打开，可能需要更新UI
        if (this.activePanel === 'settings' && event.path !== '*') {
            // 这里可以添加特定设置项的UI更新逻辑
        }
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // ESC键关闭面板
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.activePanel === 'settings') {
                    this.hideSettingsPanel();
                } else if (this.activePanel === 'export') {
                    this.hideExportPanel();
                }
            }
        });
        
        // 清理导出历史事件
        window.addEventListener('clearExportHistory', () => {
            dataExportManager.clearExportHistory();
            if (this.activePanel === 'export') {
                this.showExportPanel(); // 刷新面板
            }
            showExportStatus('导出历史已清理', 'success');
        });
        
        Logger.debug('全局事件已绑定');
    }

    /**
     * 获取P3功能状态
     * @returns {Object} 功能状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            activePanel: this.activePanel,
            themeManager: themeManager.initialized,
            userSettingsManager: userSettingsManager.initialized,
            currentTheme: themeManager.getActualTheme(),
            settingsSummary: userSettingsManager.getSummary()
        };
    }

    /**
     * 销毁P3功能管理器
     */
    destroy() {
        // 移除事件监听器
        themeManager.offThemeChange(this.handleThemeChange);
        userSettingsManager.offChange(this.handleUserSettingsChange);
        
        // 销毁各个管理器
        themeManager.destroy();
        userSettingsManager.destroy();
        
        // 移除UI元素
        const settingsContainer = document.getElementById('settingsPanelContainer');
        const exportContainer = document.getElementById('exportPanelContainer');
        
        if (settingsContainer) settingsContainer.remove();
        if (exportContainer) exportContainer.remove();
        
        this.initialized = false;
        this.activePanel = null;
        
        Logger.info('P3功能管理器已销毁');
    }
}

// 创建全局P3功能管理器实例
export const p3IntegrationManager = new P3IntegrationManager();

// 暴露到全局作用域以便HTML中调用
if (typeof window !== 'undefined') {
    window.p3IntegrationManager = p3IntegrationManager;
    
    // 页面加载时自动初始化
    document.addEventListener('DOMContentLoaded', () => {
        p3IntegrationManager.initialize().catch(error => {
            Logger.error('P3功能自动初始化失败', error);
        });
    });
}

Logger.info('P3功能集成管理模块已加载');