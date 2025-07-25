// src/admin/dashboard.js

import { Logger } from '../utils.js';
import { store } from '../state.js';
import { hasPermission } from '../auth.js';
import { PERMISSIONS } from '../config.js';
import { adminMonitoringSystem } from './monitoring.js';
import { userManager } from './userManager.js';
import { createAdminLayout, createAdminButton } from './components.js';
import { weightConfigManager } from './weightConfig.js';
import { auditLogUIManager } from './auditLogUI.js';
import { dataMigrationUIManager } from './dataMigrationUI.js';

/**
 * 管理员仪表盘主模块
 * 负责动态渲染和管理所有管理员功能组件
 */
class AdminDashboard {
    constructor() {
        this.container = document.getElementById('adminSection');
        this.initialized = false;
    }

    /**
     * 初始化仪表盘
     */
    async initialize() {
        if (!this.container || this.initialized) return;

        Logger.info('初始化管理员仪表盘...');
        
        this.renderLayout();
        await this.renderComponents();

        this.initialized = true;
        Logger.info('✅ 管理员仪表盘初始化完成');
    }

    /**
     * 渲染仪表盘的基本布局，使用新的组件系统
     */
    renderLayout() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 使用新的组件系统创建布局
        const layout = createAdminLayout();
        this.container.appendChild(layout);
        
        Logger.debug('管理员布局已渲染');
    }

    /**
     * 根据权限动态渲染各个组件
     */
    async renderComponents() {
        const adminActionsContainer = document.getElementById('adminActions');
        if (!adminActionsContainer) return;

        // 清空现有按钮
        adminActionsContainer.innerHTML = '';

        // 总是显示登出按钮
        const logoutButton = createAdminButton('adminLogoutButton', '📤 退出登录');
        adminActionsContainer.appendChild(logoutButton);

        // 根据权限添加其他按钮
        if (await hasPermission(PERMISSIONS.DATA_REFRESH)) {
            const refreshButton = createAdminButton('refreshDataButton', '🔄 刷新数据');
            adminActionsContainer.appendChild(refreshButton);
        }
        
        if (await hasPermission(PERMISSIONS.SYSTEM_CONFIG)) {
            const weightConfigButton = createAdminButton('weightConfigBtn', '⚖️ 权重配置');
            adminActionsContainer.appendChild(weightConfigButton);
            
            // 初始化权重配置管理
            await weightConfigManager.initialize();
        }
        
        if (await hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
            const configButton = createAdminButton('systemConfigBtn', '⚙️ 系统配置');
            adminActionsContainer.appendChild(configButton);
            
            const auditLogButton = createAdminButton('auditLogBtn', '📋 审计日志');
            adminActionsContainer.appendChild(auditLogButton);
            
            const dataMigrationButton = createAdminButton('dataMigrationBtn', '🔄 数据迁移');
            adminActionsContainer.appendChild(dataMigrationButton);
            
            const monitoringPanel = document.getElementById('monitoringPanel');
            if(monitoringPanel) {
                monitoringPanel.style.display = 'block';
                adminMonitoringSystem.initializeMonitoringUI();
            }
            
            // 显示审计日志面板
            const auditPanel = document.getElementById('auditLogPanel');
            if (auditPanel) {
                auditPanel.style.display = 'block';
            }
            
            // 显示数据迁移面板
            const migrationPanel = document.getElementById('dataMigrationPanel');
            if (migrationPanel) {
                migrationPanel.style.display = 'block';
            }
        }
        
        if (await hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
            const pendingSection = document.getElementById('pendingListSection');
            const memberSection = document.getElementById('memberListSection');
            if (pendingSection) pendingSection.style.display = 'block';
            if (memberSection) memberSection.style.display = 'block';
        }
        
        // TODO: 添加审计日志的渲染逻辑已完成
        
        // 为批量操作绑定事件
        this.bindBatchActions();
    }

    /**
     * 为批量操作按钮绑定事件
     */
    bindBatchActions() {
        // 示例：后续可以添加批量批准、删除等按钮的事件监听
        Logger.debug('用户管理批量操作事件监听器已准备就绪');
    }
}

export const adminDashboard = new AdminDashboard();