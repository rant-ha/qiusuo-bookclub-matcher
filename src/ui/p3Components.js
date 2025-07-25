// P3 UI/UX功能组件
// 主题切换、用户设置、数据导出相关的UI组件

import { sanitizeText, createSafeTextElement, createSafeElement } from '../admin/components.js';
import { Logger } from '../utils.js';

/**
 * 创建主题切换按钮
 * @param {Object} currentTheme - 当前主题信息
 * @param {Function} onThemeChange - 主题变更回调
 * @returns {HTMLElement} 主题切换按钮
 */
export function createThemeToggleButton(currentTheme, onThemeChange) {
    const button = createSafeElement('button', {
        className: 'theme-toggle-btn',
        'aria-label': '切换主题'
    });
    
    const icon = createSafeElement('span', {
        className: 'theme-icon'
    });
    icon.textContent = currentTheme.icon || '🌓';
    
    const text = createSafeTextElement('span', currentTheme.name || '主题');
    text.className = 'theme-text';
    
    button.appendChild(icon);
    button.appendChild(text);
    
    button.addEventListener('click', () => {
        if (onThemeChange) onThemeChange();
    });
    
    return button;
}

/**
 * 创建主题选择器下拉菜单
 * @param {Array} themes - 主题列表
 * @param {string} currentTheme - 当前主题
 * @param {Function} onSelect - 选择回调
 * @returns {HTMLElement} 主题选择器
 */
export function createThemeSelector(themes, currentTheme, onSelect) {
    const container = createSafeElement('div', {
        className: 'theme-selector'
    });
    
    const label = createSafeTextElement('label', '主题设置');
    label.className = 'setting-label';
    
    const select = createSafeElement('select', {
        className: 'theme-select',
        'aria-label': '选择主题'
    });
    
    themes.forEach(theme => {
        const option = createSafeElement('option', {
            value: theme.key
        });
        option.textContent = `${theme.icon} ${theme.name}`;
        
        if (theme.key === currentTheme) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        if (onSelect) onSelect(e.target.value);
    });
    
    container.appendChild(label);
    container.appendChild(select);
    
    return container;
}

/**
 * 创建用户设置面板
 * @param {Object} settings - 当前设置
 * @param {Function} onSettingChange - 设置变更回调
 * @returns {HTMLElement} 设置面板
 */
export function createUserSettingsPanel(settings, onSettingChange) {
    const panel = createSafeElement('div', {
        className: 'user-settings-panel'
    });
    
    // 面板标题
    const title = createSafeTextElement('h3', '个人设置');
    title.className = 'settings-title';
    panel.appendChild(title);
    
    // 主题设置组
    const themeGroup = createSettingGroup('主题设置', [
        createSettingItem('theme.mode', 'select', '主题模式', [
            { value: 'light', text: '☀️ 浅色' },
            { value: 'dark', text: '🌙 深色' },
            { value: 'auto', text: '🔄 跟随系统' }
        ], settings.theme?.mode, onSettingChange)
    ]);
    panel.appendChild(themeGroup);
    
    // 界面设置组
    const uiGroup = createSettingGroup('界面设置', [
        createSettingItem('ui.fontSize', 'select', '字体大小', [
            { value: 'small', text: '小' },
            { value: 'medium', text: '中' },
            { value: 'large', text: '大' }
        ], settings.ui?.fontSize, onSettingChange),
        
        createSettingItem('ui.compactMode', 'checkbox', '紧凑模式', null, 
            settings.ui?.compactMode, onSettingChange),
        
        createSettingItem('ui.showAnimations', 'checkbox', '显示动画', null, 
            settings.ui?.showAnimations, onSettingChange),
        
        createSettingItem('ui.showTooltips', 'checkbox', '显示工具提示', null, 
            settings.ui?.showTooltips, onSettingChange)
    ]);
    panel.appendChild(uiGroup);
    
    // 通知设置组
    const notificationGroup = createSettingGroup('通知设置', [
        createSettingItem('notifications.enabled', 'checkbox', '启用通知', null, 
            settings.notifications?.enabled, onSettingChange),
        
        createSettingItem('notifications.sound', 'checkbox', '声音提醒', null, 
            settings.notifications?.sound, onSettingChange),
        
        createSettingItem('notifications.desktop', 'checkbox', '桌面通知', null, 
            settings.notifications?.desktop, onSettingChange),
        
        createSettingItem('notifications.matchNotifications', 'checkbox', '匹配通知', null, 
            settings.notifications?.matchNotifications, onSettingChange)
    ]);
    panel.appendChild(notificationGroup);
    
    // 隐私设置组
    const privacyGroup = createSettingGroup('隐私设置', [
        createSettingItem('privacy.showOnlineStatus', 'checkbox', '显示在线状态', null, 
            settings.privacy?.showOnlineStatus, onSettingChange),
        
        createSettingItem('privacy.allowDataCollection', 'checkbox', '允许数据收集', null, 
            settings.privacy?.allowDataCollection, onSettingChange),
        
        createSettingItem('privacy.shareReadingStats', 'checkbox', '分享阅读统计', null, 
            settings.privacy?.shareReadingStats, onSettingChange)
    ]);
    panel.appendChild(privacyGroup);
    
    // 功能偏好组
    const preferencesGroup = createSettingGroup('功能偏好', [
        createSettingItem('preferences.defaultMatchType', 'select', '默认匹配类型', [
            { value: 'similar', text: '相似匹配' },
            { value: 'complementary', text: '互补匹配' },
            { value: 'smart', text: '智能匹配' }
        ], settings.preferences?.defaultMatchType, onSettingChange),
        
        createSettingItem('preferences.autoRefresh', 'checkbox', '自动刷新', null, 
            settings.preferences?.autoRefresh, onSettingChange),
        
        createSettingItem('preferences.rememberFilters', 'checkbox', '记住筛选条件', null, 
            settings.preferences?.rememberFilters, onSettingChange),
        
        createSettingItem('preferences.quickActions', 'checkbox', '启用快捷操作', null, 
            settings.preferences?.quickActions, onSettingChange)
    ]);
    panel.appendChild(preferencesGroup);
    
    // 操作按钮
    const actions = createSettingsActions(onSettingChange);
    panel.appendChild(actions);
    
    return panel;
}

/**
 * 创建设置组
 * @param {string} title - 组标题
 * @param {Array} items - 设置项列表
 * @returns {HTMLElement} 设置组
 */
function createSettingGroup(title, items) {
    const group = createSafeElement('div', {
        className: 'setting-group'
    });
    
    const groupTitle = createSafeTextElement('h4', title);
    groupTitle.className = 'setting-group-title';
    group.appendChild(groupTitle);
    
    const itemsContainer = createSafeElement('div', {
        className: 'setting-items'
    });
    
    items.forEach(item => {
        if (item) itemsContainer.appendChild(item);
    });
    
    group.appendChild(itemsContainer);
    return group;
}

/**
 * 创建设置项
 * @param {string} path - 设置路径
 * @param {string} type - 输入类型
 * @param {string} label - 标签文本
 * @param {Array} options - 选项（select类型使用）
 * @param {*} value - 当前值
 * @param {Function} onChange - 变更回调
 * @returns {HTMLElement} 设置项
 */
function createSettingItem(path, type, label, options, value, onChange) {
    const item = createSafeElement('div', {
        className: 'setting-item'
    });
    
    const labelEl = createSafeTextElement('label', label);
    labelEl.className = 'setting-label';
    
    let input;
    
    switch (type) {
        case 'checkbox':
            input = createSafeElement('input', {
                type: 'checkbox',
                className: 'setting-checkbox',
                checked: Boolean(value)
            });
            
            input.addEventListener('change', (e) => {
                if (onChange) onChange(path, e.target.checked);
            });
            break;
            
        case 'select':
            input = createSafeElement('select', {
                className: 'setting-select'
            });
            
            if (options) {
                options.forEach(option => {
                    const optionEl = createSafeElement('option', {
                        value: option.value
                    });
                    optionEl.textContent = option.text;
                    
                    if (option.value === value) {
                        optionEl.selected = true;
                    }
                    
                    input.appendChild(optionEl);
                });
            }
            
            input.addEventListener('change', (e) => {
                if (onChange) onChange(path, e.target.value);
            });
            break;
            
        case 'text':
        case 'number':
            input = createSafeElement('input', {
                type,
                className: 'setting-input',
                value: value || ''
            });
            
            input.addEventListener('change', (e) => {
                const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
                if (onChange) onChange(path, newValue);
            });
            break;
            
        default:
            Logger.warn('未知的设置项类型', type);
            return null;
    }
    
    if (type === 'checkbox') {
        // 复选框特殊布局
        const checkboxContainer = createSafeElement('div', {
            className: 'checkbox-container'
        });
        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(labelEl);
        item.appendChild(checkboxContainer);
    } else {
        item.appendChild(labelEl);
        item.appendChild(input);
    }
    
    return item;
}

/**
 * 创建设置操作按钮
 * @param {Function} onAction - 操作回调
 * @returns {HTMLElement} 操作按钮容器
 */
function createSettingsActions(onAction) {
    const actions = createSafeElement('div', {
        className: 'settings-actions'
    });
    
    // 重置按钮
    const resetBtn = createSafeElement('button', {
        className: 'btn btn-secondary'
    });
    resetBtn.textContent = '🔄 重置默认';
    resetBtn.addEventListener('click', () => {
        if (confirm('确定要重置所有设置为默认值吗？')) {
            if (onAction) onAction('reset');
        }
    });
    
    // 导出设置按钮
    const exportBtn = createSafeElement('button', {
        className: 'btn btn-info'
    });
    exportBtn.textContent = '📤 导出设置';
    exportBtn.addEventListener('click', () => {
        if (onAction) onAction('export');
    });
    
    // 导入设置按钮
    const importBtn = createSafeElement('button', {
        className: 'btn btn-info'
    });
    importBtn.textContent = '📥 导入设置';
    importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && onAction) {
                onAction('import', file);
            }
        };
        input.click();
    });
    
    actions.appendChild(resetBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(importBtn);
    
    return actions;
}

/**
 * 创建数据导出面板
 * @param {Array} exportHistory - 导出历史
 * @param {Function} onExport - 导出回调
 * @returns {HTMLElement} 导出面板
 */
export function createDataExportPanel(exportHistory, onExport) {
    const panel = createSafeElement('div', {
        className: 'data-export-panel'
    });
    
    // 面板标题
    const title = createSafeTextElement('h3', '数据导出');
    title.className = 'export-title';
    panel.appendChild(title);
    
    // 导出选项
    const exportOptions = createExportOptions(onExport);
    panel.appendChild(exportOptions);
    
    // 导出历史
    if (exportHistory && exportHistory.length > 0) {
        const historySection = createExportHistory(exportHistory);
        panel.appendChild(historySection);
    }
    
    return panel;
}

/**
 * 创建导出选项
 * @param {Function} onExport - 导出回调
 * @returns {HTMLElement} 导出选项
 */
function createExportOptions(onExport) {
    const container = createSafeElement('div', {
        className: 'export-options'
    });
    
    // 用户数据导出
    const userDataSection = createExportSection('用户数据', [
        { format: 'json', label: 'JSON格式', description: '完整数据结构' },
        { format: 'csv', label: 'CSV格式', description: '表格数据，兼容Excel' },
        { format: 'txt', label: 'TXT格式', description: '纯文本格式' }
    ], 'users', onExport);
    
    // 匹配历史导出
    const matchHistorySection = createExportSection('匹配历史', [
        { format: 'json', label: 'JSON格式', description: '完整匹配记录' },
        { format: 'csv', label: 'CSV格式', description: '表格格式匹配记录' }
    ], 'matches', onExport);
    
    // 系统设置导出
    const settingsSection = createExportSection('系统设置', [
        { format: 'json', label: 'JSON格式', description: '配置和偏好设置' }
    ], 'settings', onExport);
    
    container.appendChild(userDataSection);
    container.appendChild(matchHistorySection);
    container.appendChild(settingsSection);
    
    // 批量导出按钮
    const batchExportBtn = createSafeElement('button', {
        className: 'btn btn-primary batch-export-btn'
    });
    batchExportBtn.textContent = '📦 批量导出全部数据';
    batchExportBtn.addEventListener('click', () => {
        if (onExport) {
            onExport('batch', 'json', {
                includeUsers: true,
                includeMatches: true,
                includeSettings: true
            });
        }
    });
    
    container.appendChild(batchExportBtn);
    
    return container;
}

/**
 * 创建导出部分
 * @param {string} title - 部分标题
 * @param {Array} formats - 支持的格式
 * @param {string} type - 导出类型
 * @param {Function} onExport - 导出回调
 * @returns {HTMLElement} 导出部分
 */
function createExportSection(title, formats, type, onExport) {
    const section = createSafeElement('div', {
        className: 'export-section'
    });
    
    const sectionTitle = createSafeTextElement('h4', title);
    sectionTitle.className = 'export-section-title';
    section.appendChild(sectionTitle);
    
    const buttonsContainer = createSafeElement('div', {
        className: 'export-buttons'
    });
    
    formats.forEach(format => {
        const button = createSafeElement('button', {
            className: 'btn btn-outline export-format-btn'
        });
        button.textContent = format.label;
        button.title = format.description;
        
        button.addEventListener('click', () => {
            if (onExport) onExport(type, format.format);
        });
        
        buttonsContainer.appendChild(button);
    });
    
    section.appendChild(buttonsContainer);
    return section;
}

/**
 * 创建导出历史
 * @param {Array} history - 历史记录
 * @returns {HTMLElement} 历史记录容器
 */
function createExportHistory(history) {
    const container = createSafeElement('div', {
        className: 'export-history'
    });
    
    const title = createSafeTextElement('h4', '导出历史');
    title.className = 'history-title';
    container.appendChild(title);
    
    const list = createSafeElement('div', {
        className: 'history-list'
    });
    
    history.slice(0, 5).forEach(record => { // 只显示最近5条
        const item = createHistoryItem(record);
        list.appendChild(item);
    });
    
    container.appendChild(list);
    
    // 清理历史按钮
    const clearBtn = createSafeElement('button', {
        className: 'btn btn-secondary btn-sm'
    });
    clearBtn.textContent = '🗑️ 清理历史';
    clearBtn.addEventListener('click', () => {
        if (confirm('确定要清理导出历史吗？')) {
            // 触发清理历史事件
            const event = new CustomEvent('clearExportHistory');
            window.dispatchEvent(event);
        }
    });
    
    container.appendChild(clearBtn);
    
    return container;
}

/**
 * 创建历史记录项
 * @param {Object} record - 记录数据
 * @returns {HTMLElement} 历史记录项
 */
function createHistoryItem(record) {
    const item = createSafeElement('div', {
        className: 'history-item'
    });
    
    const info = createSafeElement('div', {
        className: 'history-info'
    });
    
    const filename = createSafeTextElement('span', record.filename);
    filename.className = 'history-filename';
    
    const details = createSafeTextElement('span', 
        `${record.type} · ${record.recordCount} 条记录 · ${new Date(record.timestamp).toLocaleDateString()}`
    );
    details.className = 'history-details';
    
    info.appendChild(filename);
    info.appendChild(details);
    item.appendChild(info);
    
    return item;
}

/**
 * 创建设置快捷操作栏
 * @param {Object} currentSettings - 当前设置
 * @param {Function} onAction - 操作回调
 * @returns {HTMLElement} 快捷操作栏
 */
export function createSettingsQuickActions(currentSettings, onAction) {
    const toolbar = createSafeElement('div', {
        className: 'settings-quick-actions'
    });
    
    // 主题快速切换
    const themeToggle = createSafeElement('button', {
        className: 'quick-action-btn theme-quick-toggle',
        'aria-label': '快速切换主题'
    });
    
    const themeIcon = createSafeElement('span', {
        className: 'quick-action-icon'
    });
    themeIcon.textContent = currentSettings.theme?.mode === 'dark' ? '🌙' : '☀️';
    
    themeToggle.appendChild(themeIcon);
    themeToggle.addEventListener('click', () => {
        if (onAction) onAction('toggleTheme');
    });
    
    // 字体大小调节
    const fontSizeControls = createSafeElement('div', {
        className: 'font-size-controls'
    });
    
    const fontSizeDown = createSafeElement('button', {
        className: 'quick-action-btn',
        'aria-label': '减小字体'
    });
    fontSizeDown.textContent = 'A-';
    
    const fontSizeUp = createSafeElement('button', {
        className: 'quick-action-btn',
        'aria-label': '增大字体'
    });
    fontSizeUp.textContent = 'A+';
    
    fontSizeDown.addEventListener('click', () => {
        if (onAction) onAction('decreaseFontSize');
    });
    
    fontSizeUp.addEventListener('click', () => {
        if (onAction) onAction('increaseFontSize');
    });
    
    fontSizeControls.appendChild(fontSizeDown);
    fontSizeControls.appendChild(fontSizeUp);
    
    // 紧凑模式切换
    const compactToggle = createSafeElement('button', {
        className: 'quick-action-btn compact-toggle',
        'aria-label': '切换紧凑模式'
    });
    compactToggle.textContent = currentSettings.ui?.compactMode ? '📏' : '📐';
    compactToggle.addEventListener('click', () => {
        if (onAction) onAction('toggleCompactMode');
    });
    
    toolbar.appendChild(themeToggle);
    toolbar.appendChild(fontSizeControls);
    toolbar.appendChild(compactToggle);
    
    return toolbar;
}

/**
 * 显示导出状态提示
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型 ('success', 'error', 'info')
 */
export function showExportStatus(message, type = 'info') {
    // 移除已存在的状态提示
    const existing = document.querySelector('.export-status');
    if (existing) {
        existing.remove();
    }
    
    const status = createSafeElement('div', {
        className: `export-status export-status-${type}`
    });
    
    const icon = createSafeElement('span', {
        className: 'status-icon'
    });
    
    switch (type) {
        case 'success':
            icon.textContent = '✅';
            break;
        case 'error':
            icon.textContent = '❌';
            break;
        case 'info':
        default:
            icon.textContent = 'ℹ️';
            break;
    }
    
    const text = createSafeTextElement('span', message);
    text.className = 'status-text';
    
    status.appendChild(icon);
    status.appendChild(text);
    
    // 添加到页面
    document.body.appendChild(status);
    
    // 自动消失
    setTimeout(() => {
        status.classList.add('fade-out');
        setTimeout(() => status.remove(), 300);
    }, 3000);
}

/**
 * 创建设置搜索框
 * @param {Function} onSearch - 搜索回调
 * @returns {HTMLElement} 搜索框
 */
export function createSettingsSearchBox(onSearch) {
    const container = createSafeElement('div', {
        className: 'settings-search'
    });
    
    const input = createSafeElement('input', {
        type: 'text',
        className: 'settings-search-input',
        placeholder: '搜索设置项...'
    });
    
    const icon = createSafeElement('span', {
        className: 'search-icon'
    });
    icon.textContent = '🔍';
    
    input.addEventListener('input', (e) => {
        if (onSearch) onSearch(e.target.value);
    });
    
    container.appendChild(icon);
    container.appendChild(input);
    
    return container;
}

Logger.info('P3 UI组件模块已加载');