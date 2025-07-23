// 匹配功能UI模块
// 专门处理匹配相关的用户界面和交互

import { store } from '../state.js';
import { Logger, measureAsyncPerformance } from '../utils.js';
import { findMatches } from '../matching.js';

// 匹配状态
let currentMatchOperation = null;
let matchHistory = [];

/**
 * 初始化匹配UI
 */
export function initializeMatchingUI() {
    Logger.debug('初始化匹配UI');
    
    // 创建匹配结果容器
    ensureMatchContainers();
    
    // 绑定匹配按钮事件
    bindMatchingEvents();
    
    // 订阅状态变化
    subscribeToMatchingState();
}

/**
 * 确保匹配相关的DOM容器存在
 */
function ensureMatchContainers() {
    const userProfileSection = document.getElementById('userProfileSection');
    if (!userProfileSection) return;
    
    // 检查是否已存在匹配容器
    let matchContainer = document.getElementById('matchingContainer');
    if (!matchContainer) {
        matchContainer = document.createElement('div');
        matchContainer.id = 'matchingContainer';
        matchContainer.className = 'matching-container';
        userProfileSection.appendChild(matchContainer);
    }
    
    // 初始化匹配界面HTML
    matchContainer.innerHTML = `
        <div class="matching-controls">
            <div class="match-buttons">
                <button id="similarMatchBtn" class="match-btn similar-btn" data-type="similar">
                    <span class="btn-icon">🔍</span>
                    <span class="btn-text">相似匹配</span>
                    <span class="btn-desc">找到兴趣相近的书友</span>
                </button>
                
                <button id="complementaryMatchBtn" class="match-btn complementary-btn" data-type="complementary">
                    <span class="btn-icon">⚡</span>
                    <span class="btn-text">互补匹配</span>
                    <span class="btn-desc">发现不同领域的搭档</span>
                </button>
                
                <button id="smartMatchBtn" class="match-btn smart-btn" data-type="smart">
                    <span class="btn-icon">🤖</span>
                    <span class="btn-text">智能匹配</span>
                    <span class="btn-desc">AI智能推荐最佳搭档</span>
                </button>
            </div>
            
            <div class="match-options">
                <label class="checkbox-container">
                    <input type="checkbox" id="enableAIMatch" checked>
                    <span class="checkmark"></span>
                    启用AI语义分析
                </label>
                
                <div class="match-limit">
                    <label for="matchLimit">结果数量:</label>
                    <select id="matchLimit">
                        <option value="5">5个</option>
                        <option value="10" selected>10个</option>
                        <option value="15">15个</option>
                        <option value="20">20个</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div id="matchingProgress" class="matching-progress hidden">
            <div class="progress-content">
                <div class="progress-spinner"></div>
                <div class="progress-text">正在寻找您的完美搭档...</div>
                <div class="progress-details"></div>
            </div>
        </div>
        
        <div id="matchResults" class="match-results hidden">
            <!-- 匹配结果将在这里显示 -->
        </div>
        
        <div id="matchHistory" class="match-history hidden">
            <h3>历史匹配记录</h3>
            <div class="history-list">
                <!-- 历史记录将在这里显示 -->
            </div>
        </div>
    `;
}

/**
 * 绑定匹配相关事件
 */
function bindMatchingEvents() {
    // 匹配按钮事件
    const matchButtons = document.querySelectorAll('.match-btn');
    matchButtons.forEach(button => {
        button.addEventListener('click', handleMatchButtonClick);
    });
    
    // AI选项变化事件
    const aiCheckbox = document.getElementById('enableAIMatch');
    if (aiCheckbox) {
        aiCheckbox.addEventListener('change', handleAIOptionChange);
    }
    
    // 结果数量变化事件
    const limitSelect = document.getElementById('matchLimit');
    if (limitSelect) {
        limitSelect.addEventListener('change', handleLimitChange);
    }
}

/**
 * 订阅匹配相关的状态变化
 */
function subscribeToMatchingState() {
    // 订阅成员数据变化
    store.subscribe((state, changeType) => {
        if (changeType === 'members') {
            updateMatchButtonsState();
        }
    }, 'members');
    
    // 订阅当前用户变化
    store.subscribe((state, changeType) => {
        if (changeType === 'currentUser') {
            updateMatchButtonsState();
        }
    }, 'currentUser');
}

/**
 * 处理匹配按钮点击
 */
async function handleMatchButtonClick(event) {
    const button = event.currentTarget;
    const matchType = button.dataset.type;
    
    if (!matchType) return;
    
    try {
        // 检查是否有正在进行的匹配
        if (currentMatchOperation) {
            Logger.warn('匹配操作正在进行中，请稍候');
            return;
        }
        
        // 验证用户和成员数据
        const currentUser = store.getCurrentUser();
        const members = store.getMembers();
        
        if (!currentUser) {
            throw new Error('用户未登录');
        }
        
        if (!members || members.length === 0) {
            throw new Error('暂无其他成员数据');
        }
        
        // 开始匹配
        await performMatching(matchType);
        
    } catch (error) {
        Logger.error('匹配操作失败', error);
        showMatchError(error.message);
    }
}

/**
 * 执行匹配操作
 */
async function performMatching(matchType) {
    const currentUser = store.getCurrentUser();
    const members = store.getMembers();
    const useAI = document.getElementById('enableAIMatch')?.checked || false;
    const limit = parseInt(document.getElementById('matchLimit')?.value) || 10;
    
    // 设置匹配状态
    currentMatchOperation = {
        type: matchType,
        startTime: Date.now(),
        useAI,
        limit
    };
    
    try {
        // 显示进度指示器
        showMatchingProgress(matchType);
        
        // 执行匹配算法
        const matches = await measureAsyncPerformance(
            `${matchType}匹配`, 
            async () => {
                return await findMatches(currentUser, members, matchType, useAI);
            }
        );
        
        // 限制结果数量
        const limitedMatches = matches.slice(0, limit);
        
        // 显示匹配结果
        showMatchResults(limitedMatches, matchType);
        
        // 保存到历史记录
        saveToMatchHistory({
            type: matchType,
            timestamp: Date.now(),
            matches: limitedMatches,
            useAI,
            duration: Date.now() - currentMatchOperation.startTime
        });
        
        Logger.info('匹配完成', {
            type: matchType,
            matches: limitedMatches.length,
            useAI,
            duration: Date.now() - currentMatchOperation.startTime
        });
        
    } catch (error) {
        Logger.error('匹配执行失败', error);
        showMatchError(error.message);
    } finally {
        // 清理匹配状态
        currentMatchOperation = null;
        hideMatchingProgress();
    }
}

/**
 * 显示匹配进度
 */
function showMatchingProgress(matchType) {
    const progressContainer = document.getElementById('matchingProgress');
    const resultsContainer = document.getElementById('matchResults');
    
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
        
        const progressText = progressContainer.querySelector('.progress-text');
        const progressDetails = progressContainer.querySelector('.progress-details');
        
        if (progressText) {
            const typeTexts = {
                similar: '正在寻找兴趣相似的书友...',
                complementary: '正在发现互补的阅读搭档...',
                smart: '正在进行智能匹配分析...'
            };
            progressText.textContent = typeTexts[matchType] || '正在匹配中...';
        }
        
        if (progressDetails) {
            progressDetails.textContent = '分析用户资料和阅读偏好';
            
            // 模拟进度更新
            let step = 0;
            const steps = [
                '分析用户资料和阅读偏好',
                '计算相似度和互补性指标',
                '应用AI语义分析',
                '生成匹配结果和推荐理由'
            ];
            
            const progressInterval = setInterval(() => {
                step++;
                if (step < steps.length && progressDetails) {
                    progressDetails.textContent = steps[step];
                } else {
                    clearInterval(progressInterval);
                }
            }, 800);
            
            // 保存interval引用以便清理
            currentMatchOperation.progressInterval = progressInterval;
        }
    }
    
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
    }
}

/**
 * 隐藏匹配进度
 */
function hideMatchingProgress() {
    const progressContainer = document.getElementById('matchingProgress');
    if (progressContainer) {
        progressContainer.classList.add('hidden');
    }
    
    // 清理进度更新定时器
    if (currentMatchOperation?.progressInterval) {
        clearInterval(currentMatchOperation.progressInterval);
    }
}

/**
 * 显示匹配结果
 */
function showMatchResults(matches, matchType) {
    const resultsContainer = document.getElementById('matchResults');
    if (!resultsContainer) return;
    
    resultsContainer.classList.remove('hidden');
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-matches">
                <div class="no-matches-icon">😔</div>
                <h3>暂无匹配结果</h3>
                <p>尝试调整匹配类型或完善您的个人资料</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    刷新数据
                </button>
            </div>
        `;
        return;
    }
    
    const typeNames = {
        similar: '相似匹配',
        complementary: '互补匹配',  
        smart: '智能匹配'
    };
    
    const resultsHTML = `
        <div class="results-header">
            <h3>
                <span class="match-type-icon">${getMatchTypeIcon(matchType)}</span>
                ${typeNames[matchType]}结果
            </h3>
            <div class="results-meta">
                <span class="results-count">找到 ${matches.length} 个匹配</span>
                <span class="results-time">${new Date().toLocaleTimeString()}</span>
            </div>
        </div>
        
        <div class="results-list">
            ${matches.map((match, index) => generateMatchCard(match, index + 1)).join('')}
        </div>
        
        <div class="results-actions">
            <button class="btn btn-secondary" onclick="toggleMatchHistory()">
                查看历史记录
            </button>
            <button class="btn btn-primary" onclick="exportMatchResults()">
                导出结果
            </button>
        </div>
    `;
    
    resultsContainer.innerHTML = resultsHTML;
    
    // 绑定结果相关事件
    bindResultEvents();
}

/**
 * 生成匹配卡片HTML
 */
function generateMatchCard(match, rank) {
    const member = match.member;
    const questionnaire = member.questionnaire || {};
    const basicInfo = questionnaire.basicInfo || {};
    
    return `
        <div class="match-card" data-member-id="${member.studentId}">
            <div class="match-rank">
                <div class="rank-badge rank-${rank <= 3 ? rank : 'other'}">
                    ${rank}
                </div>
            </div>
            
            <div class="match-score">
                <div class="score-circle" style="--score: ${match.score}%">
                    <svg class="score-ring" viewBox="0 0 36 36">
                        <path class="score-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="score-ring-fill" stroke-dasharray="${match.score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="score-text">
                        <span class="score-value">${match.score}</span>
                        <span class="score-unit">%</span>
                    </div>
                </div>
                <div class="score-label">${getMatchTypeText(match.type)}</div>
            </div>
            
            <div class="member-info">
                <div class="member-avatar">
                    ${member.avatar || generateAvatarFromName(member.name)}
                </div>
                <div class="member-details">
                    <h4 class="member-name">${escapeHtml(member.name)}</h4>
                    <p class="member-meta">
                        ${escapeHtml(basicInfo.grade || '')} 
                        ${basicInfo.grade && basicInfo.major ? '·' : ''}
                        ${escapeHtml(basicInfo.major || '')}
                    </p>
                    <div class="member-tags">
                        ${generateMemberTags(member)}
                    </div>
                </div>
            </div>
            
            <div class="match-details">
                <div class="match-highlights">
                    ${generateMatchHighlights(match)}
                </div>
                <div class="match-reason">
                    <strong>匹配原因:</strong>
                    <p>${escapeHtml(match.details.matchReason || '综合分析显示你们很匹配')}</p>
                </div>
            </div>
            
            <div class="match-actions">
                <button class="btn btn-primary contact-btn" data-member-id="${member.studentId}">
                    <span class="btn-icon">💬</span>
                    联系TA
                </button>
                <button class="btn btn-secondary profile-btn" data-member-id="${member.studentId}">
                    <span class="btn-icon">👁</span>
                    查看资料
                </button>
                <button class="btn btn-outline save-btn" data-member-id="${member.studentId}">
                    <span class="btn-icon">⭐</span>
                    收藏
                </button>
            </div>
        </div>
    `;
}

/**
 * 绑定结果相关事件
 */
function bindResultEvents() {
    const resultsContainer = document.getElementById('matchResults');
    if (!resultsContainer) return;
    
    // 使用事件委托处理按钮点击
    resultsContainer.addEventListener('click', (e) => {
        const memberId = e.target.closest('[data-member-id]')?.dataset.memberId;
        if (!memberId) return;
        
        if (e.target.closest('.contact-btn')) {
            handleContactMember(memberId);
        } else if (e.target.closest('.profile-btn')) {
            handleViewProfile(memberId);
        } else if (e.target.closest('.save-btn')) {
            handleSaveMember(memberId);
        }
    });
}

/**
 * 更新匹配按钮状态
 */
function updateMatchButtonsState() {
    const currentUser = store.getCurrentUser();
    const members = store.getMembers();
    const matchButtons = document.querySelectorAll('.match-btn');
    
    const canMatch = currentUser && members && members.length > 1;
    
    matchButtons.forEach(button => {
        button.disabled = !canMatch;
        if (!canMatch) {
            button.title = currentUser ? '暂无其他成员数据' : '请先登录';
        } else {
            button.title = '';
        }
    });
}

/**
 * 保存匹配历史
 */
function saveToMatchHistory(matchRecord) {
    matchHistory.unshift(matchRecord);
    
    // 限制历史记录数量
    if (matchHistory.length > 10) {
        matchHistory = matchHistory.slice(0, 10);
    }
    
    // 更新历史显示
    updateMatchHistoryDisplay();
}

/**
 * 更新匹配历史显示
 */
function updateMatchHistoryDisplay() {
    const historyContainer = document.getElementById('matchHistory');
    if (!historyContainer) return;
    
    const historyList = historyContainer.querySelector('.history-list');
    if (!historyList) return;
    
    if (matchHistory.length === 0) {
        historyList.innerHTML = '<p class="no-history">暂无匹配历史</p>';
        return;
    }
    
    historyList.innerHTML = matchHistory.map(record => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-type">${getMatchTypeText(record.type)}</span>
                <span class="history-time">${new Date(record.timestamp).toLocaleString()}</span>
            </div>
            <div class="history-details">
                <span>找到 ${record.matches.length} 个匹配</span>
                <span>用时 ${(record.duration / 1000).toFixed(1)}s</span>
                ${record.useAI ? '<span class="ai-badge">AI</span>' : ''}
            </div>
        </div>
    `).join('');
}

/**
 * 显示匹配错误
 */
function showMatchError(message) {
    const resultsContainer = document.getElementById('matchResults');
    if (!resultsContainer) return;
    
    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = `
        <div class="match-error">
            <div class="error-icon">⚠️</div>
            <h3>匹配失败</h3>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary" onclick="location.reload()">
                重新尝试
            </button>
        </div>
    `;
}

// === 辅助函数 ===

function getMatchTypeIcon(type) {
    const icons = {
        similar: '🔍',
        complementary: '⚡',
        smart: '🤖'
    };
    return icons[type] || '🔍';
}

function getMatchTypeText(type) {
    const texts = {
        similar: '相似匹配',
        complementary: '互补匹配',
        smart: '智能匹配'
    };
    return texts[type] || type;
}

function generateAvatarFromName(name) {
    return name ? name.charAt(0).toUpperCase() : '👤';
}

function generateMemberTags(member) {
    const interests = member.questionnaire?.interests || {};
    const tags = [];
    
    Object.values(interests).forEach(value => {
        if (value && typeof value === 'string') {
            const valueTags = value.split(/[,，、\s]+/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .slice(0, 3);
            tags.push(...valueTags);
        }
    });
    
    return tags.slice(0, 5).map(tag => 
        `<span class="member-tag">${escapeHtml(tag)}</span>`
    ).join('');
}

function generateMatchHighlights(match) {
    const highlights = [];
    
    if (match.details.commonInterests && match.details.commonInterests.length > 0) {
        highlights.push(`
            <div class="highlight-item">
                <strong>共同兴趣:</strong>
                ${match.details.commonInterests.slice(0, 3).map(interest => 
                    `<span class="highlight-tag">${escapeHtml(interest)}</span>`
                ).join('')}
            </div>
        `);
    }
    
    if (match.details.similarity !== undefined) {
        highlights.push(`
            <div class="highlight-item">
                <strong>相似度:</strong> ${match.details.similarity}%
            </div>
        `);
    }
    
    if (match.details.complementarity !== undefined) {
        highlights.push(`
            <div class="highlight-item">
                <strong>互补性:</strong> ${match.details.complementarity}%
            </div>
        `);
    }
    
    return highlights.join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// === 事件处理器 ===

function handleContactMember(memberId) {
    Logger.info('联系成员', { memberId });
    // TODO: 实现联系功能
    alert('联系功能开发中...');
}

function handleViewProfile(memberId) {
    Logger.info('查看成员资料', { memberId });
    // TODO: 实现资料查看功能
    alert('资料查看功能开发中...');
}

function handleSaveMember(memberId) {
    Logger.info('收藏成员', { memberId });
    // TODO: 实现收藏功能
    alert('收藏功能开发中...');
}

function handleAIOptionChange(e) {
    const enabled = e.target.checked;
    Logger.debug('AI选项变化', { enabled });
}

function handleLimitChange(e) {
    const limit = e.target.value;
    Logger.debug('结果数量变化', { limit });
}

// === 全局函数（供HTML调用）===

window.toggleMatchHistory = function() {
    const historyContainer = document.getElementById('matchHistory');
    if (historyContainer) {
        historyContainer.classList.toggle('hidden');
    }
};

window.exportMatchResults = function() {
    Logger.info('导出匹配结果');
    alert('导出功能开发中...');
};

// 导出主要函数
export {
    showMatchResults,
    updateMatchButtonsState
};