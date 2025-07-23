// UI组件模块
// 负责具体的UI组件渲染和DOM操作

import { store } from '../state.js';
import { Logger, formatDate, sanitizeText } from '../utils.js';
import { hasPermissionSync } from '../auth.js';
import { PERMISSIONS } from '../config.js';

/**
 * 渲染用户资料组件
 */
export function renderUserProfile(user) {
    try {
        Logger.debug('渲染用户资料', { user: user?.name });
        
        const container = document.getElementById('userProfileContainer');
        if (!container) {
            Logger.warn('用户资料容器不存在');
            return;
        }
        
        if (!user) {
            container.innerHTML = '<p>用户信息不存在</p>';
            return;
        }
        
        const profileHTML = generateUserProfileHTML(user);
        container.innerHTML = profileHTML;
        
        // 绑定用户资料相关事件
        bindUserProfileEvents();
        
        Logger.debug('用户资料渲染完成');
        
    } catch (error) {
        Logger.error('渲染用户资料失败', error);
        const container = document.getElementById('userProfileContainer');
        if (container) {
            container.innerHTML = '<p>用户资料加载失败</p>';
        }
    }
}

/**
 * 生成用户资料HTML
 */
function generateUserProfileHTML(user) {
    const questionnaire = user.questionnaire || {};
    const basicInfo = questionnaire.basicInfo || {};
    const readingPrefs = questionnaire.readingPreferences || {};
    const interests = questionnaire.interests || {};
    const personality = questionnaire.personality || {};
    
    return `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user.avatar || '👤'}
                </div>
                <div class="profile-info">
                    <h2 class="profile-name">${sanitizeText(user.name)}</h2>
                    <p class="profile-id">学号: ${sanitizeText(user.studentId)}</p>
                    <p class="profile-status status-${user.status}">
                        ${getStatusText(user.status)}
                    </p>
                </div>
                <button id="editProfileButton" class="btn btn-primary">
                    编辑资料
                </button>
            </div>
            
            <div class="profile-content">
                <div class="profile-section">
                    <h3>基本信息</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>年级</label>
                            <span>${sanitizeText(basicInfo.grade || '未填写')}</span>
                        </div>
                        <div class="info-item">
                            <label>专业</label>
                            <span>${sanitizeText(basicInfo.major || '未填写')}</span>
                        </div>
                        <div class="info-item">
                            <label>联系方式</label>
                            <span>${sanitizeText(basicInfo.contact || '未填写')}</span>
                        </div>
                        <div class="info-item">
                            <label>加入时间</label>
                            <span>${formatDate(user.joinDate)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>阅读偏好</h3>
                    <div class="preference-tags">
                        ${generateReadingPreferenceTags(readingPrefs)}
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>兴趣爱好</h3>
                    <div class="interest-categories">
                        ${generateInterestHTML(interests)}
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>个人简介</h3>
                    <div class="profile-description">
                        ${sanitizeText(questionnaire.personalDescription || '暂无简介')}
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button id="similarMatchButton" class="btn btn-primary">
                        🔍 寻找相似搭档
                    </button>
                    <button id="complementaryMatchButton" class="btn btn-secondary">
                        ⚡ 寻找互补搭档
                    </button>
                    <button id="smartMatchButton" class="btn btn-success">
                        🤖 智能匹配
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染待审核成员列表
 */
export function renderPendingList(pendingMembers) {
    try {
        Logger.debug('渲染待审核列表', { count: pendingMembers.length });
        
        const container = document.getElementById('pendingMembersContainer');
        if (!container) {
            Logger.warn('待审核列表容器不存在');
            return;
        }
        
        if (pendingMembers.length === 0) {
            container.innerHTML = '<p class="empty-state">暂无待审核成员</p>';
            return;
        }
        
        const listHTML = pendingMembers.map(member => 
            generatePendingMemberCard(member)
        ).join('');
        
        container.innerHTML = `
            <div class="pending-list">
                ${listHTML}
            </div>
        `;
        
        // 绑定审核相关事件
        bindPendingListEvents();
        
        Logger.debug('待审核列表渲染完成');
        
    } catch (error) {
        Logger.error('渲染待审核列表失败', error);
        const container = document.getElementById('pendingMembersContainer');
        if (container) {
            container.innerHTML = '<p>待审核列表加载失败</p>';
        }
    }
}

/**
 * 生成待审核成员卡片
 */
function generatePendingMemberCard(member) {
    const questionnaire = member.questionnaire || {};
    const basicInfo = questionnaire.basicInfo || {};
    
    return `
        <div class="member-card pending-card" data-member-id="${member.studentId}">
            <div class="member-header">
                <div class="member-info">
                    <h4 class="member-name">${sanitizeText(member.name)}</h4>
                    <p class="member-id">学号: ${sanitizeText(member.studentId)}</p>
                    <p class="member-meta">
                        ${sanitizeText(basicInfo.grade || '')} | 
                        ${sanitizeText(basicInfo.major || '')}
                    </p>
                </div>
                <div class="member-actions">
                    ${hasPermissionSync(PERMISSIONS.MEMBER_MANAGEMENT) ? `
                        <button class="btn btn-success btn-sm approve-btn" 
                                data-action="approve" data-id="${member.studentId}">
                            ✓ 通过
                        </button>
                        <button class="btn btn-danger btn-sm reject-btn"
                                data-action="reject" data-id="${member.studentId}">
                            ✗ 拒绝
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-sm view-details-btn"
                            data-action="view" data-id="${member.studentId}">
                        👁 详情
                    </button>
                </div>
            </div>
            
            <div class="member-preview">
                <div class="contact-info">
                    <strong>联系方式:</strong> 
                    ${sanitizeText(basicInfo.contact || '未提供')}
                </div>
                <div class="join-time">
                    <strong>申请时间:</strong> 
                    ${formatDate(member.joinDate)}
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染成员列表
 */
export function renderMemberList(members) {
    try {
        Logger.debug('渲染成员列表', { count: members.length });
        
        const container = document.getElementById('membersContainer');
        if (!container) {
            Logger.warn('成员列表容器不存在');
            return;
        }
        
        if (members.length === 0) {
            container.innerHTML = '<p class="empty-state">暂无已审核成员</p>';
            return;
        }
        
        // 按加入时间排序
        const sortedMembers = members.sort((a, b) => 
            new Date(b.joinDate) - new Date(a.joinDate)
        );
        
        const listHTML = sortedMembers.map(member => 
            generateMemberCard(member)
        ).join('');
        
        container.innerHTML = `
            <div class="member-list">
                <div class="list-header">
                    <h3>已审核成员 (${members.length})</h3>
                    <div class="list-controls">
                        <input type="text" id="memberSearchInput" 
                               placeholder="搜索成员..." class="search-input">
                        <select id="memberFilterSelect" class="filter-select">
                            <option value="">全部成员</option>
                            <option value="grade">按年级筛选</option>
                            <option value="major">按专业筛选</option>
                        </select>
                    </div>
                </div>
                <div class="member-grid">
                    ${listHTML}
                </div>
            </div>
        `;
        
        // 绑定成员列表相关事件
        bindMemberListEvents();
        
        Logger.debug('成员列表渲染完成');
        
    } catch (error) {
        Logger.error('渲染成员列表失败', error);
        const container = document.getElementById('membersContainer');
        if (container) {
            container.innerHTML = '<p>成员列表加载失败</p>';
        }
    }
}

/**
 * 生成成员卡片
 */
function generateMemberCard(member) {
    const questionnaire = member.questionnaire || {};
    const basicInfo = questionnaire.basicInfo || {};
    const interests = questionnaire.interests || {};
    
    // 获取兴趣标签
    const interestTags = Object.values(interests)
        .filter(value => value)
        .flatMap(value => value.split(/[,，、\s]+/))
        .filter(tag => tag.trim().length > 0)
        .slice(0, 5); // 只显示前5个标签
    
    return `
        <div class="member-card approved-card" data-member-id="${member.studentId}">
            <div class="member-header">
                <div class="member-avatar">
                    ${member.avatar || '👤'}
                </div>
                <div class="member-info">
                    <h4 class="member-name">${sanitizeText(member.name)}</h4>
                    <p class="member-meta">
                        ${sanitizeText(basicInfo.grade || '')} | 
                        ${sanitizeText(basicInfo.major || '')}
                    </p>
                    <p class="member-join-date">
                        ${formatDate(member.joinDate)} 加入
                    </p>
                </div>
                <div class="member-actions">
                    ${hasPermissionSync(PERMISSIONS.MEMBER_MANAGEMENT) ? `
                        <button class="btn btn-warning btn-sm edit-member-btn"
                                data-action="edit" data-id="${member.studentId}">
                            ✏️ 编辑
                        </button>
                        <button class="btn btn-danger btn-sm delete-member-btn"
                                data-action="delete" data-id="${member.studentId}">
                            🗑️ 删除
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-sm view-member-btn"
                            data-action="view" data-id="${member.studentId}">
                        👁 查看
                    </button>
                </div>
            </div>
            
            <div class="member-content">
                <div class="member-interests">
                    <div class="interest-tags">
                        ${interestTags.map(tag => 
                            `<span class="tag">${sanitizeText(tag)}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="member-description">
                    ${sanitizeText(questionnaire.personalDescription || '暂无简介').substring(0, 100)}
                    ${questionnaire.personalDescription && questionnaire.personalDescription.length > 100 ? '...' : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染匹配结果
 */
export function renderMatchResults(matches, matchType) {
    try {
        Logger.debug('渲染匹配结果', { count: matches.length, type: matchType });
        
        const container = document.getElementById('matchResultsContainer');
        if (!container) {
            Logger.warn('匹配结果容器不存在');
            return;
        }
        
        if (matches.length === 0) {
            container.innerHTML = `
                <div class="match-results empty">
                    <h3>匹配结果</h3>
                    <p class="empty-state">暂无匹配结果</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = matches.map((match, index) => 
            generateMatchCard(match, index + 1)
        ).join('');
        
        container.innerHTML = `
            <div class="match-results">
                <div class="results-header">
                    <h3>匹配结果 - ${getMatchTypeText(matchType)}</h3>
                    <p class="results-count">为您找到 ${matches.length} 个匹配</p>
                </div>
                <div class="match-list">
                    ${resultsHTML}
                </div>
            </div>
        `;
        
        // 绑定匹配结果相关事件
        bindMatchResultEvents();
        
        Logger.debug('匹配结果渲染完成');
        
    } catch (error) {
        Logger.error('渲染匹配结果失败', error);
        const container = document.getElementById('matchResultsContainer');
        if (container) {
            container.innerHTML = '<p>匹配结果加载失败</p>';
        }
    }
}

/**
 * 生成匹配卡片
 */
function generateMatchCard(match, rank) {
    const member = match.member;
    const questionnaire = member.questionnaire || {};
    const basicInfo = questionnaire.basicInfo || {};
    
    return `
        <div class="match-card" data-member-id="${member.studentId}">
            <div class="match-rank">
                <span class="rank-number">${rank}</span>
                <div class="match-score">
                    <div class="score-circle" style="--score: ${match.score}">
                        <span class="score-value">${match.score}</span>
                        <span class="score-unit">%</span>
                    </div>
                    <p class="score-label">${match.type} 匹配度</p>
                </div>
            </div>
            
            <div class="match-info">
                <div class="member-basic">
                    <div class="member-avatar">
                        ${member.avatar || '👤'}
                    </div>
                    <div class="member-details">
                        <h4 class="member-name">${sanitizeText(member.name)}</h4>
                        <p class="member-meta">
                            ${sanitizeText(basicInfo.grade || '')} | 
                            ${sanitizeText(basicInfo.major || '')}
                        </p>
                    </div>
                </div>
                
                <div class="match-details">
                    <div class="common-interests">
                        <strong>共同兴趣:</strong>
                        ${match.details.commonInterests.length > 0 
                            ? match.details.commonInterests.map(interest => 
                                `<span class="tag">${sanitizeText(interest)}</span>`
                              ).join('')
                            : '<span class="no-common">暂无明显共同兴趣</span>'}
                    </div>
                    <div class="match-reason">
                        <strong>匹配原因:</strong>
                        <p>${sanitizeText(match.details.matchReason)}</p>
                    </div>
                </div>
                
                <div class="match-actions">
                    <button class="btn btn-primary contact-btn" 
                            data-member-id="${member.studentId}">
                        💬 联系TA
                    </button>
                    <button class="btn btn-secondary view-profile-btn"
                            data-member-id="${member.studentId}">
                        👁 查看资料
                    </button>
                </div>
            </div>
        </div>
    `;
}

// === 事件绑定函数 ===

function bindUserProfileEvents() {
    // 编辑资料按钮
    const editBtn = document.getElementById('editProfileButton');
    if (editBtn) {
        editBtn.addEventListener('click', handleEditProfile);
    }
    
    // 匹配按钮
    const matchButtons = {
        similarMatchButton: 'similar',
        complementaryMatchButton: 'complementary', 
        smartMatchButton: 'smart'
    };
    
    Object.entries(matchButtons).forEach(([buttonId, matchType]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => handleStartMatch(matchType));
        }
    });
}

function bindPendingListEvents() {
    // 审核按钮事件委托
    const container = document.getElementById('pendingMembersContainer');
    if (container) {
        container.addEventListener('click', handlePendingListAction);
    }
}

function bindMemberListEvents() {
    // 成员操作事件委托
    const container = document.getElementById('membersContainer');
    if (container) {
        container.addEventListener('click', handleMemberListAction);
    }
    
    // 搜索功能
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleMemberSearch);
    }
    
    // 筛选功能
    const filterSelect = document.getElementById('memberFilterSelect');
    if (filterSelect) {
        filterSelect.addEventListener('change', handleMemberFilter);
    }
}

function bindMatchResultEvents() {
    // 匹配结果操作事件委托
    const container = document.getElementById('matchResultsContainer');
    if (container) {
        container.addEventListener('click', handleMatchResultAction);
    }
}

// === 事件处理器 ===

function handleEditProfile() {
    Logger.info('开始编辑资料');
    store.setError('资料编辑功能开发中...');
}

function handleStartMatch(matchType) {
    Logger.info('开始匹配', { type: matchType });
    store.setError(`${getMatchTypeText(matchType)}功能开发中...`);
}

function handlePendingListAction(e) {
    const action = e.target.dataset.action;
    const memberId = e.target.dataset.id;
    
    if (!action || !memberId) return;
    
    Logger.info('待审核列表操作', { action, memberId });
    
    switch (action) {
        case 'approve':
            handleApproveMember(memberId);
            break;
        case 'reject':
            handleRejectMember(memberId);
            break;
        case 'view':
            handleViewMemberDetails(memberId);
            break;
    }
}

function handleMemberListAction(e) {
    const action = e.target.dataset.action;
    const memberId = e.target.dataset.id;
    
    if (!action || !memberId) return;
    
    Logger.info('成员列表操作', { action, memberId });
    
    switch (action) {
        case 'edit':
            handleEditMember(memberId);
            break;
        case 'delete':
            handleDeleteMember(memberId);
            break;
        case 'view':
            handleViewMember(memberId);
            break;
    }
}

function handleMatchResultAction(e) {
    const memberId = e.target.dataset.memberId;
    
    if (!memberId) return;
    
    if (e.target.classList.contains('contact-btn')) {
        handleContactMember(memberId);
    } else if (e.target.classList.contains('view-profile-btn')) {
        handleViewMemberProfile(memberId);
    }
}

// === 占位符事件处理器（待实现） ===

function handleApproveMember(memberId) {
    store.setError('审核功能开发中...');
}

function handleRejectMember(memberId) {
    store.setError('拒绝功能开发中...');
}

function handleViewMemberDetails(memberId) {
    store.setError('详情查看功能开发中...');
}

function handleEditMember(memberId) {
    store.setError('编辑成员功能开发中...');
}

function handleDeleteMember(memberId) {
    if (confirm('确定要删除该成员吗？此操作不可撤销。')) {
        store.setError('删除功能开发中...');
    }
}

function handleViewMember(memberId) {
    store.setError('查看功能开发中...');
}

function handleContactMember(memberId) {
    store.setError('联系功能开发中...');
}

function handleViewMemberProfile(memberId) {
    store.setError('资料查看功能开发中...');
}

function handleMemberSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    Logger.debug('搜索成员', { term: searchTerm });
    // 实现搜索逻辑
}

function handleMemberFilter(e) {
    const filterType = e.target.value;
    Logger.debug('筛选成员', { type: filterType });
    // 实现筛选逻辑
}

// === 辅助函数 ===

function getStatusText(status) {
    const statusMap = {
        pending: '待审核',
        approved: '已通过',
        rejected: '已拒绝'
    };
    return statusMap[status] || status;
}

function getMatchTypeText(type) {
    const typeMap = {
        similar: '相似匹配',
        complementary: '互补匹配',
        smart: '智能匹配'
    };
    return typeMap[type] || type;
}

function generateReadingPreferenceTags(prefs) {
    const tags = [];
    
    Object.entries(prefs).forEach(([key, value]) => {
        if (value) {
            const tagName = getReadingPrefTagName(key);
            if (tagName) {
                tags.push(`<span class="tag pref-tag">${tagName}</span>`);
            }
        }
    });
    
    return tags.length > 0 ? tags.join('') : '<span class="no-tags">暂无阅读偏好</span>';
}

function getReadingPrefTagName(key) {
    const nameMap = {
        fiction: '小说',
        nonFiction: '非小说',
        biography: '传记',
        history: '历史',
        science: '科学',
        philosophy: '哲学',
        psychology: '心理学',
        selfHelp: '自助'
    };
    return nameMap[key];
}

function generateInterestHTML(interests) {
    const categories = Object.entries(interests)
        .filter(([key, value]) => value && value.trim())
        .map(([key, value]) => {
            const categoryName = getInterestCategoryName(key);
            const tags = value.split(/[,，、\s]+/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .map(tag => `<span class="tag interest-tag">${sanitizeText(tag)}</span>`)
                .join('');
            
            return `
                <div class="interest-category">
                    <label class="category-label">${categoryName}:</label>
                    <div class="category-tags">${tags}</div>
                </div>
            `;
        });
    
    return categories.length > 0 ? categories.join('') : '<p class="no-interests">暂无兴趣信息</p>';
}

function getInterestCategoryName(key) {
    const nameMap = {
        books: '喜欢的书籍',
        movies: '喜欢的电影',
        music: '音乐偏好',
        sports: '运动爱好',
        travel: '旅行经历',
        food: '美食偏好',
        hobbies: '其他爱好'
    };
    return nameMap[key] || key;
}