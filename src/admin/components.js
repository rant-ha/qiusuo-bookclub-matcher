// 管理员界面组件模块
// 提供可复用的管理员界面组件，防止XSS攻击并提升可维护性

import { Logger, sanitizeText } from '../utils.js';
import { hasPermissionSync } from '../auth.js';
import { PERMISSIONS } from '../config.js';

/**
 * 创建管理员仪表盘布局
 * @returns {HTMLElement} 仪表盘容器元素
 */
export function createAdminLayout() {
    const container = document.createElement('div');
    
    // 主面板区域
    const mainSection = document.createElement('div');
    mainSection.className = 'section';
    
    const title = document.createElement('h2');
    title.textContent = '管理员面板';
    mainSection.appendChild(title);
    
    // 角色指示器
    const roleIndicator = document.createElement('div');
    roleIndicator.id = 'adminRoleIndicator';
    roleIndicator.className = 'admin-role-badge';
    roleIndicator.style.display = 'none';
    mainSection.appendChild(roleIndicator);
    
    // 操作按钮区域
    const actionsContainer = createActionsContainer();
    mainSection.appendChild(actionsContainer);
    
    container.appendChild(mainSection);
    
    // 监控面板
    const monitoringPanel = createMonitoringPanelContainer();
    container.appendChild(monitoringPanel);
    
    // 用户管理区域
    const userManagement = createUserManagementContainer();
    container.appendChild(userManagement);
    
    // 审计日志面板
    const auditPanel = createAuditLogContainer();
    container.appendChild(auditPanel);
    
    // 权重配置管理面板
    const weightConfigPanel = createWeightConfigContainer();
    container.appendChild(weightConfigPanel);
    
    // 数据迁移管理面板
    const dataMigrationPanel = createDataMigrationContainer();
    container.appendChild(dataMigrationPanel);
    
    Logger.debug('管理员布局组件已创建');
    return container;
}

/**
 * 创建操作按钮容器
 * @returns {HTMLElement} 按钮容器元素
 */
function createActionsContainer() {
    const container = document.createElement('div');
    container.id = 'adminActions';
    container.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;';
    return container;
}

/**
 * 创建监控面板容器
 * @returns {HTMLElement} 监控面板容器
 */
function createMonitoringPanelContainer() {
    const panel = document.createElement('div');
    panel.id = 'monitoringPanel';
    panel.className = 'section';
    panel.style.display = 'none';
    return panel;
}

/**
 * 创建用户管理容器
 * @returns {HTMLElement} 用户管理容器
 */
function createUserManagementContainer() {
    const container = document.createElement('div');
    container.id = 'userManagementContainer';
    
    // 待审核列表区域
    const pendingSection = document.createElement('div');
    pendingSection.id = 'pendingListSection';
    pendingSection.className = 'section';
    pendingSection.style.display = 'none';
    
    const pendingTitle = document.createElement('h2');
    pendingTitle.textContent = '待审核列表';
    pendingSection.appendChild(pendingTitle);
    
    const pendingList = document.createElement('div');
    pendingList.id = 'pendingList';
    pendingList.className = 'member-list';
    pendingSection.appendChild(pendingList);
    
    container.appendChild(pendingSection);
    
    // 已批准成员区域
    const memberSection = document.createElement('div');
    memberSection.id = 'memberListSection';
    memberSection.className = 'section';
    memberSection.style.display = 'none';
    
    const memberTitle = document.createElement('h2');
    memberTitle.textContent = '已批准成员列表 ';
    
    const memberCount = document.createElement('span');
    memberCount.id = 'memberCount';
    memberCount.style.cssText = 'color: #666; font-size: 14px;';
    memberTitle.appendChild(memberCount);
    
    memberSection.appendChild(memberTitle);
    
    const memberList = document.createElement('div');
    memberList.id = 'memberList';
    memberList.className = 'member-list';
    memberSection.appendChild(memberList);
    
    container.appendChild(memberSection);
    
    return container;
}

/**
 * 创建审计日志容器
 * @returns {HTMLElement} 审计日志容器
 */
function createAuditLogContainer() {
    const panel = document.createElement('div');
    panel.id = 'auditLogPanel';
    panel.className = 'section';
    panel.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'section-header';
    
    const title = document.createElement('h2');
    title.textContent = '审计日志管理';
    header.appendChild(title);
    
    const description = document.createElement('p');
    description.className = 'section-description';
    description.textContent = '查看和管理系统操作的审计日志记录';
    header.appendChild(description);
    
    panel.appendChild(header);
    
    // 筛选控件
    const filterContainer = createAuditLogFilters();
    panel.appendChild(filterContainer);
    
    // 统计信息
    const statsContainer = createAuditLogStats();
    panel.appendChild(statsContainer);
    
    // 日志列表
    const logContainer = document.createElement('div');
    logContainer.id = 'auditLogList';
    logContainer.className = 'audit-log-list';
    panel.appendChild(logContainer);
    
    // 分页控件
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'auditLogPagination';
    paginationContainer.className = 'audit-log-pagination';
    panel.appendChild(paginationContainer);
    
    return panel;
}

/**
 * 创建审计日志过滤器
 * @returns {HTMLElement} 过滤器容器
 */
function createAuditLogFilters() {
    const container = document.createElement('div');
    container.className = 'audit-log-filters';
    
    const filtersRow = document.createElement('div');
    filtersRow.style.cssText = 'display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: end;';
    
    // 操作类型过滤
    const actionGroup = document.createElement('div');
    actionGroup.className = 'filter-group';
    
    const actionLabel = document.createElement('label');
    actionLabel.textContent = '操作类型：';
    actionLabel.className = 'filter-label';
    actionGroup.appendChild(actionLabel);
    
    const actionSelect = document.createElement('select');
    actionSelect.id = 'auditActionFilter';
    actionSelect.className = 'filter-select';
    
    const actionOptions = [
        { value: '', text: '全部操作' },
        { value: 'LOGIN', text: '登录操作' },
        { value: 'USER_MANAGEMENT', text: '用户管理' },
        { value: 'SYSTEM_CONFIG', text: '系统配置' },
        { value: 'WEIGHT_CONFIG', text: '权重配置' },
        { value: 'DATA_EXPORT', text: '数据导出' },
        { value: 'AUDIT_LOG', text: '审计日志操作' }
    ];
    
    actionOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        actionSelect.appendChild(optionElement);
    });
    
    actionGroup.appendChild(actionSelect);
    filtersRow.appendChild(actionGroup);
    
    // 管理员过滤
    const adminGroup = document.createElement('div');
    adminGroup.className = 'filter-group';
    
    const adminLabel = document.createElement('label');
    adminLabel.textContent = '操作管理员：';
    adminLabel.className = 'filter-label';
    adminGroup.appendChild(adminLabel);
    
    const adminInput = document.createElement('input');
    adminInput.type = 'text';
    adminInput.id = 'auditAdminFilter';
    adminInput.className = 'filter-input';
    adminInput.placeholder = '管理员姓名';
    adminGroup.appendChild(adminInput);
    
    filtersRow.appendChild(adminGroup);
    
    // 日期范围过滤
    const dateGroup = document.createElement('div');
    dateGroup.className = 'filter-group';
    
    const dateLabel = document.createElement('label');
    dateLabel.textContent = '时间范围：';
    dateLabel.className = 'filter-label';
    dateGroup.appendChild(dateLabel);
    
    const dateContainer = document.createElement('div');
    dateContainer.style.cssText = 'display: flex; gap: 5px; align-items: center;';
    
    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.id = 'auditStartDate';
    startDateInput.className = 'filter-date';
    dateContainer.appendChild(startDateInput);
    
    const dateSeparator = document.createElement('span');
    dateSeparator.textContent = '至';
    dateContainer.appendChild(dateSeparator);
    
    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.id = 'auditEndDate';
    endDateInput.className = 'filter-date';
    dateContainer.appendChild(endDateInput);
    
    dateGroup.appendChild(dateContainer);
    filtersRow.appendChild(dateGroup);
    
    // 操作按钮
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'filter-buttons';
    
    const searchButton = createAdminButton('auditSearchBtn', '🔍 搜索', 'primary');
    const resetButton = createAdminButton('auditResetBtn', '🔄 重置', 'secondary');
    const exportButton = createAdminButton('auditExportBtn', '📤 导出', 'secondary');
    
    buttonGroup.appendChild(searchButton);
    buttonGroup.appendChild(resetButton);
    buttonGroup.appendChild(exportButton);
    
    filtersRow.appendChild(buttonGroup);
    container.appendChild(filtersRow);
    
    return container;
}

/**
 * 创建审计日志统计信息
 * @returns {HTMLElement} 统计信息容器
 */
function createAuditLogStats() {
    const container = document.createElement('div');
    container.id = 'auditLogStats';
    container.className = 'audit-log-stats';
    container.style.cssText = 'display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;';
    
    const statsCards = [
        { id: 'totalLogs', label: '总日志数', value: '0' },
        { id: 'last24Hours', label: '24小时内', value: '0' },
        { id: 'last7Days', label: '7天内', value: '0' },
        { id: 'currentPage', label: '当前页面', value: '1/1' }
    ];
    
    statsCards.forEach(card => {
        const cardElement = createMetricCard(card.label, `audit${card.id}`, card.value);
        cardElement.className = 'audit-metric-card';
        container.appendChild(cardElement);
    });
    
    return container;
}

/**
 * 创建审计日志条目
 * @param {Object} logEntry - 日志条目数据
 * @returns {HTMLElement} 日志条目元素
 */
export function createAuditLogEntry(logEntry) {
    const entry = document.createElement('div');
    entry.className = 'audit-log-entry';
    entry.dataset.logId = logEntry.id;
    
    const header = document.createElement('div');
    header.className = 'audit-log-header';
    
    const actionBadge = document.createElement('span');
    actionBadge.className = `audit-action-badge ${getActionBadgeClass(logEntry.action)}`;
    actionBadge.textContent = sanitizeText(logEntry.action);
    header.appendChild(actionBadge);
    
    const timestamp = document.createElement('span');
    timestamp.className = 'audit-timestamp';
    timestamp.textContent = formatTimestamp(logEntry.timestamp);
    header.appendChild(timestamp);
    
    const adminName = document.createElement('span');
    adminName.className = 'audit-admin-name';
    adminName.textContent = sanitizeText(logEntry.adminName);
    header.appendChild(adminName);
    
    entry.appendChild(header);
    
    const details = document.createElement('div');
    details.className = 'audit-log-details';
    details.textContent = sanitizeText(logEntry.details);
    entry.appendChild(details);
    
    // 展开/折叠按钮
    if (logEntry.metadata && Object.keys(logEntry.metadata).length > 0) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'audit-toggle-button';
        toggleButton.textContent = '显示详情';
        toggleButton.addEventListener('click', () => toggleAuditLogMetadata(logEntry.id));
        entry.appendChild(toggleButton);
        
        const metadata = document.createElement('div');
        metadata.className = 'audit-log-metadata';
        metadata.id = `auditMetadata_${logEntry.id}`;
        metadata.style.display = 'none';
        
        Object.entries(logEntry.metadata).forEach(([key, value]) => {
            const metaItem = document.createElement('div');
            metaItem.className = 'audit-metadata-item';
            metaItem.innerHTML = `<strong>${sanitizeText(key)}:</strong> ${sanitizeText(value)}`;
            metadata.appendChild(metaItem);
        });
        
        entry.appendChild(metadata);
    }
    
    return entry;
}

/**
 * 获取操作类型徽章CSS类名
 * @param {string} action - 操作类型
 * @returns {string} CSS类名
 */
function getActionBadgeClass(action) {
    const actionMappings = {
        'LOGIN': 'login',
        'LOGOUT': 'logout',
        'USER_MANAGEMENT': 'user',
        'SYSTEM_CONFIG': 'config',
        'WEIGHT_CONFIG': 'weight',
        'DATA_EXPORT': 'export',
        'AUDIT_LOG': 'audit'
    };
    
    return actionMappings[action] || 'default';
}

/**
 * 格式化时间戳
 * @param {string} timestamp - ISO时间戳
 * @returns {string} 格式化的时间字符串
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * 切换审计日志元数据显示
 * @param {string} logId - 日志ID
 */
function toggleAuditLogMetadata(logId) {
    const metadata = document.getElementById(`auditMetadata_${logId}`);
    const button = document.querySelector(`[data-log-id="${logId}"] .audit-toggle-button`);
    
    if (metadata && button) {
        const isVisible = metadata.style.display !== 'none';
        metadata.style.display = isVisible ? 'none' : 'block';
        button.textContent = isVisible ? '显示详情' : '隐藏详情';
    }
}

/**
 * 显示审计日志状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('success', 'error', 'warning', 'info')
 */
export function showAuditLogStatus(message, type = 'info') {
    // 创建或更新状态消息容器
    let statusContainer = document.getElementById('auditLogStatus');
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.id = 'auditLogStatus';
        statusContainer.className = 'audit-log-status';
        
        const auditPanel = document.getElementById('auditLogPanel');
        if (auditPanel) {
            auditPanel.insertBefore(statusContainer, auditPanel.querySelector('.audit-log-filters'));
        }
    }
    
    statusContainer.textContent = sanitizeText(message);
    statusContainer.className = `audit-log-status ${type}`;
    statusContainer.style.display = 'block';
    
    // 自动隐藏
    setTimeout(() => {
        statusContainer.style.display = 'none';
    }, 5000);
}

// 将切换函数暴露到全局作用域
window.toggleAuditLogMetadata = toggleAuditLogMetadata;

/**
 * 创建数据迁移管理容器
 * @returns {HTMLElement} 数据迁移管理容器
 */
function createDataMigrationContainer() {
    const panel = document.createElement('div');
    panel.id = 'dataMigrationPanel';
    panel.className = 'section';
    panel.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'section-header';
    
    const title = document.createElement('h2');
    title.textContent = '数据迁移管理';
    header.appendChild(title);
    
    const description = document.createElement('p');
    description.className = 'section-description';
    description.textContent = '管理系统数据迁移和版本升级，确保数据完整性';
    header.appendChild(description);
    
    panel.appendChild(header);
    
    // 迁移状态显示
    const statusContainer = createMigrationStatusContainer();
    panel.appendChild(statusContainer);
    
    // 迁移控制区域
    const controlContainer = createMigrationControlContainer();
    panel.appendChild(controlContainer);
    
    // 备份管理区域
    const backupContainer = createBackupManagementContainer();
    panel.appendChild(backupContainer);
    
    return panel;
}

/**
 * 创建迁移状态容器
 * @returns {HTMLElement} 状态容器
 */
function createMigrationStatusContainer() {
    const container = document.createElement('div');
    container.id = 'migrationStatusContainer';
    container.className = 'migration-status-container';
    container.style.cssText = 'display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;';
    
    const statusCards = [
        { id: 'currentVersion', label: '当前版本', value: '--' },
        { id: 'migrationStatus', label: '迁移状态', value: '检查中...' },
        { id: 'dataCount', label: '数据条数', value: '--' },
        { id: 'lastMigration', label: '上次迁移', value: '--' }
    ];
    
    statusCards.forEach(card => {
        const cardElement = createMetricCard(card.label, `migration${card.id}`, card.value);
        cardElement.className = 'migration-metric-card';
        container.appendChild(cardElement);
    });
    
    return container;
}

/**
 * 创建迁移控制容器
 * @returns {HTMLElement} 控制容器
 */
function createMigrationControlContainer() {
    const container = document.createElement('div');
    container.className = 'migration-control-container';
    container.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;';
    
    const controlTitle = document.createElement('h3');
    controlTitle.textContent = '迁移控制';
    container.appendChild(controlTitle);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'migration-button-group';
    buttonGroup.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap; margin: 15px 0;';
    
    const checkButton = createAdminButton('checkMigrationBtn', '🔍 检查迁移', 'primary');
    const performButton = createAdminButton('performMigrationBtn', '🚀 执行迁移', 'secondary');
    const validateButton = createAdminButton('validateDataBtn', '✅ 验证数据', 'secondary');
    
    performButton.disabled = true; // 默认禁用
    
    buttonGroup.appendChild(checkButton);
    buttonGroup.appendChild(performButton);
    buttonGroup.appendChild(validateButton);
    
    container.appendChild(buttonGroup);
    
    // 迁移详情区域
    const detailsContainer = document.createElement('div');
    detailsContainer.id = 'migrationDetails';
    detailsContainer.className = 'migration-details';
    detailsContainer.style.display = 'none';
    container.appendChild(detailsContainer);
    
    return container;
}

/**
 * 创建备份管理容器
 * @returns {HTMLElement} 备份管理容器
 */
function createBackupManagementContainer() {
    const container = document.createElement('div');
    container.className = 'backup-management-container';
    container.style.cssText = 'background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;';
    
    const backupTitle = document.createElement('h3');
    backupTitle.textContent = '备份管理';
    container.appendChild(backupTitle);
    
    const backupControls = document.createElement('div');
    backupControls.className = 'backup-controls';
    backupControls.style.cssText = 'display: flex; gap: 10px; margin: 15px 0;';
    
    const createBackupButton = createAdminButton('createBackupBtn', '💾 创建备份', 'secondary');
    const listBackupsButton = createAdminButton('listBackupsBtn', '📋 备份列表', 'secondary');
    const cleanupButton = createAdminButton('cleanupBackupsBtn', '🧹 清理备份', 'secondary');
    
    backupControls.appendChild(createBackupButton);
    backupControls.appendChild(listBackupsButton);
    backupControls.appendChild(cleanupButton);
    
    container.appendChild(backupControls);
    
    // 备份列表区域
    const backupListContainer = document.createElement('div');
    backupListContainer.id = 'backupListContainer';
    backupListContainer.className = 'backup-list-container';
    backupListContainer.style.display = 'none';
    container.appendChild(backupListContainer);
    
    return container;
}

/**
 * 创建迁移详情显示
 * @param {Object} migrationInfo - 迁移信息
 * @returns {HTMLElement} 详情元素
 */
export function createMigrationDetails(migrationInfo) {
    const container = document.createElement('div');
    container.className = 'migration-details-content';
    
    // 基本信息
    const infoSection = document.createElement('div');
    infoSection.className = 'migration-info-section';
    infoSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px;';
    
    const infoTitle = document.createElement('h4');
    infoTitle.textContent = '迁移信息';
    infoSection.appendChild(infoTitle);
    
    const infoList = document.createElement('ul');
    infoList.className = 'migration-info-list';
    
    const infoItems = [
        { label: '当前版本', value: migrationInfo.fromVersion },
        { label: '目标版本', value: migrationInfo.toVersion },
        { label: '数据条数', value: migrationInfo.membersCount },
        { label: '迁移状态', value: migrationInfo.migrationStatus }
    ];
    
    infoItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${sanitizeText(item.label)}:</strong> ${sanitizeText(String(item.value))}`;
        infoList.appendChild(listItem);
    });
    
    infoSection.appendChild(infoList);
    container.appendChild(infoSection);
    
    // 数据问题
    if (migrationInfo.dataIssues && migrationInfo.dataIssues.length > 0) {
        const issuesSection = document.createElement('div');
        issuesSection.className = 'migration-issues-section';
        issuesSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8d7da; border-radius: 6px;';
        
        const issuesTitle = document.createElement('h4');
        issuesTitle.textContent = `数据问题 (${migrationInfo.dataIssues.length})`;
        issuesTitle.style.color = '#dc3545';
        issuesSection.appendChild(issuesTitle);
        
        const issuesList = document.createElement('ul');
        issuesList.className = 'migration-issues-list';
        
        migrationInfo.dataIssues.slice(0, 10).forEach(issue => {
            const issueItem = document.createElement('li');
            issueItem.className = `issue-${issue.type}`;
            issueItem.textContent = sanitizeText(issue.message);
            issuesList.appendChild(issueItem);
        });
        
        if (migrationInfo.dataIssues.length > 10) {
            const moreItem = document.createElement('li');
            moreItem.textContent = `... 还有 ${migrationInfo.dataIssues.length - 10} 个问题`;
            moreItem.style.fontStyle = 'italic';
            issuesList.appendChild(moreItem);
        }
        
        issuesSection.appendChild(issuesList);
        container.appendChild(issuesSection);
    }
    
    return container;
}

/**
 * 创建备份列表项
 * @param {Object} backup - 备份信息
 * @returns {HTMLElement} 备份列表项
 */
export function createBackupListItem(backup) {
    const item = document.createElement('div');
    item.className = 'backup-list-item';
    item.dataset.backupKey = backup.key;
    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 8px;';
    
    const info = document.createElement('div');
    info.className = 'backup-info';
    
    const date = document.createElement('div');
    date.className = 'backup-date';
    date.textContent = new Date(backup.date).toLocaleString('zh-CN');
    date.style.fontWeight = 'bold';
    info.appendChild(date);
    
    const details = document.createElement('div');
    details.style.fontSize = '14px';
    details.style.color = '#6c757d';
    details.textContent = `版本: ${backup.version} | 用户: ${backup.memberCount}`;
    info.appendChild(details);
    
    item.appendChild(info);
    
    const actions = document.createElement('div');
    actions.className = 'backup-actions';
    actions.style.cssText = 'display: flex; gap: 5px;';
    
    const restoreButton = createAdminButton(`restore_${backup.key}`, '恢复', 'primary');
    restoreButton.style.fontSize = '12px';
    restoreButton.style.padding = '4px 8px';
    
    const deleteButton = createAdminButton(`delete_${backup.key}`, '删除', 'secondary');
    deleteButton.style.fontSize = '12px';
    deleteButton.style.padding = '4px 8px';
    
    actions.appendChild(restoreButton);
    actions.appendChild(deleteButton);
    
    item.appendChild(actions);
    
    return item;
}

/**
 * 显示数据迁移状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
export function showMigrationStatus(message, type = 'info') {
    // 创建或更新状态消息容器
    let statusContainer = document.getElementById('migrationStatusMessage');
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.id = 'migrationStatusMessage';
        statusContainer.className = 'migration-status-message';
        statusContainer.style.cssText = 'padding: 12px 16px; margin-bottom: 20px; border-radius: 6px; font-size: 14px; font-weight: 500;';
        
        const migrationPanel = document.getElementById('dataMigrationPanel');
        if (migrationPanel) {
            const header = migrationPanel.querySelector('.section-header');
            if (header) {
                migrationPanel.insertBefore(statusContainer, header.nextSibling);
            }
        }
    }
    
    statusContainer.textContent = sanitizeText(message);
    statusContainer.style.display = 'block';
    
    // 根据类型设置样式
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', color: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', color: '#721c24' },
        warning: { bg: '#fff3cd', border: '#ffeaa7', color: '#856404' },
        info: { bg: '#d1ecf1', border: '#bee5eb', color: '#0c5460' }
    };
    
    const colorScheme = colors[type] || colors.info;
    statusContainer.style.backgroundColor = colorScheme.bg;
    statusContainer.style.borderColor = colorScheme.border;
    statusContainer.style.color = colorScheme.color;
    statusContainer.style.border = `1px solid ${colorScheme.border}`;
    
    // 自动隐藏
    setTimeout(() => {
        statusContainer.style.display = 'none';
    }, 5000);
}

/**
 * 创建管理员操作按钮
 * @param {string} id - 按钮ID
 * @param {string} text - 按钮文本（会被sanitize）
 * @param {string} className - CSS类名，默认为'secondary'
 * @returns {HTMLElement} 按钮元素
 */
export function createAdminButton(id, text, className = 'secondary') {
    const button = document.createElement('button');
    button.id = sanitizeText(id);
    button.className = className;
    button.textContent = sanitizeText(text);
    return button;
}

/**
 * 创建指标卡片组件
 * @param {string} label - 指标标签（会被sanitize）
 * @param {string} valueId - 值显示元素的ID
 * @param {string} initialValue - 初始值（会被sanitize）
 * @returns {HTMLElement} 指标卡片元素
 */
export function createMetricCard(label, valueId, initialValue = '--') {
    const card = document.createElement('div');
    card.className = 'metric-card';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'metric-label';
    labelDiv.textContent = sanitizeText(label);
    card.appendChild(labelDiv);
    
    const valueDiv = document.createElement('div');
    valueDiv.id = sanitizeText(valueId);
    valueDiv.className = 'metric-value';
    valueDiv.textContent = sanitizeText(initialValue);
    card.appendChild(valueDiv);
    
    return card;
}

/**
 * 创建图表画布容器
 * @param {string} canvasId - 画布ID
 * @param {string} title - 图表标题（会被sanitize）
 * @param {string} containerClass - 容器CSS类，默认为'chart-container'
 * @returns {HTMLElement} 图表容器元素
 */
export function createChartContainer(canvasId, title, containerClass = 'chart-container') {
    const container = document.createElement('div');
    container.className = containerClass;
    
    const titleElement = document.createElement('h4');
    titleElement.textContent = sanitizeText(title);
    container.appendChild(titleElement);
    
    const canvas = document.createElement('canvas');
    canvas.id = sanitizeText(canvasId);
    canvas.style.cssText = 'max-height: 300px;';
    container.appendChild(canvas);
    
    return container;
}

/**
 * 创建安全的文本节点
 * @param {string} text - 要显示的文本
 * @param {string} tagName - HTML标签名，默认为'span'
 * @param {string} className - CSS类名（可选）
 * @returns {HTMLElement} 文本元素
 */
export function createSafeTextElement(text, tagName = 'span', className = '') {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = sanitizeText(text);
    return element;
}

/**
 * 创建带权限检查的组件容器
 * @param {string} permission - 需要的权限
 * @param {function} createContent - 创建内容的函数
 * @param {string} noPermissionMessage - 无权限时的提示信息
 * @returns {HTMLElement} 组件容器
 */
export function createPermissionGatedComponent(permission, createContent, noPermissionMessage = '权限不足') {
    const container = document.createElement('div');
    
    if (hasPermissionSync(permission)) {
        const content = createContent();
        if (content) {
            container.appendChild(content);
        }
    } else {
        const message = createSafeTextElement(noPermissionMessage, 'p', 'permission-warning');
        container.appendChild(message);
    }
    
    return container;
}

/**
 * 安全地设置元素的HTML内容
 * @param {HTMLElement} element - 目标元素
 * @param {string} content - 要设置的内容（会被sanitize）
 */
export function setSafeContent(element, content) {
    if (element && typeof content === 'string') {
        element.textContent = sanitizeText(content);
    }
}

/**
 * 安全地更新元素属性
 * @param {HTMLElement} element - 目标元素
 * @param {string} attribute - 属性名
 * @param {string} value - 属性值（会被sanitize）
 */
export function setSafeAttribute(element, attribute, value) {
    if (element && typeof attribute === 'string' && typeof value === 'string') {
        element.setAttribute(attribute, sanitizeText(value));
    }
}

/**
 * 创建权重配置管理容器
 * @returns {HTMLElement} 权重配置管理容器
 */
function createWeightConfigContainer() {
    const panel = document.createElement('div');
    panel.id = 'weightConfigPanel';
    panel.className = 'section';
    panel.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'section-header';
    
    const title = document.createElement('h2');
    title.textContent = '匹配算法权重配置';
    header.appendChild(title);
    
    const description = document.createElement('p');
    description.className = 'section-description';
    description.textContent = '动态调整匹配算法的权重配置，实时生效无需重启';
    header.appendChild(description);
    
    panel.appendChild(header);
    
    // 权重配置标签页
    const tabContainer = createWeightConfigTabs();
    panel.appendChild(tabContainer);
    
    // 权重配置内容区域
    const contentContainer = document.createElement('div');
    contentContainer.id = 'weightConfigContent';
    contentContainer.className = 'weight-config-content';
    panel.appendChild(contentContainer);
    
    // 操作按钮区域
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'weight-config-actions';
    actionsContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px;';
    
    const saveButton = createAdminButton('saveWeightsBtn', '保存配置', 'primary');
    const resetButton = createAdminButton('resetWeightsBtn', '重置为默认值', 'secondary');
    const validateButton = createAdminButton('validateWeightsBtn', '验证配置', 'secondary');
    
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(resetButton);
    actionsContainer.appendChild(validateButton);
    
    panel.appendChild(actionsContainer);
    
    // 状态显示区域
    const statusContainer = document.createElement('div');
    statusContainer.id = 'weightConfigStatus';
    statusContainer.className = 'weight-config-status';
    statusContainer.style.cssText = 'margin-top: 15px; padding: 10px; border-radius: 5px; display: none;';
    panel.appendChild(statusContainer);
    
    return panel;
}

/**
 * 创建权重配置标签页
 * @returns {HTMLElement} 标签页容器
 */
function createWeightConfigTabs() {
    const tabContainer = document.createElement('div');
    tabContainer.className = 'weight-config-tabs';
    
    const tabs = [
        { id: 'traditional', name: '传统匹配算法', active: true },
        { id: 'ai', name: 'AI增强匹配' },
        { id: 'smart', name: '智能匹配' },
        { id: 'deep', name: '深度兼容性分析' }
    ];
    
    tabs.forEach(tab => {
        const tabButton = document.createElement('button');
        tabButton.className = `weight-tab ${tab.active ? 'active' : ''}`;
        tabButton.dataset.tab = tab.id;
        tabButton.textContent = tab.name;
        
        tabButton.addEventListener('click', () => {
            // 切换标签页
            document.querySelectorAll('.weight-tab').forEach(t => t.classList.remove('active'));
            tabButton.classList.add('active');
            
            // 使用全局函数
            if (window.showWeightConfigTab) {
                window.showWeightConfigTab(tab.id);
            }
        });
        
        tabContainer.appendChild(tabButton);
    });
    
    return tabContainer;
}

/**
 * 创建权重配置表单
 * @param {string} algorithm - 算法类型
 * @param {Object} weights - 权重配置
 * @param {Object} metadata - 权重元数据
 * @returns {HTMLElement} 表单元素
 */
export function createWeightConfigForm(algorithm, weights, metadata) {
    const form = document.createElement('div');
    form.className = 'weight-config-form';
    form.id = `weightForm_${algorithm}`;
    
    // 算法描述
    const description = document.createElement('div');
    description.className = 'algorithm-description';
    description.textContent = metadata.description;
    form.appendChild(description);
    
    // 权重输入组
    const weightsGroup = document.createElement('div');
    weightsGroup.className = 'weights-group';
    
    Object.entries(weights).forEach(([key, value]) => {
        const factorInfo = metadata.factors[key];
        if (!factorInfo) return;
        
        const inputGroup = createWeightInputGroup(
            `${algorithm}_${key}`,
            factorInfo.name,
            factorInfo.description,
            value
        );
        weightsGroup.appendChild(inputGroup);
    });
    
    form.appendChild(weightsGroup);
    
    // 权重总和显示
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'weight-summary';
    
    const sumLabel = document.createElement('span');
    sumLabel.textContent = '权重总和：';
    summaryDiv.appendChild(sumLabel);
    
    const sumValue = document.createElement('span');
    sumValue.id = `weightSum_${algorithm}`;
    sumValue.className = 'weight-sum-value';
    sumValue.textContent = '1.00';
    summaryDiv.appendChild(sumValue);
    
    const validationIcon = document.createElement('span');
    validationIcon.id = `validationIcon_${algorithm}`;
    validationIcon.className = 'validation-icon';
    validationIcon.textContent = '✓';
    summaryDiv.appendChild(validationIcon);
    
    form.appendChild(summaryDiv);
    
    return form;
}

/**
 * 创建权重输入组
 * @param {string} inputId - 输入框ID
 * @param {string} label - 标签文本
 * @param {string} description - 描述文本
 * @param {number} value - 初始值
 * @returns {HTMLElement} 输入组元素
 */
function createWeightInputGroup(inputId, label, description, value) {
    const group = document.createElement('div');
    group.className = 'weight-input-group';
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = inputId;
    labelElement.className = 'weight-label';
    labelElement.textContent = sanitizeText(label);
    group.appendChild(labelElement);
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'weight-input-container';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = inputId;
    input.min = '0';
    input.max = '1';
    input.step = '0.01';
    input.value = value.toFixed(2);
    input.className = 'weight-input';
    
    // 实时验证
    input.addEventListener('input', () => {
        validateWeightInput(input);
        updateWeightSum(inputId.split('_')[0]);
    });
    
    inputContainer.appendChild(input);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = value.toFixed(2);
    slider.className = 'weight-slider';
    
    // 同步滑块和输入框
    slider.addEventListener('input', () => {
        input.value = slider.value;
        validateWeightInput(input);
        updateWeightSum(inputId.split('_')[0]);
    });
    
    input.addEventListener('input', () => {
        slider.value = input.value;
    });
    
    inputContainer.appendChild(slider);
    group.appendChild(inputContainer);
    
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'weight-description';
    descriptionElement.textContent = sanitizeText(description);
    group.appendChild(descriptionElement);
    
    return group;
}

/**
 * 验证权重输入
 * @param {HTMLInputElement} input - 输入框元素
 */
function validateWeightInput(input) {
    const value = parseFloat(input.value);
    const isValid = !isNaN(value) && value >= 0 && value <= 1;
    
    input.classList.toggle('invalid', !isValid);
    
    if (!isValid) {
        input.setCustomValidity('权重值必须在0-1之间');
    } else {
        input.setCustomValidity('');
    }
}

/**
 * 更新权重总和显示
 * @param {string} algorithm - 算法类型
 */
function updateWeightSum(algorithm) {
    const inputs = document.querySelectorAll(`input[id^="${algorithm}_"]:not([type="range"])`);
    let sum = 0;
    
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        sum += value;
    });
    
    const sumElement = document.getElementById(`weightSum_${algorithm}`);
    const iconElement = document.getElementById(`validationIcon_${algorithm}`);
    
    if (sumElement) {
        sumElement.textContent = sum.toFixed(2);
        sumElement.classList.toggle('invalid', Math.abs(sum - 1.0) > 0.01);
    }
    
    if (iconElement) {
        const isValid = Math.abs(sum - 1.0) <= 0.01;
        iconElement.textContent = isValid ? '✓' : '⚠';
        iconElement.className = `validation-icon ${isValid ? 'valid' : 'invalid'}`;
    }
}

/**
 * 显示权重配置状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('success', 'error', 'warning')
 */
export function showWeightConfigStatus(message, type = 'info') {
    const statusContainer = document.getElementById('weightConfigStatus');
    if (!statusContainer) return;
    
    statusContainer.textContent = sanitizeText(message);
    statusContainer.className = `weight-config-status ${type}`;
    statusContainer.style.display = 'block';
    
    // 根据类型设置样式
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1'
    };
    
    statusContainer.style.backgroundColor = colors[type] || colors.info;
    
    // 自动隐藏
    setTimeout(() => {
        statusContainer.style.display = 'none';
    }, 5000);
}

Logger.info('管理员组件模块已加载');