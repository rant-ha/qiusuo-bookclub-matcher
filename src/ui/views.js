// UI视图管理模块
// 负责页面切换、渲染和基础事件监听

import { store } from '../state.js';
import { Logger } from '../utils.js';
import { handleLogin, logout, adminLogout } from '../auth.js';
import { loadMembersWithCache } from '../api.js';
import { renderUserProfile, renderPendingList, renderMemberList } from './components.js';
import { initializeMatchingUI, updateMatchButtonsState } from './matching.js';
import { initializeProfileEdit } from './profileEdit.js';

/**
 * 显示登录视图
 */
export function showLoginView() {
    Logger.debug('显示登录视图');
    
    // 隐藏其他界面
    hideAllSections();
    
    // 显示登录界面
    const loginSection = document.getElementById('loginSection');
    if (loginSection) {
        loginSection.style.display = 'block';
        
        // 重置登录表单
        resetLoginForm();
        
        // 确保登录表单获得焦点
        const nameInput = document.getElementById('nameInput');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }
    
    // 更新页面标题
    document.title = '求索书社 - 登录';
    
    // 更新当前视图状态
    store.setCurrentView('login');
}

/**
 * 显示已登录用户的视图
 */
export async function showLoggedInView() {
    try {
        Logger.debug('显示已登录视图');
        
        const currentUser = store.getCurrentUser();
        const isAdmin = store.getIsAdmin();
        
        if (!currentUser) {
            Logger.warn('尝试显示已登录视图但用户为空');
            showLoginView();
            return;
        }
        
        // 隐藏登录界面
        hideAllSections();
        
        if (isAdmin) {
            await showAdminView();
        } else {
            await showUserView();
        }
        
    } catch (error) {
        Logger.error('显示已登录视图失败', error);
        store.setError('加载用户界面失败');
        showLoginView();
    }
}

/**
 * 显示管理员视图
 */
async function showAdminView() {
    Logger.debug('显示管理员视图');
    
    try {
        // 显示管理员界面
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            adminSection.style.display = 'block';
        }
        
        // 加载成员数据
        store.setLoading(true);
        const members = await loadMembersWithCache();
        store.setMembers(members);
        
        // 渲染管理员界面内容
        await renderAdminDashboard();
        
        // 更新页面标题
        const adminRole = store.getCurrentAdminRole();
        document.title = `求索书社 - 管理员后台 (${adminRole})`;
        
        // 更新当前视图状态
        store.setCurrentView('admin');
        
    } catch (error) {
        Logger.error('管理员视图加载失败', error);
        store.setError('管理员界面加载失败');
    } finally {
        store.setLoading(false);
    }
}

/**
 * 显示普通用户视图
 */
async function showUserView() {
    Logger.debug('显示用户视图');
    
    try {
        const currentUser = store.getCurrentUser();
        
        // 显示用户资料界面
        const userProfileSection = document.getElementById('userProfileSection');
        if (userProfileSection) {
            userProfileSection.style.display = 'block';
        }
        
        // 渲染用户资料
        renderUserProfile(currentUser);
        
        // 初始化匹配UI
        initializeMatchingUI();
        
        // 初始化资料编辑功能
        initializeProfileEdit();
        
        // 加载成员数据用于匹配
        store.setLoading(true);
        const members = await loadMembersWithCache();
        store.setMembers(members);
        
        // 更新匹配按钮状态
        updateMatchButtonsState();
        
        // 更新页面标题
        document.title = `求索书社 - ${currentUser.name}`;
        
        // 更新当前视图状态
        store.setCurrentView('user');
        
    } catch (error) {
        Logger.error('用户视图加载失败', error);
        store.setError('用户界面加载失败');
    } finally {
        store.setLoading(false);
    }
}

/**
 * 渲染管理员仪表板
 */
async function renderAdminDashboard() {
    const members = store.getMembers();
    const adminRole = store.getCurrentAdminRole();
    
    // 统计信息
    const stats = {
        total: members.length,
        pending: members.filter(m => m.status === 'pending').length,
        approved: members.filter(m => m.status === 'approved').length,
        rejected: members.filter(m => m.status === 'rejected').length
    };
    
    // 更新统计显示
    updateAdminStats(stats);
    
    // 渲染待审核列表
    const pendingMembers = members.filter(m => m.status === 'pending');
    renderPendingList(pendingMembers);
    
    // 渲染成员列表
    const approvedMembers = members.filter(m => m.status === 'approved');
    renderMemberList(approvedMembers);
    
    Logger.info('管理员仪表板渲染完成', { 
        role: adminRole, 
        stats 
    });
}

/**
 * 更新管理员统计信息
 */
function updateAdminStats(stats) {
    const elements = {
        totalMembers: document.getElementById('totalMembers'),
        pendingMembers: document.getElementById('pendingMembers'),
        approvedMembers: document.getElementById('approvedMembers'),
        rejectedMembers: document.getElementById('rejectedMembers')
    };
    
    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            const statKey = key.replace('Members', '');
            element.textContent = stats[statKey] || 0;
        }
    });
}

/**
 * 隐藏所有界面部分
 */
function hideAllSections() {
    const sections = [
        'loginSection',
        'userProfileSection', 
        'adminSection',
        'memberSection'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

/**
 * 重置登录表单
 */
function resetLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.reset();
    }
    
    // 清除任何错误消息
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

/**
 * 初始化事件监听器
 */
export function initializeEventListeners() {
    Logger.debug('初始化事件监听器');
    
    // 登录表单事件
    setupLoginEventListeners();
    
    // 导航事件
    setupNavigationEventListeners();
    
    // 管理员功能事件
    setupAdminEventListeners();
    
    // 用户功能事件
    setupUserEventListeners();
    
    // 全局键盘事件
    setupGlobalKeyboardListeners();
}

/**
 * 设置登录相关事件监听器
 */
function setupLoginEventListeners() {
    // 登录表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // 登录按钮点击
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginSubmit);
    }
    
    // 回车键登录
    ['nameInput', 'studentIdInput', 'passwordInput'].forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLoginSubmit(e);
                }
            });
        }
    });
}

/**
 * 设置导航事件监听器
 */
function setupNavigationEventListeners() {
    // 登出按钮
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // 管理员登出按钮
    const adminLogoutButton = document.getElementById('adminLogoutButton');
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', handleAdminLogout);
    }
    
    // 返回登录按钮
    const backToLoginButtons = document.querySelectorAll('.back-to-login');
    backToLoginButtons.forEach(button => {
        button.addEventListener('click', showLoginView);
    });
}

/**
 * 设置管理员功能事件监听器
 */
function setupAdminEventListeners() {
    // 刷新数据按钮
    const refreshButton = document.getElementById('refreshDataButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshData);
    }
    
    // 导出数据按钮
    const exportButton = document.getElementById('exportDataButton');
    if (exportButton) {
        exportButton.addEventListener('click', handleExportData);
    }
}

/**
 * 设置用户功能事件监听器
 */
function setupUserEventListeners() {
    // 匹配功能按钮
    const matchButtons = {
        similarMatch: document.getElementById('similarMatchButton'),
        complementaryMatch: document.getElementById('complementaryMatchButton'),
        smartMatch: document.getElementById('smartMatchButton')
    };
    
    Object.entries(matchButtons).forEach(([type, button]) => {
        if (button) {
            button.addEventListener('click', () => handleMatchRequest(type));
        }
    });
    
    // 编辑资料按钮
    const editProfileButton = document.getElementById('editProfileButton');
    if (editProfileButton) {
        editProfileButton.addEventListener('click', handleEditProfile);
    }
}

/**
 * 设置全局键盘监听器
 */
function setupGlobalKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            closeAllModals();
        }
        
        // Ctrl+R 刷新数据（管理员）
        if (e.ctrlKey && e.key === 'r' && store.getIsAdmin()) {
            e.preventDefault();
            handleRefreshData();
        }
    });
}

// === 事件处理器 ===

/**
 * 处理登录表单提交
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    try {
        store.setLoading(true);
        
        const nameInput = document.getElementById('nameInput');
        const studentIdInput = document.getElementById('studentIdInput');
        const passwordInput = document.getElementById('passwordInput');
        
        const name = nameInput?.value?.trim() || '';
        const studentId = studentIdInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        
        if (!name || !studentId) {
            throw new Error('请填写姓名和学号');
        }
        
        const result = await handleLogin(name, studentId, password);
        
        if (result.success) {
            Logger.info('登录成功', { user: result.user?.name, isAdmin: result.isAdmin });
            // 状态更新会自动触发视图切换
        } else {
            showLoginError(result.message);
        }
        
    } catch (error) {
        Logger.error('登录处理失败', error);
        showLoginError(error.message || '登录失败，请重试');
    } finally {
        store.setLoading(false);
    }
}

/**
 * 处理登出
 */
function handleLogout() {
    const result = logout();
    if (result.success) {
        Logger.info('登出成功');
        // 状态清除会自动触发视图切换
    }
}

/**
 * 处理管理员登出
 */
function handleAdminLogout() {
    const result = adminLogout();
    if (result.success) {
        Logger.info('管理员登出成功');
        // 状态清除会自动触发视图切换
    }
}

/**
 * 处理数据刷新
 */
async function handleRefreshData() {
    try {
        store.setLoading(true);
        const members = await loadMembersWithCache();
        store.setMembers(members);
        
        // 重新渲染当前视图
        if (store.getIsAdmin()) {
            await renderAdminDashboard();
        }
        
        Logger.info('数据刷新完成');
    } catch (error) {
        Logger.error('数据刷新失败', error);
        store.setError('数据刷新失败');
    } finally {
        store.setLoading(false);
    }
}

/**
 * 处理数据导出
 */
function handleExportData() {
    try {
        const members = store.getMembers();
        const dataStr = JSON.stringify(members, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `bookclub_members_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        Logger.info('数据导出完成');
    } catch (error) {
        Logger.error('数据导出失败', error);
        store.setError('数据导出失败');
    }
}

/**
 * 处理匹配请求
 */
async function handleMatchRequest(matchType) {
    try {
        Logger.info('开始匹配', { type: matchType });
        // 这里将调用匹配模块的功能
        // 具体实现将在后续的匹配UI组件中完成
        store.setError('匹配功能正在开发中...');
    } catch (error) {
        Logger.error('匹配请求失败', error);
        store.setError('匹配功能暂时不可用');
    }
}

/**
 * 处理编辑资料
 */
function handleEditProfile() {
    try {
        Logger.info('编辑资料');
        // 这里将打开资料编辑模态框
        // 具体实现将在组件模块中完成
        store.setError('资料编辑功能正在开发中...');
    } catch (error) {
        Logger.error('编辑资料失败', error);
        store.setError('无法打开资料编辑界面');
    }
}

// === 辅助函数 ===

/**
 * 显示登录错误
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * 关闭所有模态框
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}