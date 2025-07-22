// 角色和权限定义
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    REGULAR_ADMIN: 'regular_admin',
    LEGACY_ADMIN: 'legacy_admin'
};

const PERMISSIONS = {
    USER_MANAGEMENT: 'user_management',
    SYSTEM_MONITORING: 'system_monitoring',
    API_MANAGEMENT: 'api_management',
    CACHE_MANAGEMENT: 'cache_management',
    MEMBER_MANAGEMENT: 'member_management',
    MATCHING_FUNCTIONS: 'matching_functions',
    DATA_REFRESH: 'data_refresh'
};

// 管理员角色配置
const ADMIN_ROLE_CONFIG = {
    [ROLES.SUPER_ADMIN]: {
        icon: '👑',
        text: '超级管理员',
        description: '拥有所有系统权限'
    },
    [ROLES.REGULAR_ADMIN]: {
        icon: '⚙️',
        text: '管理员',
        description: '拥有管理权限'
    },
    [ROLES.LEGACY_ADMIN]: {
        icon: '⚙️',
        text: '管理员',
        description: '拥有管理权限'
    }
};

// 更新管理员角色指示器
function updateAdminRoleIndicator() {
    const indicator = document.getElementById('adminRoleIndicator');
    if (!indicator) return;

    // 更新角色主题
    updateAdminTheme();

    if (currentAdminRole && ADMIN_ROLE_CONFIG[currentAdminRole]) {
        const config = ADMIN_ROLE_CONFIG[currentAdminRole];
        indicator.innerHTML = `
            <div class="admin-role-content">
                <span class="admin-role-icon">${config.icon}</span>
                <span class="admin-role-text">${config.text}</span>
                <span class="admin-role-description">${config.description}</span>
            </div>
        `;
        indicator.style.display = 'inline-flex';
    } else {
        indicator.style.display = 'none';
    }
}

// 新增：更新管理员主题
function updateAdminTheme() {
    const body = document.body;
    const themes = {
        [ROLES.SUPER_ADMIN]: 'super-admin-theme',
        [ROLES.REGULAR_ADMIN]: 'regular-admin-theme',
        [ROLES.LEGACY_ADMIN]: 'legacy-admin-theme'
    };

    // 移除所有可能的主题
    Object.values(themes).forEach(theme => body.classList.remove(theme));

    // 添加当前角色主题
    if (currentAdminRole && themes[currentAdminRole]) {
        body.classList.add(themes[currentAdminRole]);
    }
}

// GitHub Gist 配置 - 构建时替换
let GITHUB_TOKEN = 'BUILD_TIME_GITHUB_TOKEN';
let GIST_ID = 'BUILD_TIME_GIST_ID';
let ADMIN_PASSWORD = 'BUILD_TIME_ADMIN_PASSWORD';
let SUPER_ADMIN_PASSWORD = 'BUILD_TIME_SUPER_ADMIN_PASSWORD';
let REGULAR_ADMIN_PASSWORD = 'BUILD_TIME_REGULAR_ADMIN_PASSWORD';
let AI_BASE_URL = 'BUILD_TIME_AI_BASE_URL';
let AI_API_KEY = 'BUILD_TIME_AI_API_KEY';
let AI_MODEL_NAME = 'BUILD_TIME_AI_MODEL_NAME';
const GIST_FILENAME = 'bookclub_members.json';
const AUDIT_LOG_FILENAME = 'audit_log.json'; // 新增：审计日志文件名


const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.USER_MANAGEMENT,
        PERMISSIONS.SYSTEM_MONITORING,
        PERMISSIONS.API_MANAGEMENT,
        PERMISSIONS.CACHE_MANAGEMENT,
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS,
        PERMISSIONS.DATA_REFRESH
    ],
    [ROLES.REGULAR_ADMIN]: [
        PERMISSIONS.USER_MANAGEMENT,
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS
        // 移除DATA_REFRESH - 这是技术操作，应由超级管理员处理
    ],
    [ROLES.LEGACY_ADMIN]: [ // 兼容旧版管理员
        PERMISSIONS.USER_MANAGEMENT,
        PERMISSIONS.SYSTEM_MONITORING,
        PERMISSIONS.API_MANAGEMENT,
        PERMISSIONS.MEMBER_MANAGEMENT,
        PERMISSIONS.MATCHING_FUNCTIONS,
        PERMISSIONS.DATA_REFRESH
    ]
};


// 存储所有成员数据
let members = [];
let auditLogs = []; // 新增：审计日志数据
let currentUser = null; // 当前登录用户
let isAdmin = false;
let currentAdminRole = null; // 新增：当前管理员角色
let currentAdminPermissions = []; // 新增：当前管理员权限
let aiAnalysisEnabled = true; // AI分析开关状态

// 日志级别配置
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

let currentLogLevel = LOG_LEVELS.INFO; // 默认日志级别

// 智能日志记录系统
const Logger = {
    error: (message, ...args) => {
        if (currentLogLevel >= LOG_LEVELS.ERROR) {
            console.error('❌', message, ...args);
        }
    },
    warn: (message, ...args) => {
        if (currentLogLevel >= LOG_LEVELS.WARN) {
            console.warn('⚠️', message, ...args);
        }
    },
    info: (message, ...args) => {
        if (currentLogLevel >= LOG_LEVELS.INFO) {
            console.log('ℹ️', message, ...args);
        }
    },
    debug: (message, ...args) => {
        if (currentLogLevel >= LOG_LEVELS.DEBUG) {
            console.log('🔍', message, ...args);
        }
    },
    monitoring: (message, ...args) => {
        // 监控日志只在调试模式下显示
        if (currentLogLevel >= LOG_LEVELS.DEBUG) {
            console.log('📊', message, ...args);
        }
    }
};

// 验证规则配置
const VALIDATION_RULES = {
    gender: {
        required: false,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    matchGenderPreference: {
        required: false,
        enum: ['male', 'female', 'no_preference']
    },
    matchingTypePreference: {
        required: false,
        enum: ['similar', 'complementary', 'no_preference']
    },
    bookCategories: {
        required: true,
        minItems: 1,
        maxItems: 7,
        allowedValues: [
            'literature_fiction', 'mystery_detective', 'sci_fi_fantasy',
            'history_biography', 'social_science_philosophy', 
            'psychology_self_help', 'art_design_lifestyle'
        ]
    },
    detailedBookPreferences: {
        required: false,
        maxLength: 500
    },
    favoriteBooks: {
        required: true,
        minItems: 2,
        maxItems: 10,
        itemMaxLength: 100
    },
    readingCommitment: {
        required: true,
        enum: ['light', 'medium', 'intensive', 'epic']
    }
};

// 数据迁移函数：将老用户数据升级到新版本
function migrateUserData(user) {
    if (!user.questionnaire || user.questionnaire.version !== '2.0') {
        return {
            ...user,
            // 确保所有现有字段都被保留
            studentId: user.studentId || 'N/A',
            status: user.status || 'approved',
            
            questionnaire: {
                version: '2.0',
                completedAt: user.questionnaire?.completedAt || '',
                lastUpdated: new Date().toISOString(),
                
                // 将旧用户的数据迁移到questionnaire对象内
                hobbies: user.hobbies || [],
                books: user.books || [],
                
                // 新增字段，使用默认值
                gender: user.gender || '',
                matchGenderPreference: user.matchGenderPreference || '',
                matchingTypePreference: user.matchingTypePreference || '',
                bookCategories: user.bookCategories || [],
                detailedBookPreferences: user.detailedBookPreferences || '',
                favoriteBooks: user.favoriteBooks || (user.books ? [...user.books] : []), // 将旧书籍数据迁移到最爱书籍
                readingCommitment: user.readingCommitment || '',
                readingHabits: user.readingHabits || {
                    weeklyHours: '',
                    preferredTimes: [],
                    readingMethods: [],
                    preferredLocations: []
                }
            }
        };
    }
    return user;
}

// 增强表单验证函数
function validateEnhancedForm(formData) {
    const errors = [];
    
    // 性别验证
    if (formData.gender && !VALIDATION_RULES.gender.enum.includes(formData.gender)) {
        errors.push('请选择有效的性别选项');
    }
    
    // 书籍类别验证
    if (!formData.bookCategories || formData.bookCategories.length === 0) {
        errors.push('请至少选择一个书籍类别');
    }
    if (formData.bookCategories && formData.bookCategories.length > VALIDATION_RULES.bookCategories.maxItems) {
        errors.push('书籍类别选择不能超过7个');
    }
    
    // 详细偏好验证
    if (formData.detailedBookPreferences && formData.detailedBookPreferences.length > VALIDATION_RULES.detailedBookPreferences.maxLength) {
        errors.push('详细偏好描述不能超过500字符');
    }
    
    // 最爱书籍验证
    if (!formData.favoriteBooks || formData.favoriteBooks.length < VALIDATION_RULES.favoriteBooks.minItems) {
        errors.push('请至少输入2本最爱的书籍');
    }
    if (formData.favoriteBooks && formData.favoriteBooks.length > VALIDATION_RULES.favoriteBooks.maxItems) {
        errors.push('最爱书籍不能超过10本');
    }
    
    // 验证每本书的长度
    if (formData.favoriteBooks) {
        for (const book of formData.favoriteBooks) {
            if (book.length > VALIDATION_RULES.favoriteBooks.itemMaxLength) {
                errors.push(`书名"${book}"超过100字符限制`);
                break;
            }
        }
    }
    
    // 阅读承诺验证
    if (!formData.readingCommitment) {
        errors.push('请选择您的阅读承诺期望');
    }
    if (formData.readingCommitment && !VALIDATION_RULES.readingCommitment.enum.includes(formData.readingCommitment)) {
        errors.push('请选择有效的阅读承诺选项');
    }
    
    return errors;
}

// 增强注册处理函数
async function handleEnhancedRegistration(enhancedFormData) {
    await loadMembersFromGist(); // 确保数据最新

    const userExists = members.some(m => m.name === enhancedFormData.name || m.studentId === enhancedFormData.studentId);
    if (userExists) {
        alert('该姓名或学号已被注册！');
        return;
    }

    const newUser = {
        id: Date.now().toString(),
        name: enhancedFormData.name,
        studentId: enhancedFormData.studentId,
        hobbies: [], // Keep for backward compatibility
        books: [],  // Keep for backward compatibility
        status: 'pending', // 'pending', 'approved'
        joinDate: new Date().toLocaleDateString('zh-CN'),
        
        // New enhanced fields
        gender: enhancedFormData.gender || '',
        bookCategories: enhancedFormData.bookCategories || [],
        detailedBookPreferences: enhancedFormData.detailedBookPreferences || '',
        favoriteBooks: enhancedFormData.favoriteBooks || [],
        readingCommitment: enhancedFormData.readingCommitment || '',
        readingHabits: enhancedFormData.readingHabits || {
            weeklyHours: '',
            preferredTimes: [],
            readingMethods: [],
            preferredLocations: []
        },
        questionnaire: {
            version: '2.0',
            completedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        }
    };

    members.push(newUser);
    await saveMembersToGist();
    alert('注册申请已提交，请等待管理员审核！');
    window.location.href = 'index.html';
}

// 添加用户资料视图的事件监听器
function addProfileEventListeners() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const userProfileSection = document.getElementById('userProfileSection');
    const memberSection = document.getElementById('memberSection');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            userProfileSection.style.display = 'none';
            memberSection.style.display = 'block';
            
            // 加载保存的头像到编辑界面
            if (typeof loadSavedAvatar === 'function') {
                loadSavedAvatar();
            }
            
            // 预填充个人简介
            const personalBioField = document.getElementById('personalBio');
            if (personalBioField && currentUser) {
                const savedBio = currentUser.personalBio || localStorage.getItem('userPersonalBio') || '';
                personalBioField.value = savedBio;
                
                // 更新字符计数器
                const bioCharCount = document.getElementById('personalBioCount');
                if (bioCharCount) {
                    bioCharCount.textContent = `${savedBio.length}/300字`;
                    if (savedBio.length > 270) {
                        bioCharCount.classList.add('warning');
                    } else {
                        bioCharCount.classList.remove('warning');
                    }
                }
            }
            
            // 预填充兴趣标签
            if (typeof loadSavedTags === 'function') {
                loadSavedTags();
            }
            
            // 预填充用户状态
            const userStatus = currentUser.userStatus || 'active';
            const statusRadio = document.querySelector(`input[name="userStatus"][value="${userStatus}"]`);
            if (statusRadio) {
                statusRadio.checked = true;
            }
            
            // 预填充邮箱信息
            const userEmailField = document.getElementById('userEmail');
            if (userEmailField && currentUser) {
                userEmailField.value = currentUser.email || '';
                
                // 显示邮箱验证状态
                updateEmailVerificationDisplay();
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            memberSection.style.display = 'none';
            userProfileSection.style.display = 'block';
            
            // 重新渲染用户资料（包括头像）
            renderUserProfile();
        });
    }
}

// 渲染用户个人资料
function renderUserProfile() {
    const profileContent = document.getElementById('userProfileContent');
    if (!currentUser || !profileContent) return;

    // 确保用户数据已迁移到最新版本
    const user = migrateUserData(currentUser);
    const questionnaire = user.questionnaire || {};

    // 格式化性别显示
    const formatGender = () => {
        const genderMap = {
            'male': '男',
            'female': '女',
            'other': '其他',
            'prefer_not_to_say': '不愿透露'
        };
        const gender = questionnaire.gender || user.gender || '';
        return gender ? genderMap[gender] || gender : '未填写';
    };

    // 格式化匹配性别偏好
    const formatMatchGenderPreference = () => {
        const preferenceMap = {
            'male': '男生',
            'female': '女生',
            'no_preference': '不介意'
        };
        const preference = questionnaire.matchGenderPreference || user.matchGenderPreference || '';
        return preference ? preferenceMap[preference] || preference : '未设置';
    };

    // 格式化匹配类型偏好
    const formatMatchingTypePreference = () => {
        const preferenceMap = {
            'similar': '🎯 相似型搭档',
            'complementary': '🌈 互补型搭档',
            'no_preference': '✨ 都可以'
        };
        const preference = questionnaire.matchingTypePreference || user.matchingTypePreference || '';
        return preference ? preferenceMap[preference] || preference : '未设置';
    };

    // 格式化用户状态
    const formatUserStatus = () => {
        const statusMap = {
            'active': '🟢 可匹配',
            'busy': '🟡 忙碌中', 
            'away': '🔴 暂不匹配',
            'reading': '📖 专心阅读'
        };
        const status = user.userStatus || 'active';
        return statusMap[status] || statusMap.active;
    };
    
    // 格式化邮箱地址
    const formatEmail = () => {
        const email = user.email || '';
        if (!email) {
            return '未设置';
        }
        
        const isVerified = user.emailVerified || false;
        const verificationIcon = isVerified ? '✅' : '❌';
        const verificationText = isVerified ? '已验证' : '未验证';
        
        return `${email} ${verificationIcon} ${verificationText}`;
    };

    // 格式化书籍类别
    const formatBookCategories = () => {
        const categories = questionnaire.bookCategories || user.bookCategories || [];
        if (categories.length > 0) {
            const categoryMap = {
                'literature_fiction': '文学/当代小说',
                'mystery_detective': '悬疑侦探/推理',
                'sci_fi_fantasy': '科幻奇幻',
                'history_biography': '历史传记/记实',
                'social_science_philosophy': '社科思想/哲学',
                'psychology_self_help': '心理成长/自助',
                'art_design_lifestyle': '艺术设计/生活方式'
            };
            return categories.map(cat => categoryMap[cat] || cat).join('、');
        }
        return '未填写';
    };

    // 格式化阅读预期
    const formatReadingCommitment = () => {
        const commitmentMap = {
            'light': '短篇轻量 (5w-10w字)',
            'medium': '中篇适中 (10w-25w字)',
            'intensive': '长篇投入 (25w-50w字)',
            'epic': '史诗巨著 (50w+字)'
        };
        const commitment = questionnaire.readingCommitment || user.readingCommitment || '';
        return commitment ? commitmentMap[commitment] || commitment : '未填写';
    };

    // 格式化个人简介
    const formatPersonalBio = () => {
        // 优先使用用户数据中的简介，回退到localStorage
        const bio = user.personalBio || localStorage.getItem('userPersonalBio');
        if (bio && bio.trim()) {
            return `
                <div class="profile-bio" style="margin-top: 12px;">
                    <strong style="color: #495057;">💭 个人简介：</strong>
                    <div style="margin-top: 6px;">${bio}</div>
                </div>
            `;
        }
        return '';
    };

    // 格式化兴趣标签
    const formatInterestTags = () => {
        // 优先使用用户数据中的标签，回退到localStorage
        let tags = user.interestTags;
        if (!tags || !Array.isArray(tags)) {
            const savedTags = localStorage.getItem('userInterestTags');
            if (savedTags) {
                try {
                    tags = JSON.parse(savedTags);
                } catch (e) {
                    console.warn('标签数据解析错误');
                    tags = [];
                }
            } else {
                tags = [];
            }
        }
        
        if (tags && tags.length > 0) {
            return `
                <div style="margin-top: 12px;">
                    <strong style="color: #495057;">🏷️ 兴趣标签：</strong>
                    <div class="profile-tags">
                        ${tags.map(tag => `<span class="profile-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        return '';
    };

    // 获取头像HTML
    const getAvatarHTML = () => {
        const savedAvatar = localStorage.getItem('userAvatar');
        if (savedAvatar) {
            try {
                const avatar = JSON.parse(savedAvatar);
                if (avatar.type === 'uploaded') {
                    return `<img class="profile-avatar" src="${avatar.data}" alt="用户头像">`;
                } else if (avatar.type === 'emoji') {
                    return `<div class="profile-avatar">${avatar.data}</div>`;
                }
            } catch (e) {
                return '<div class="profile-avatar">👤</div>';
            }
        }
        return '<div class="profile-avatar">👤</div>';
    };

    // 生成HTML
    profileContent.innerHTML = `
        <div class="profile-info" style="background: var(--card-bg); padding: 25px; border-radius: 15px; margin-bottom: 20px; box-shadow: 0 2px 10px var(--shadow-light); border: 1px solid var(--border-color); transition: all 0.3s ease;">
            <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--border-color);">
                ${getAvatarHTML()}
                <div style="flex-grow: 1; margin-left: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.5em;">📚 ${user.name} 的读书档案</h3>
                    <div style="color: var(--text-muted); margin-top: 5px; font-size: 0.9em;">学号：${user.studentId}</div>
                </div>
            </div>
            
            <div style="display: grid; gap: 16px;">
                <div class="profile-section" style="background: var(--profile-section-bg); padding: 15px; border-radius: 10px; border-left: 4px solid #4CAF50; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1em;">👤 基本信息</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong style="color: var(--text-secondary);">当前状态：</strong><span style="color: var(--text-tertiary);">${formatUserStatus()}</span></div>
                        <div><strong style="color: var(--text-secondary);">邮箱地址：</strong><span style="color: var(--text-tertiary);">${formatEmail()}</span></div>
                        <div><strong style="color: var(--text-secondary);">性别：</strong><span style="color: var(--text-tertiary);">${formatGender()}</span></div>
                        <div><strong style="color: var(--text-secondary);">匹配性别偏好：</strong><span style="color: var(--text-tertiary);">${formatMatchGenderPreference()}</span></div>
                        <div><strong style="color: var(--text-secondary);">匹配类型偏好：</strong><span style="color: var(--text-tertiary);">${formatMatchingTypePreference()}</span></div>
                    </div>
                    ${formatPersonalBio()}
                    ${formatInterestTags()}
                </div>

                <div class="profile-section" style="background: var(--profile-section-bg); padding: 15px; border-radius: 10px; border-left: 4px solid #2196F3; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1em;">📖 阅读偏好</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong style="color: var(--text-secondary);">书籍类别：</strong><span style="color: var(--text-tertiary);">${formatBookCategories()}</span></div>
                        <div><strong style="color: var(--text-secondary);">阅读预期：</strong><span style="color: var(--text-tertiary);">${formatReadingCommitment()}</span></div>
                        <div><strong style="color: var(--text-secondary);">最爱书籍：</strong><span style="color: var(--text-tertiary);">${(questionnaire.favoriteBooks || user.favoriteBooks || []).join('、') || '未填写'}</span></div>
                        <div><strong style="color: var(--text-secondary);">读过的书：</strong><span style="color: var(--text-tertiary);">${(questionnaire.books || user.books || []).join('、') || '未填写'}</span></div>
                    </div>
                </div>

                <div class="profile-section" style="background: var(--profile-section-bg); padding: 15px; border-radius: 10px; border-left: 4px solid #FF9800; border: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 1.1em;">🎯 兴趣爱好</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong style="color: var(--text-secondary);">兴趣爱好：</strong><span style="color: var(--text-tertiary);">${(questionnaire.hobbies || user.hobbies || []).join('、') || '未填写'}</span></div>
                        ${questionnaire.detailedBookPreferences ?
                            `<div><strong style="color: var(--text-secondary);">详细偏好：</strong><span style="color: var(--text-tertiary);">${questionnaire.detailedBookPreferences}</span></div>` :
                            ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.onload = async function() {
    // 优先使用构建时注入的配置
    const isBuiltWithEnv = GITHUB_TOKEN !== 'BUILD_TIME_GITHUB_TOKEN' && ADMIN_PASSWORD !== 'BUILD_TIME_ADMIN_PASSWORD' && GIST_ID !== 'BUILD_TIME_GIST_ID';
    if (!isBuiltWithEnv) {
        // 降级到手动配置
        GITHUB_TOKEN = localStorage.getItem('github_token') || '';
        GIST_ID = localStorage.getItem('gist_id') || '';
        ADMIN_PASSWORD = localStorage.getItem('admin_password') || '';
    }

    // 初始化AI分析开关状态
    const savedAiState = localStorage.getItem('ai_analysis_enabled');
    if (savedAiState !== null) {
        aiAnalysisEnabled = savedAiState === 'true';
    }
    
    // 初始化AI开关UI状态（如果存在）
    updateAiToggleUI();

    // 如果是注册页面，则不需要执行登录逻辑
    if (window.location.pathname.endsWith('register.html')) {
        return;
    }
    
    // 自动加载Gist数据
    if (GIST_ID) {
        // 优先加载系统配置
        await loadSystemConfig();
        await loadMembersFromGist();
    }

    // 检查本地存储的登录状态
    const loggedInUser = sessionStorage.getItem('currentUser');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
        isAdmin = sessionStorage.getItem('isAdmin') === 'true';
        currentAdminRole = sessionStorage.getItem('adminRole');
        currentAdminPermissions = JSON.parse(sessionStorage.getItem('adminPermissions') || '[]');
        
        if (isAdmin) {
            if (!validateAdminSession()) {
                alert('会话已过期，请重新登录。');
                logout();
                return;
            }
        }
        
        showLoggedInView();
        // 添加用户资料视图的事件监听器
        addProfileEventListeners();
    } else {
        showLoginView();
    }

    // 绑定登录表单事件
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 绑定成员信息更新表单事件
    const memberForm = document.getElementById('memberForm');
    if(memberForm) {
        memberForm.addEventListener('submit', handleUpdateMemberInfo);
    }
};

// AI分析开关管理函数
function toggleAiAnalysis() {
    if (!hasPermission('api_management')) {
        alert('权限不足');
        return;
    }
    aiAnalysisEnabled = !aiAnalysisEnabled;
    localStorage.setItem('ai_analysis_enabled', aiAnalysisEnabled.toString());
    updateAiToggleUI();
    
    // 记录AI功能切换审计日志
    logAuditAction(AUDIT_ACTIONS.AI_TOGGLE, null, { 
        newStatus: aiAnalysisEnabled ? 'enabled' : 'disabled',
        timestamp: new Date().toISOString()
    });
    
    Logger.info(`AI分析已${aiAnalysisEnabled ? '启用' : '禁用'}`);
}

// 日志级别控制管理函数
function toggleLogLevel() {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentIndex = levels.findIndex(level => LOG_LEVELS[level] === currentLogLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    currentLogLevel = LOG_LEVELS[levels[nextIndex]];
    
    localStorage.setItem('log_level', levels[nextIndex]);
    updateLogLevelUI();
    Logger.info(`日志级别已切换到: ${levels[nextIndex]}`);
}

// 更新日志级别UI状态
function updateLogLevelUI() {
    const logLevelBtn = document.getElementById('logLevelBtn');
    if (logLevelBtn) {
        const levelNames = { 0: 'ERROR', 1: 'WARN', 2: 'INFO', 3: 'DEBUG' };
        const currentLevelName = levelNames[currentLogLevel];
        logLevelBtn.textContent = `📝 日志级别：${currentLevelName}`;
        
        const levelColors = {
            'ERROR': 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            'WARN': 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
            'INFO': 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            'DEBUG': 'linear-gradient(135deg, #6f42c1 0%, #59359a 100%)'
        };
        logLevelBtn.style.background = levelColors[currentLevelName];
    }
}

// 更新AI开关UI状态
function updateAiToggleUI() {
    const aiToggleBtn = document.getElementById('aiToggleBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (aiToggleBtn) {
        aiToggleBtn.textContent = aiAnalysisEnabled ? '🤖 AI分析：开启' : '📊 AI分析：关闭';
        aiToggleBtn.style.background = aiAnalysisEnabled ? 
            'linear-gradient(135deg, #00b894 0%, #00a085 100%)' : 
            'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
    }
    
    if (loadingIndicator) {
        const baseText = aiAnalysisEnabled ? '🧠 正在进行AI智能分析，请稍候...' : '📊 正在进行传统匹配分析，请稍候...';
        loadingIndicator.textContent = baseText;
    }
}

// 进度条管理函数
function showProgress() {
    const progressContainer = document.getElementById('progressContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.classList.add('progress-pulse');
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    // 重置进度条
    updateProgress(0, 0, 0, '准备开始匹配分析...');
}

function hideProgress() {
    const progressContainer = document.getElementById('progressContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (progressContainer) {
        progressContainer.style.display = 'none';
        progressContainer.classList.remove('progress-pulse');
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function updateProgress(currentBatch, totalBatches, completedPairs, statusText, startTime = null) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressDetails = document.getElementById('progressDetails');
    const estimatedTime = document.getElementById('estimatedTime');
    
    if (!progressBar || !progressText || !progressPercentage || !progressDetails || !estimatedTime) {
        return; // 如果元素不存在，直接返回
    }
    
    // 计算进度百分比
    const percentage = totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0;
    
    // 更新进度条
    progressBar.style.width = `${percentage}%`;
    
    // 更新文本信息
    progressText.textContent = statusText;
    progressPercentage.textContent = `${percentage}%`;
    progressDetails.textContent = `第 ${currentBatch}/${totalBatches} 批 (已完成 ${completedPairs} 个配对)`;
    
    // 计算预估时间
    if (startTime && currentBatch > 0) {
        const elapsed = (Date.now() - startTime) / 1000; // 已耗时（秒）
        const avgTimePerBatch = elapsed / currentBatch; // 每批平均时间
        const remainingBatches = totalBatches - currentBatch;
        const estimatedRemaining = Math.round(remainingBatches * avgTimePerBatch);
        
        if (estimatedRemaining > 0) {
            if (estimatedRemaining < 60) {
                estimatedTime.textContent = `预估剩余: ${estimatedRemaining}秒`;
            } else {
                const minutes = Math.floor(estimatedRemaining / 60);
                const seconds = estimatedRemaining % 60;
                estimatedTime.textContent = `预估剩余: ${minutes}分${seconds}秒`;
            }
        } else {
            estimatedTime.textContent = '即将完成...';
        }
    } else {
        estimatedTime.textContent = '计算中...';
    }
    
    // 当完成时，添加完成效果
    if (percentage >= 100) {
        progressText.textContent = '🎉 匹配分析完成！';
        progressDetails.textContent = `共完成 ${completedPairs} 个配对分析`;
        estimatedTime.textContent = '已完成';
        
        // 移除脉冲效果
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.classList.remove('progress-pulse');
        }
        
        // 3秒后自动隐藏进度条
        setTimeout(() => {
            hideProgress();
        }, 3000);
    }
}

// 处理注册
async function handleRegistration(name, studentId) {
   await loadMembersFromGist(); // 确保数据最新

   const userExists = members.some(m => m.name === name || m.studentId === studentId);
   if (userExists) {
       alert('该姓名或学号已被注册！');
       return;
   }

   const newUser = {
       id: Date.now().toString(),
       name: name,
       studentId: studentId,
       hobbies: [], // Keep for backward compatibility
       books: [],  // Keep for backward compatibility
       status: 'pending', // 'pending', 'approved'
       joinDate: new Date().toLocaleDateString('zh-CN'),
       
       // New enhanced fields
       gender: '', // 'male', 'female', 'other', 'prefer_not_to_say'
       bookCategories: [], // Array of selected categories
       detailedBookPreferences: '', // Free text description
       favoriteBooks: [], // Array of favorite books
       readingCommitment: '', // 'light', 'medium', 'intensive', 'epic'
       readingHabits: {
           weeklyHours: '',
           preferredTimes: [],
           readingMethods: [],
           preferredLocations: []
       },
       questionnaire: {
           version: '2.0',
           completedAt: '',
           lastUpdated: new Date().toISOString()
       }
   };

   members.push(newUser);
   await saveMembersToGist();
   alert('注册申请已提交，请等待管理员审核！');
   window.location.href = 'index.html';
}

// 权限检查函数
function hasPermission(requiredPermission) {
    if (!isAdmin || !currentAdminRole) return false;
    return currentAdminPermissions.includes(requiredPermission);
}

// 审计日志系统
const AUDIT_ACTIONS = {
    APPROVE_MEMBER: 'approve_member',
    DELETE_MEMBER: 'delete_member',
    EDIT_MEMBER: 'edit_member',
    ADMIN_LOGIN: 'admin_login',
    ADMIN_LOGOUT: 'admin_logout',
    DATA_REFRESH: 'data_refresh',
    API_RESET: 'api_reset',
    AI_TOGGLE: 'ai_toggle',
    CONFIG_CHANGE: 'config_change'
};

// 记录审计日志
function logAuditAction(action, targetUser = null, details = null) {
    if (!isAdmin || !currentAdminRole) return;
    
    const logEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: new Date().toISOString(),
        adminName: currentUser?.name || 'Unknown Admin',
        adminRole: currentAdminRole,
        action: action,
        targetUser: targetUser ? {
            id: targetUser.id,
            name: targetUser.name,
            studentId: targetUser.studentId
        } : null,
        details: details,
        ipAddress: 'N/A', // 静态部署无法获取真实IP
        userAgent: navigator.userAgent
    };
    
    auditLogs.unshift(logEntry); // 添加到数组开头，最新的在前面
    
    // 保持日志数量限制，避免无限增长
    if (auditLogs.length > 1000) {
        auditLogs = auditLogs.slice(0, 1000);
    }
    
    // 异步保存到Gist
    saveAuditLogsToGist().catch(error => {
        Logger.error('Failed to save audit log:', error);
    });
}

// 保存审计日志到Gist
async function saveAuditLogsToGist() {
    try {
        const headers = { 'Authorization': `token ${GITHUB_TOKEN}` };
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
        
        if (!response.ok) throw new Error('Failed to fetch gist');
        
        const gist = await response.json();
        const files = gist.files;
        
        // 更新审计日志文件
        files[AUDIT_LOG_FILENAME] = {
            content: JSON.stringify(auditLogs, null, 2)
        };
        
        const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files })
        });
        
        if (!updateResponse.ok) throw new Error('Failed to update audit log');
        
        Logger.info('Audit log saved successfully');
    } catch (error) {
        Logger.error('Failed to save audit log:', error);
        throw error;
    }
}

// 加载审计日志从Gist
async function loadAuditLogsFromGist() {
    try {
        const headers = { 'Authorization': `token ${GITHUB_TOKEN}` };
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
        
        if (!response.ok) throw new Error('Failed to fetch gist');
        
        const gist = await response.json();
        const content = gist.files[AUDIT_LOG_FILENAME]?.content;
        
        if (content) {
            auditLogs = JSON.parse(content);
            Logger.info(`Loaded ${auditLogs.length} audit log entries`);
        } else {
            auditLogs = [];
            Logger.info('No existing audit log found, starting fresh');
        }
    } catch (error) {
        Logger.warn('Failed to load audit logs:', error);
        auditLogs = []; // 如果加载失败，使用空数组
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim();
    const studentId = document.getElementById('loginStudentId').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    // 优先处理超级管理员登录，无需姓名和学号
    if (password && SUPER_ADMIN_PASSWORD && password === SUPER_ADMIN_PASSWORD) {
        const authResult = {
            role: ROLES.SUPER_ADMIN,
            permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]
        };
        isAdmin = true;
        currentUser = { name: 'Super Admin', role: authResult.role };
        currentAdminRole = authResult.role;
        currentAdminPermissions = authResult.permissions;

        // 存储会话信息
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminRole', currentAdminRole);
        sessionStorage.setItem('adminPermissions', JSON.stringify(currentAdminPermissions));
        sessionStorage.setItem('adminLoginTime', Date.now());

        showLoggedInView();
        
        // 加载审计日志（异步执行）
        loadAuditLogsFromGist().then(() => {
            // 记录登录审计日志
            logAuditAction(AUDIT_ACTIONS.ADMIN_LOGIN, null, { loginTime: new Date().toISOString() });
        }).catch(error => {
            Logger.error('Failed to load audit logs during login:', error);
            // 即使加载失败也要记录登录日志
            logAuditAction(AUDIT_ACTIONS.ADMIN_LOGIN, null, { loginTime: new Date().toISOString() });
        });
        
        alert(`管理员 (${authResult.role}) 登录成功！`);
        return;
    }

    // 对于其他登录（普通用户、普通管理员），姓名和学号是必需的
    if (!name || !studentId) {
        alert('请输入姓名和学号进行登录。');
        return;
    }

    // 普通管理员或旧版管理员登录逻辑
    if (password) {
        let authResult = null;
        if (REGULAR_ADMIN_PASSWORD && password === REGULAR_ADMIN_PASSWORD) {
            authResult = {
                role: ROLES.REGULAR_ADMIN,
                permissions: ROLE_PERMISSIONS[ROLES.REGULAR_ADMIN]
            };
        } else if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
            authResult = {
                role: ROLES.LEGACY_ADMIN,
                permissions: ROLE_PERMISSIONS[ROLES.LEGACY_ADMIN]
            };
        }

        if (authResult) {
            isAdmin = true;
            currentUser = { name: 'Admin', role: authResult.role };
            currentAdminRole = authResult.role;
            currentAdminPermissions = authResult.permissions;

            // 存储会话信息
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('isAdmin', 'true');
            sessionStorage.setItem('adminRole', currentAdminRole);
            sessionStorage.setItem('adminPermissions', JSON.stringify(currentAdminPermissions));
            sessionStorage.setItem('adminLoginTime', Date.now());

            showLoggedInView();
            
            // 加载审计日志（异步执行）
            loadAuditLogsFromGist().then(() => {
                // 记录登录审计日志
                logAuditAction(AUDIT_ACTIONS.ADMIN_LOGIN, null, { loginTime: new Date().toISOString() });
            }).catch(error => {
                Logger.error('Failed to load audit logs during login:', error);
                // 即使加载失败也要记录登录日志
                logAuditAction(AUDIT_ACTIONS.ADMIN_LOGIN, null, { loginTime: new Date().toISOString() });
            });
            
            alert(`管理员 (${authResult.role}) 登录成功！`);
        } else {
            alert('管理员密码错误！');
        }
        return;
    }

    // 普通用户登录
    await loadMembersFromGist();
    const foundUser = members.find(m => m.name === name && m.studentId === studentId);

    if (foundUser) {
        if (foundUser.status === 'approved') {
            currentUser = foundUser;
            isAdmin = false;
            currentAdminRole = null;
            currentAdminPermissions = [];
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('isAdmin', 'false');
            sessionStorage.removeItem('adminRole');
            sessionStorage.removeItem('adminPermissions');
            showLoggedInView();
            addProfileEventListeners();
        } else {
            alert('您的账号正在审核中，请耐心等待。');
        }
    } else {
        alert('姓名或学号不正确，请检查或先注册。');
    }
}

// 退出登录
function logout() {
   currentUser = null;
   isAdmin = false;
   sessionStorage.removeItem('currentUser');
   sessionStorage.removeItem('isAdmin');
   sessionStorage.removeItem('adminRole');
   sessionStorage.removeItem('adminPermissions');
   
   // 退出时移除主题
   updateAdminTheme();

   showLoginView();
}

// 管理员退出登录
function adminLogout() {
    // 记录退出登录审计日志
    if (isAdmin && currentAdminRole) {
        logAuditAction(AUDIT_ACTIONS.ADMIN_LOGOUT, null, { 
            logoutTime: new Date().toISOString(),
            sessionDuration: Date.now() - (parseInt(sessionStorage.getItem('adminLoginTime')) || Date.now())
        });
    }
    
    logout(); // 调用通用退出登录函数
}

// 系统配置管理
let systemConfig = {};

// 默认系统配置
const defaultConfig = {
    metadata: {
        version: "1.0.0",
        description: "求索书社匹配工具的系统配置",
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: "System"
    },
    aiConfig: {
        enabled: false,
        provider: "custom",
        baseUrl: "",
        modelName: "gpt-4.1-mini",
        apiKeyPlaceholder: "在Netlify环境变量中设置",
        similarityThreshold: 0.6
    },
    systemParams: {
        logLevel: "INFO",
        matchBatchSize: 10,
        cacheTTL: 300,
        sessionTimeout: 3600
    },
    featureToggles: {
        enableSemanticSearch: false,
        enableUserProfileCustomization: true,
        enableAdminDashboardV2: true,
        enableAuditLogging: true
    },
    security: {
        roles: {
            super_admin: { passwordHash: "" },
            regular_admin: { passwordHash: "" },
            legacy_admin: { passwordHash: "" }
        },
        mfaRequired: false
    }
};

// 加载系统配置
async function loadSystemConfig() {
    if (!GIST_ID) {
        console.warn("GIST_ID 未配置，使用默认系统配置。");
        systemConfig = defaultConfig;
        return;
    }
    
    try {
        const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
        if (!response.ok) throw new Error('加载Gist失败');
        
        const gist = await response.json();
        const content = gist.files['system_config.json']?.content;
        
        if (content) {
            systemConfig = JSON.parse(content);
            console.log('系统配置加载成功:', systemConfig);
        } else {
            console.warn('未找到 system_config.json，使用默认配置。');
            systemConfig = defaultConfig;
        }
    } catch (error) {
        console.error('加载系统配置失败:', error);
        systemConfig = defaultConfig; // 加载失败时使用默认配置
    }
}

// 保存系统配置
async function saveSystemConfig(newConfig) {
    if (!hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
        alert('权限不足');
        return;
    }

    // 更新元数据
    newConfig.metadata.lastUpdated = new Date().toISOString();
    newConfig.metadata.lastUpdatedBy = currentUser?.name || 'Unknown';

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'system_config.json': {
                        content: JSON.stringify(newConfig, null, 2)
                    }
                }
            })
        });
        if (!response.ok) throw new Error('保存配置失败');
        
        systemConfig = newConfig; // 更新本地的配置对象
        logAuditAction('CONFIG_CHANGE', null, { changes: "System configuration updated" });
        alert('系统配置已成功保存！');

    } catch (error) {
        console.error('保存配置失败:', error);
        alert('保存配置失败：' + error.message);
    }
}

// 从 Gist 加载成员数据
async function loadMembersFromGist() {
   if (!GIST_ID) {
       console.log("GIST_ID is not configured.");
       return;
   }
   // 对于公开Gist，不需要Token
   const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};
   try {
       const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
       if (!response.ok) {
           throw new Error(`加载数据失败: ${response.statusText}`);
       }
       const gist = await response.json();
       const content = gist.files[GIST_FILENAME]?.content;
       if (content) {
           let needsSave = false;
           members = JSON.parse(content);
           
           // 数据迁移：为老数据添加新字段并保持向下兼容
           members = members.map(member => {
               const needsMigration = typeof member.status === 'undefined' || 
                                    !member.questionnaire || 
                                    member.questionnaire.version !== '2.0';
               
               if (needsMigration) {
                   needsSave = true;
                   return migrateUserData(member);
               }
               return member;
           });

           // 如果进行了数据迁移，则自动保存回Gist
           if (needsSave) {
               console.log('检测到旧版本数据，已自动执行数据迁移并保存。');
               await saveMembersToGist();
           }
       } else {
           members = [];
       }
   } catch (error) {
       console.error('加载Gist失败:', error);
       alert('加载数据失败，请联系管理员检查配置。');
   }
}

// 保存成员数据到 Gist
async function saveMembersToGist() {
    if (!GITHUB_TOKEN || !GIST_ID) {
        alert('请先完成配置');
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(members, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存数据失败：' + error.message);
    }
}

// 处理成员信息更新
async function handleUpdateMemberInfo(e) {
   e.preventDefault();
   if (!currentUser) return;

   // Collect all form data including new enhanced fields
   const hobbiesText = document.getElementById('hobbies').value.trim();
   const booksText = document.getElementById('books').value.trim();
   
   // 获取个人简介和兴趣标签数据
   const personalBio = document.getElementById('personalBio')?.value.trim() || '';
   const interestTags = JSON.parse(localStorage.getItem('userInterestTags') || '[]');
   
   // 获取邮箱信息
   const userEmail = document.getElementById('userEmail')?.value.trim() || '';
   
   // 保存个人简介到localStorage
   if (personalBio) {
       localStorage.setItem('userPersonalBio', personalBio);
   } else {
       localStorage.removeItem('userPersonalBio');
   }
   
   // New enhanced fields (if they exist in the form)
   const gender = document.querySelector('input[name="gender"]:checked')?.value || currentUser.gender || '';
   const matchGenderPreference = document.querySelector('input[name="matchGenderPreference"]:checked')?.value || currentUser.matchGenderPreference || '';
   const matchingTypePreference = document.querySelector('input[name="matchingTypePreference"]:checked')?.value || currentUser.matchingTypePreference || '';
   const userStatus = document.querySelector('input[name="userStatus"]:checked')?.value || currentUser.userStatus || 'active';
   const bookCategories = Array.from(document.querySelectorAll('input[name="bookCategories"]:checked') || [])
       .map(cb => cb.value);
   const detailedPreferences = document.getElementById('detailedPreferences')?.value.trim() || currentUser.detailedBookPreferences || '';
   const favoriteBooks = Array.from(document.querySelectorAll('#favoriteBooks input') || [])
       .map(input => input.value.trim())
       .filter(book => book);
   const readingCommitment = document.querySelector('input[name="readingCommitment"]:checked')?.value || currentUser.readingCommitment || '';

   // Basic validation for enhanced fields (if they exist)
   const enhancedFormData = {
       gender: gender,
       matchGenderPreference: matchGenderPreference,
       matchingTypePreference: matchingTypePreference,
       userStatus: userStatus,
       bookCategories: bookCategories.length > 0 ? bookCategories : currentUser.bookCategories || [],
       detailedBookPreferences: detailedPreferences,
       favoriteBooks: favoriteBooks.length > 0 ? favoriteBooks : currentUser.favoriteBooks || [],
       readingCommitment: readingCommitment
   };

   // Only validate enhanced fields if they are being updated (form elements exist)
   const hasEnhancedFields = document.querySelector('input[name="bookCategories"]') !== null;
   if (hasEnhancedFields) {
       const errors = validateEnhancedForm(enhancedFormData);
       if (errors.length > 0) {
           alert('请修正以下错误：\n' + errors.join('\n'));
           return;
       }
   }

   const userIndex = members.findIndex(m => m.id === currentUser.id);
   if (userIndex > -1) {
       // Update traditional fields
       members[userIndex].hobbies = hobbiesText ? hobbiesText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
       members[userIndex].books = booksText ? booksText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
       
       // Update enhanced fields if form has them, otherwise preserve existing values
       if (hasEnhancedFields) {
           members[userIndex].gender = enhancedFormData.gender;
           members[userIndex].matchGenderPreference = enhancedFormData.matchGenderPreference;
           members[userIndex].matchingTypePreference = enhancedFormData.matchingTypePreference;
           members[userIndex].userStatus = enhancedFormData.userStatus;
           members[userIndex].bookCategories = enhancedFormData.bookCategories;
           members[userIndex].detailedBookPreferences = enhancedFormData.detailedBookPreferences;
           members[userIndex].favoriteBooks = enhancedFormData.favoriteBooks;
           members[userIndex].readingCommitment = enhancedFormData.readingCommitment;
           
           // 保存个人简介和兴趣标签
           members[userIndex].personalBio = personalBio;
           members[userIndex].interestTags = interestTags;
           
           // 保存邮箱信息
           if (userEmail && userEmail !== currentUser.email) {
               members[userIndex].email = userEmail;
               // 如果邮箱改变了，重置验证状态
               members[userIndex].emailVerified = false;
               members[userIndex].emailVerificationDate = null;
           } else if (userEmail) {
               members[userIndex].email = userEmail;
           }
           
           // Update questionnaire metadata
           if (!members[userIndex].questionnaire) {
               members[userIndex].questionnaire = { version: '2.0' };
           }
           members[userIndex].questionnaire.completedAt = new Date().toISOString();
           members[userIndex].questionnaire.lastUpdated = new Date().toISOString();
           members[userIndex].questionnaire.version = '2.0';
       }
       
       await saveMembersToGist();
       // 更新本地 currentUser
       currentUser = members[userIndex];
       sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
       
       alert('信息更新成功！');
       
       // 隐藏编辑表单，显示用户资料
       document.getElementById('memberSection').style.display = 'none';
       document.getElementById('userProfileSection').style.display = 'block';
       
       // 重新渲染用户资料（包括头像）
       renderUserProfile();
   }
}

// 渲染待审核列表（仅管理员）
function renderPendingList() {
   if (!isAdmin) return;
   const pendingListDiv = document.getElementById('pendingList');
   const pendingMembers = members.filter(m => m.status === 'pending');

   if (pendingMembers.length === 0) {
       pendingListDiv.innerHTML = '<div class="no-data">没有待审核的用户</div>';
       return;
   }

   pendingListDiv.innerHTML = pendingMembers.map(member => `
       <div class="member-item">
           <div class="member-info">
               <h3>${member.name}</h3>
               <div class="member-details">学号：${member.studentId}</div>
           </div>
           <button onclick="approveMember('${member.id}')">批准</button>
           <button class="delete-btn" onclick="deleteMember('${member.id}')">拒绝</button>
       </div>
   `).join('');
}

// 批准成员
async function approveMember(id) {
   if (!isAdmin) return;
   const memberIndex = members.findIndex(m => m.id === id);
   if (memberIndex > -1) {
       members[memberIndex].status = 'approved';
       await saveMembersToGist();
       renderPendingList();
       renderMemberList();
   }
}

// 渲染已批准的成员列表
function renderMemberList() {
   if (!isAdmin) return;
   const memberListDiv = document.getElementById('memberList');
   const memberCountSpan = document.getElementById('memberCount');
   const approvedMembers = members.filter(m => m.status === 'approved');

   if (approvedMembers.length === 0) {
       memberListDiv.innerHTML = '<div class="no-data">暂无已批准成员</div>';
       memberCountSpan.textContent = '';
       return;
   }

   memberCountSpan.textContent = `(共 ${approvedMembers.length} 人)`;
   memberListDiv.innerHTML = approvedMembers.map(member => {
       // 确保用户数据已迁移到最新版本
       const migratedMember = migrateUserData(member);
       const questionnaire = migratedMember.questionnaire;
       
       // 显示信息的辅助函数
       const formatHobbies = () => {
           // 优先使用questionnaire中的数据，回退到根级别数据
           const hobbies = questionnaire.hobbies || migratedMember.hobbies || [];
           if (hobbies && hobbies.length > 0) {
               return hobbies.join('、');
           }
           return '未填写';
       };
       
       const formatBooks = () => {
           // 优先使用questionnaire中的数据，回退到根级别数据
           const books = questionnaire.books || migratedMember.books || [];
           if (books && books.length > 0) {
               return books.join('、');
           }
           return '未填写';
       };
       
       const formatGender = () => {
           const genderMap = {
               'male': '男',
               'female': '女', 
               'other': '其他',
               'prefer_not_to_say': '不愿透露'
           };
           // 优先使用questionnaire中的数据，回退到根级别数据
           const gender = questionnaire.gender || migratedMember.gender || '';
           return gender ? genderMap[gender] || gender : '未填写';
       };
       
       const formatBookCategories = () => {
           // 优先使用questionnaire中的数据，回退到根级别数据
           const bookCategories = questionnaire.bookCategories || migratedMember.bookCategories || [];
           if (bookCategories && bookCategories.length > 0) {
               const categoryMap = {
                   'literature_fiction': '文学/当代小说',
                   'mystery_detective': '悬疑侦探/推理',
                   'sci_fi_fantasy': '科幻奇幻',
                   'history_biography': '历史传记/记实',
                   'social_science_philosophy': '社科思想/哲学',
                   'psychology_self_help': '心理成长/自助',
                   'art_design_lifestyle': '艺术设计/生活方式'
               };
               return bookCategories.map(cat => categoryMap[cat] || cat).join('、');
           }
           return '未填写';
       };
       
       const formatFavoriteBooks = () => {
           // 优先使用questionnaire中的数据，回退到根级别数据
           const favoriteBooks = questionnaire.favoriteBooks || migratedMember.favoriteBooks || [];
           if (favoriteBooks && favoriteBooks.length > 0) {
               return favoriteBooks.join('、');
           }
           return '未填写';
       };
       
       const formatMatchGenderPreference = () => {
           const preferenceMap = {
               'male': '男生',
               'female': '女生',
               'no_preference': '不介意'
           };
           // 优先使用questionnaire中的数据，回退到根级别数据
           const matchGenderPreference = questionnaire.matchGenderPreference || migratedMember.matchGenderPreference || '';
           return matchGenderPreference ? preferenceMap[matchGenderPreference] || matchGenderPreference : '未设置';
       };
       
       const formatMatchingTypePreference = () => {
           const preferenceMap = {
               'similar': '🎯 相似型搭档',
               'complementary': '🌈 互补型搭档', 
               'no_preference': '✨ 都可以'
           };
           // 优先使用questionnaire中的数据，回退到根级别数据
           const matchingTypePreference = questionnaire.matchingTypePreference || migratedMember.matchingTypePreference || '';
           return matchingTypePreference ? preferenceMap[matchingTypePreference] || matchingTypePreference : '未设置';
       };
       
       const formatUserStatus = () => {
           const statusMap = {
               'active': '🟢 可匹配',
               'busy': '🟡 忙碌中', 
               'away': '🔴 暂不匹配',
               'reading': '📖 专心阅读'
           };
           // 优先使用questionnaire中的数据，回退到根级别数据
           const userStatus = questionnaire.userStatus || migratedMember.userStatus || 'active';
           return statusMap[userStatus] || statusMap.active;
       };
       
       const formatEmail = () => {
           const email = migratedMember.email || '';
           if (!email) {
               return '未设置';
           }
           
           const isVerified = migratedMember.emailVerified || false;
           const verificationIcon = isVerified ? '✅' : '❌';
           const verificationText = isVerified ? '已验证' : '未验证';
           
           return `${email} ${verificationIcon} ${verificationText}`;
       };
       
       const formatReadingCommitment = () => {
           const commitmentMap = {
               'light': '轻量阅读(5w-10w字)',
               'medium': '适中阅读(10w-25w字)', 
               'intensive': '投入阅读(25w-50w字)',
               'epic': '史诗阅读(50w+字)'
           };
           // 优先使用questionnaire中的数据，回退到根级别数据
           const readingCommitment = questionnaire.readingCommitment || migratedMember.readingCommitment || '';
           return readingCommitment ? commitmentMap[readingCommitment] || readingCommitment : '未填写';
       };
       
       return `
           <div class="member-item">
               <div class="member-info">
                   <h3>${migratedMember.name} (学号: ${migratedMember.studentId})</h3>
                   <div class="member-details">
                       <div><strong>当前状态：</strong>${formatUserStatus()}</div>
                       <div><strong>邮箱地址：</strong>${formatEmail()}</div>
                       <div><strong>性别：</strong>${formatGender()}</div>
                       <div><strong>性别偏好：</strong>${formatMatchGenderPreference()}</div>
                       <div><strong>匹配偏好：</strong>${formatMatchingTypePreference()}</div>
                       <div><strong>书目类型：</strong>${formatBookCategories()}</div>
                       <div><strong>兴趣爱好：</strong>${formatHobbies()}</div>
                       <div><strong>读过的书：</strong>${formatBooks()}</div>
                       <div><strong>最爱书籍：</strong>${formatFavoriteBooks()}</div>
                       <div><strong>阅读预期：</strong>${formatReadingCommitment()}</div>
                       ${(() => {
                           const detailedPreferences = questionnaire.detailedBookPreferences || migratedMember.detailedBookPreferences || '';
                           return detailedPreferences ? `<div><strong>详细偏好：</strong>${detailedPreferences}</div>` : '';
                       })()}
                   </div>
               </div>
               <div class="member-actions">
                   <button class="secondary edit-btn" onclick="openEditMemberModal('${migratedMember.id}')" style="margin-right: 8px;" title="编辑用户资料">✏️ 编辑</button>
                   <button class="delete-btn" onclick="deleteMember('${migratedMember.id}')" title="删除用户">🗑️ 删除</button>
               </div>
           </div>
       `;
   }).join('');
}

// 删除成员（管理员操作，可删除任何状态的用户）
async function deleteMember(id) {
   if (!isAdmin) return;
   const memberName = members.find(m => m.id === id)?.name || '该用户';
   if (confirm(`确定要删除 ${memberName} 吗？此操作不可撤销。`)) {
       members = members.filter(m => m.id !== id);
       await saveMembersToGist();
       renderPendingList();
       renderMemberList();
       document.getElementById('matchResults').innerHTML = '';
   }
}

// 编辑用户资料相关功能
let currentEditingMember = null;

// 打开编辑用户模态框
function openEditMemberModal(memberId) {
    if (!requirePermission(PERMISSIONS.USER_MANAGEMENT, '编辑用户资料')) {
        return;
    }
    
    const member = members.find(m => m.id === memberId);
    if (!member) {
        alert('找不到该用户');
        return;
    }
    
    currentEditingMember = member;
    const migratedMember = migrateUserData(member);
    const questionnaire = migratedMember.questionnaire;
    
    // 设置模态框标题
    document.getElementById('editMemberTitle').textContent = `编辑用户资料：${migratedMember.name}`;
    
    // 填充只读字段
    document.getElementById('editStudentId').value = migratedMember.studentId || '';
    const registrationDate = migratedMember.registrationTime ? 
        new Date(migratedMember.registrationTime).toLocaleString('zh-CN') : '未知';
    document.getElementById('editRegistrationTime').value = registrationDate;
    
    // 填充可编辑字段
    document.getElementById('editName').value = migratedMember.name || '';
    document.getElementById('editEmail').value = migratedMember.email || '';
    document.getElementById('editDetailedPreferences').value = questionnaire.detailedBookPreferences || migratedMember.detailedBookPreferences || '';
    document.getElementById('editUserStatus').value = questionnaire.userStatus || migratedMember.userStatus || 'active';
    
    // 设置头像
    updateEditMemberAvatar(migratedMember);
    
    // 动态生成兴趣标签选择
    generateEditHobbiesOptions(questionnaire.hobbies || migratedMember.hobbies || []);
    
    // 动态生成书目类型选择
    generateEditBookCategoriesOptions(questionnaire.bookCategories || migratedMember.bookCategories || []);
    
    // 显示模态框
    document.getElementById('editMemberModal').style.display = 'block';
    
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
}

// 关闭编辑用户模态框
function closeEditMemberModal() {
    document.getElementById('editMemberModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingMember = null;
}

// 更新编辑模态框中的头像显示
function updateEditMemberAvatar(member) {
    const avatarContainer = document.getElementById('editMemberAvatar');
    const avatarData = member.avatar;
    
    if (!avatarData) {
        avatarContainer.innerHTML = '👤';
        return;
    }
    
    if (typeof avatarData === 'string' && avatarData.startsWith('{')) {
        try {
            const avatar = JSON.parse(avatarData);
            if (avatar.type === 'uploaded') {
                avatarContainer.innerHTML = `<img src="${avatar.data}" alt="用户头像" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else if (avatar.type === 'emoji') {
                avatarContainer.innerHTML = avatar.data;
            } else {
                avatarContainer.innerHTML = '👤';
            }
        } catch (e) {
            avatarContainer.innerHTML = '👤';
        }
    } else {
        avatarContainer.innerHTML = '👤';
    }
}

// 移除用户头像
function removeUserAvatar() {
    if (!currentEditingMember) return;
    
    if (confirm('确定要移除该用户的头像吗？此操作不可撤销。')) {
        document.getElementById('editMemberAvatar').innerHTML = '👤';
        // 标记头像已被移除
        currentEditingMember.avatarRemoved = true;
    }
}

// 生成兴趣标签选择项
function generateEditHobbiesOptions(selectedHobbies) {
    const container = document.getElementById('editHobbiesContainer');
    const hobbiesOptions = [
        '阅读写作', '音乐艺术', '运动健身', '电影戏剧', '旅行摄影', 
        '科技数码', '烹饪美食', '学习进修', '社交聚会', '游戏娱乐'
    ];
    
    container.innerHTML = hobbiesOptions.map(hobby => `
        <label class="checkbox-option">
            <input type="checkbox" name="editHobbies" value="${hobby}" ${selectedHobbies.includes(hobby) ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
            ${hobby}
        </label>
    `).join('');
}

// 生成书目类型选择项
function generateEditBookCategoriesOptions(selectedCategories) {
    const container = document.getElementById('editBookCategoriesContainer');
    const categoryOptions = [
        { value: 'literature_fiction', label: '文学/当代小说' },
        { value: 'mystery_detective', label: '悬疑侦探/推理' },
        { value: 'sci_fi_fantasy', label: '科幻奇幻' },
        { value: 'history_biography', label: '历史传记/记实' },
        { value: 'social_science_philosophy', label: '社科思想/哲学' },
        { value: 'psychology_self_help', label: '心理成长/自助' },
        { value: 'art_design_lifestyle', label: '艺术设计/生活方式' }
    ];
    
    container.innerHTML = categoryOptions.map(option => `
        <label class="checkbox-option">
            <input type="checkbox" name="editBookCategories" value="${option.value}" ${selectedCategories.includes(option.value) ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
            ${option.label}
        </label>
    `).join('');
}

// 邮箱验证函数
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 处理编辑用户表单提交
async function handleEditMemberSubmit(e) {
    e.preventDefault();
    
    if (!currentEditingMember || !requirePermission(PERMISSIONS.USER_MANAGEMENT, '编辑用户资料')) {
        return;
    }
    
    try {
        // 收集表单数据
        const formData = {
            name: document.getElementById('editName').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            detailedBookPreferences: document.getElementById('editDetailedPreferences').value.trim(),
            userStatus: document.getElementById('editUserStatus').value,
            hobbies: Array.from(document.querySelectorAll('input[name="editHobbies"]:checked')).map(cb => cb.value),
            bookCategories: Array.from(document.querySelectorAll('input[name="editBookCategories"]:checked')).map(cb => cb.value)
        };
        
        // 验证必填字段
        if (!formData.name) {
            alert('姓名不能为空');
            return;
        }
        
        if (formData.email && !isValidEmail(formData.email)) {
            alert('请输入有效的邮箱地址');
            return;
        }
        
        // 记录更改内容
        const changes = [];
        const originalMember = migrateUserData(currentEditingMember);
        const originalQuestionnaire = originalMember.questionnaire;
        
        // 检查每个字段的变化
        if (formData.name !== originalMember.name) {
            changes.push({
                field: 'name',
                oldValue: originalMember.name,
                newValue: formData.name
            });
        }
        
        if (formData.email !== (originalMember.email || '')) {
            changes.push({
                field: 'email',
                oldValue: originalMember.email || '',
                newValue: formData.email
            });
        }
        
        if (formData.detailedBookPreferences !== (originalQuestionnaire.detailedBookPreferences || '')) {
            changes.push({
                field: 'detailedBookPreferences',
                oldValue: originalQuestionnaire.detailedBookPreferences || '',
                newValue: formData.detailedBookPreferences
            });
        }
        
        if (formData.userStatus !== (originalQuestionnaire.userStatus || 'active')) {
            changes.push({
                field: 'userStatus',
                oldValue: originalQuestionnaire.userStatus || 'active',
                newValue: formData.userStatus
            });
        }
        
        // 检查数组字段的变化
        const originalHobbies = originalQuestionnaire.hobbies || originalMember.hobbies || [];
        if (JSON.stringify(formData.hobbies.sort()) !== JSON.stringify(originalHobbies.sort())) {
            changes.push({
                field: 'hobbies',
                oldValue: originalHobbies.join(', '),
                newValue: formData.hobbies.join(', ')
            });
        }
        
        const originalBookCategories = originalQuestionnaire.bookCategories || originalMember.bookCategories || [];
        if (JSON.stringify(formData.bookCategories.sort()) !== JSON.stringify(originalBookCategories.sort())) {
            changes.push({
                field: 'bookCategories',
                oldValue: originalBookCategories.join(', '),
                newValue: formData.bookCategories.join(', ')
            });
        }
        
        // 检查头像移除
        if (currentEditingMember.avatarRemoved) {
            changes.push({
                field: 'avatar',
                oldValue: 'existing avatar',
                newValue: 'removed'
            });
        }
        
        if (changes.length === 0) {
            alert('没有检测到任何更改');
            return;
        }
        
        // 确认更改
        const changesSummary = changes.map(c => `• ${c.field}: "${c.oldValue}" → "${c.newValue}"`).join('\n');
        if (!confirm(`确定要保存以下更改吗？\n\n${changesSummary}\n\n此操作将被记录在审计日志中。`)) {
            return;
        }
        
        // 应用更改
        const memberIndex = members.findIndex(m => m.id === currentEditingMember.id);
        if (memberIndex === -1) {
            alert('找不到该用户');
            return;
        }
        
        // 更新成员数据
        members[memberIndex].name = formData.name;
        members[memberIndex].email = formData.email;
        
        // 确保问卷数据结构存在
        if (!members[memberIndex].questionnaire) {
            members[memberIndex].questionnaire = {};
        }
        
        members[memberIndex].questionnaire.detailedBookPreferences = formData.detailedBookPreferences;
        members[memberIndex].questionnaire.userStatus = formData.userStatus;
        members[memberIndex].questionnaire.hobbies = formData.hobbies;
        members[memberIndex].questionnaire.bookCategories = formData.bookCategories;
        
        // 处理头像移除
        if (currentEditingMember.avatarRemoved) {
            members[memberIndex].avatar = null;
        }
        
        // 保存到Gist
        await saveMembersToGist();
        
        // 记录审计日志
        logAuditAction(AUDIT_ACTIONS.EDIT_MEMBER, {
            id: currentEditingMember.id,
            name: formData.name,
            studentId: currentEditingMember.studentId
        }, { changes });
        
        // 更新UI
        renderMemberList();
        closeEditMemberModal();
        
        alert('用户资料更新成功！');
        
    } catch (error) {
        Logger.error('Failed to edit member:', error);
        alert('保存失败，请稍后重试');
    }
}

// 系统配置界面管理
function openSystemConfig() {
    if (!hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
        alert('权限不足，仅超级管理员可访问系统配置');
        return;
    }
    
    // 显示模态框
    document.getElementById('systemConfigModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 加载当前配置到表单
    loadSystemConfigToForm();
}

function closeSystemConfigModal() {
    document.getElementById('systemConfigModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openConfigTab(evt, tabName) {
    // 隐藏所有标签页内容
    const tabContents = document.getElementsByClassName("config-tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    // 移除所有标签链接的active类
    const tabLinks = document.getElementsByClassName("config-tab-link");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }
    
    // 显示当前标签页并添加active类
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function loadSystemConfigToForm() {
    if (!systemConfig || !systemConfig.aiConfig) {
        console.warn('系统配置未加载，使用默认值');
        return;
    }
    
    // AI配置
    document.getElementById('aiEnabled').checked = systemConfig.aiConfig.enabled || false;
    document.getElementById('aiProvider').value = systemConfig.aiConfig.provider || 'custom';
    document.getElementById('aiBaseUrl').value = systemConfig.aiConfig.baseUrl || '';
    document.getElementById('aiModelName').value = systemConfig.aiConfig.modelName || 'gpt-4.1-mini';
    document.getElementById('similarityThreshold').value = systemConfig.aiConfig.similarityThreshold || 0.6;
    
    // 系统参数
    document.getElementById('logLevel').value = systemConfig.systemParams.logLevel || 'INFO';
    document.getElementById('matchBatchSize').value = systemConfig.systemParams.matchBatchSize || 10;
    document.getElementById('cacheTTL').value = systemConfig.systemParams.cacheTTL || 300;
    document.getElementById('sessionTimeout').value = systemConfig.systemParams.sessionTimeout || 3600;
    
    // 功能开关
    document.getElementById('enableSemanticSearch').checked = systemConfig.featureToggles.enableSemanticSearch || false;
    document.getElementById('enableUserProfileCustomization').checked = systemConfig.featureToggles.enableUserProfileCustomization || true;
    document.getElementById('enableAdminDashboardV2').checked = systemConfig.featureToggles.enableAdminDashboardV2 || true;
    document.getElementById('enableAuditLogging').checked = systemConfig.featureToggles.enableAuditLogging || true;
    
    // 安全配置
    document.getElementById('mfaRequired').checked = systemConfig.security.mfaRequired || false;
}

async function saveAllSystemConfig() {
    if (!hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
        alert('权限不足');
        return;
    }
    
    try {
        // 收集所有表单数据
        const newConfig = {
            ...systemConfig,
            aiConfig: {
                enabled: document.getElementById('aiEnabled').checked,
                provider: document.getElementById('aiProvider').value,
                baseUrl: document.getElementById('aiBaseUrl').value,
                modelName: document.getElementById('aiModelName').value,
                apiKeyPlaceholder: systemConfig.aiConfig.apiKeyPlaceholder,
                similarityThreshold: parseFloat(document.getElementById('similarityThreshold').value)
            },
            systemParams: {
                logLevel: document.getElementById('logLevel').value,
                matchBatchSize: parseInt(document.getElementById('matchBatchSize').value),
                cacheTTL: parseInt(document.getElementById('cacheTTL').value),
                sessionTimeout: parseInt(document.getElementById('sessionTimeout').value)
            },
            featureToggles: {
                enableSemanticSearch: document.getElementById('enableSemanticSearch').checked,
                enableUserProfileCustomization: document.getElementById('enableUserProfileCustomization').checked,
                enableAdminDashboardV2: document.getElementById('enableAdminDashboardV2').checked,
                enableAuditLogging: document.getElementById('enableAuditLogging').checked
            },
            security: {
                ...systemConfig.security,
                mfaRequired: document.getElementById('mfaRequired').checked
            }
        };
        
        // 处理密码更新
        const superAdminPassword = document.getElementById('superAdminPassword').value.trim();
        const regularAdminPassword = document.getElementById('regularAdminPassword').value.trim();
        
        if (superAdminPassword) {
            // 使用简单的哈希（在生产环境中应使用更安全的方法）
            newConfig.security.roles.super_admin.passwordHash = await hashPassword(superAdminPassword);
        }
        
        if (regularAdminPassword) {
            newConfig.security.roles.regular_admin.passwordHash = await hashPassword(regularAdminPassword);
        }
        
        // 保存配置
        await saveSystemConfig(newConfig);
        
        // 显示成功消息
        showConfigStatus('success', '所有配置已成功保存！', 'ai-config-status');
        
        // 清空密码字段
        document.getElementById('superAdminPassword').value = '';
        document.getElementById('regularAdminPassword').value = '';
        
        // 如果密码有更新，提醒需要重新登录
        if (superAdminPassword || regularAdminPassword) {
            alert('密码已更新！\n\n为了安全起见，所有管理员需要重新登录。\n系统将在5秒后自动退出登录。');
            setTimeout(() => {
                adminLogout();
            }, 5000);
        }
        
    } catch (error) {
        console.error('保存配置失败:', error);
        showConfigStatus('error', '保存配置失败：' + error.message, 'ai-config-status');
    }
}

async function testSystemConfig() {
    try {
        // 测试GitHub连接
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
        });
        
        if (response.ok) {
            showConfigStatus('success', 'GitHub连接测试成功！', 'ai-config-status');
        } else {
            showConfigStatus('error', 'GitHub连接测试失败：' + response.statusText, 'ai-config-status');
        }
        
    } catch (error) {
        showConfigStatus('error', '连接测试失败：' + error.message, 'ai-config-status');
    }
}

function showConfigStatus(type, message, elementId) {
    const statusElement = document.getElementById(elementId);
    statusElement.className = `config-status-message ${type}`;
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// 简单的密码哈希函数（生产环境应使用更安全的方法）
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// UI 更新
function showLoginView() {
   document.getElementById('loginSection').style.display = 'block';
   document.getElementById('memberSection').style.display = 'none';
   document.getElementById('adminSection').style.display = 'none';
   document.getElementById('userProfileSection').style.display = 'none';
}

function showLoggedInView() {
    document.getElementById('loginSection').style.display = 'none';
    if (isAdmin) {
        document.getElementById('adminSection').style.display = 'block';
        document.getElementById('memberSection').style.display = 'none';
        document.getElementById('userProfileSection').style.display = 'none';
        
        // 更新管理员角色指示器
        updateAdminRoleIndicator();
        
        // 根据权限更新UI显示
        updateUIBasedOnPermissions();
       
        renderPendingList();
        renderMemberList();
   } else {
       document.getElementById('adminSection').style.display = 'none';
       document.getElementById('memberSection').style.display = 'none';
       document.getElementById('userProfileSection').style.display = 'block';
       
       try {
           // 第一步：数据迁移 - 确保用户数据已迁移到最新版本
           const migratedUser = migrateUserData(currentUser);
           
           // 第二步：清空表单 - 在填充数据前清空表单，确保是干净的画布
           resetFormFields();
           
           // 确保DOM操作完成后再进行数据填充
           setTimeout(() => {
               // 第三步：填充数据 - 使用迁移后的用户数据填充所有表单字段
           Logger.info('开始填充表单数据，用户信息:', {
               name: migratedUser.name,
               studentId: migratedUser.studentId,
               hasQuestionnaire: !!migratedUser.questionnaire
           });
           
           // 填充基本用户信息
           const nameInput = document.getElementById('name');
           const studentIdInput = document.getElementById('studentId');
           
           if (nameInput && studentIdInput) {
               nameInput.value = migratedUser.name || '';
               studentIdInput.value = migratedUser.studentId || '';
               Logger.info('基本信息填充成功:', {
                   name: nameInput.value,
                   studentId: studentIdInput.value
               });
           } else {
               Logger.warn('基本信息输入框未找到');
           }
           
           // 填充问卷信息 - 优先使用questionnaire中的数据，回退到根级别数据
           const questionnaire = migratedUser.questionnaire || {};
           Logger.info('问卷数据:', questionnaire);
           
           // 填充性别 - 优先使用questionnaire中的数据，回退到根级别数据
           const userGender = questionnaire.gender || migratedUser.gender;
           Logger.info('尝试填充性别:', userGender);
           
           if (userGender) {
               const genderRadios = document.querySelectorAll('input[name="gender"]');
               Logger.info('找到性别单选框数量:', genderRadios.length);
               
               genderRadios.forEach(radio => radio.checked = false); // 先清除所有选中状态
               const genderRadio = document.querySelector(`input[name="gender"][value="${userGender}"]`);
               if (genderRadio) {
                   genderRadio.checked = true;
                   Logger.info('性别填充成功:', userGender);
               } else {
                   Logger.warn(`未找到性别单选框：${userGender}`);
               }
           }
           
           // 填充匹配性别偏好
           const userMatchGenderPreference = questionnaire.matchGenderPreference || migratedUser.matchGenderPreference;
           Logger.info('尝试填充匹配性别偏好:', userMatchGenderPreference);
           
           if (userMatchGenderPreference) {
               const matchGenderRadios = document.querySelectorAll('input[name="matchGenderPreference"]');
               Logger.info('找到匹配性别偏好单选框数量:', matchGenderRadios.length);
               
               matchGenderRadios.forEach(radio => radio.checked = false); // 先清除所有选中状态
               const matchGenderRadio = document.querySelector(`input[name="matchGenderPreference"][value="${userMatchGenderPreference}"]`);
               if (matchGenderRadio) {
                   matchGenderRadio.checked = true;
                   Logger.info('匹配性别偏好填充成功:', userMatchGenderPreference);
               } else {
                   Logger.warn(`未找到匹配性别偏好单选框：${userMatchGenderPreference}`);
               }
           }
           
           // 填充匹配类型偏好
           const userMatchingTypePreference = questionnaire.matchingTypePreference || migratedUser.matchingTypePreference;
           Logger.info('尝试填充匹配类型偏好:', userMatchingTypePreference);
           
           if (userMatchingTypePreference) {
               const matchingTypeRadios = document.querySelectorAll('input[name="matchingTypePreference"]');
               Logger.info('找到匹配类型偏好单选框数量:', matchingTypeRadios.length);
               
               matchingTypeRadios.forEach(radio => radio.checked = false); // 先清除所有选中状态
               const matchingTypeRadio = document.querySelector(`input[name="matchingTypePreference"][value="${userMatchingTypePreference}"]`);
               if (matchingTypeRadio) {
                   matchingTypeRadio.checked = true;
                   Logger.info('匹配类型偏好填充成功:', userMatchingTypePreference);
               } else {
                   Logger.warn(`未找到匹配类型偏好单选框：${userMatchingTypePreference}`);
               }
           }
           
           // 填充书目类型（多选）
           const userBookCategories = questionnaire.bookCategories || migratedUser.bookCategories || [];
           Logger.info('尝试填充书目类型:', userBookCategories);
           
           const bookCategoryCheckboxes = document.querySelectorAll('input[name="bookCategories"]');
           Logger.info('找到书籍类别复选框数量:', bookCategoryCheckboxes.length);
           
           if (bookCategoryCheckboxes.length > 0) {
               // 先清除所有选中状态
               bookCategoryCheckboxes.forEach(cb => cb.checked = false);
               
               // 设置新的选中状态
               if (userBookCategories.length > 0) {
                   userBookCategories.forEach(category => {
                       const checkbox = document.querySelector(`input[name="bookCategories"][value="${category}"]`);
                       if (checkbox) {
                           checkbox.checked = true;
                           Logger.info('书籍类别填充成功:', category);
                       } else {
                           Logger.warn(`未找到书籍类别复选框：${category}`);
                       }
                   });
               }
           } else {
               Logger.warn('未找到书籍类别复选框组');
           }
       
           // 填充兴趣爱好和读过的书
           const userHobbies = questionnaire.hobbies || migratedUser.hobbies || [];
           const userBooks = questionnaire.books || migratedUser.books || [];
           Logger.info('尝试填充兴趣爱好:', userHobbies);
           Logger.info('尝试填充读过的书:', userBooks);
           
           const hobbiesInput = document.getElementById('hobbies');
           const booksInput = document.getElementById('books');
           
           if (hobbiesInput && booksInput) {
               hobbiesInput.value = userHobbies.join(', ');
               booksInput.value = userBooks.join(', ');
               Logger.info('兴趣爱好和读过的书填充成功');
           } else {
               Logger.warn('兴趣爱好或读过的书输入框未找到');
           }
           
           // 填充详细偏好
           const userDetailedPreferences = questionnaire.detailedBookPreferences || migratedUser.detailedBookPreferences || '';
           Logger.info('尝试填充详细偏好:', userDetailedPreferences);
           
           const detailedPreferencesInput = document.getElementById('detailedPreferences');
           if (detailedPreferencesInput) {
               if (userDetailedPreferences) {
                   detailedPreferencesInput.value = userDetailedPreferences;
                   // 触发字符计数器更新
                   try {
                       const event = new Event('input');
                       detailedPreferencesInput.dispatchEvent(event);
                   } catch (error) {
                       Logger.warn('触发详细偏好字符计数器更新失败:', error);
                   }
                   Logger.info('详细偏好填充成功');
               }
           } else {
               Logger.warn('详细偏好输入框未找到');
           }
           
           // 填充最爱书籍
           const userFavoriteBooks = questionnaire.favoriteBooks || migratedUser.favoriteBooks || [];
           Logger.info('尝试填充最爱书籍:', userFavoriteBooks);
           
           try {
               populateFavoriteBooks(userFavoriteBooks);
               Logger.info('最爱书籍填充成功');
           } catch (error) {
               Logger.error('填充最爱书籍失败:', error);
           }
           
           // 填充阅读预期
           const userReadingCommitment = questionnaire.readingCommitment || migratedUser.readingCommitment;
           Logger.info('尝试填充阅读预期:', userReadingCommitment);
           
           if (userReadingCommitment) {
               const commitmentRadios = document.querySelectorAll('input[name="readingCommitment"]');
               Logger.info('找到阅读预期单选框数量:', commitmentRadios.length);
               
               commitmentRadios.forEach(radio => radio.checked = false); // 先清除所有选中状态
               const commitmentRadio = document.querySelector(`input[name="readingCommitment"][value="${userReadingCommitment}"]`);
               if (commitmentRadio) {
                   commitmentRadio.checked = true;
                   Logger.info('阅读预期填充成功:', userReadingCommitment);
               } else {
                   Logger.warn(`未找到阅读预期单选框：${userReadingCommitment}`);
               }
           }
           
           Logger.info('表单预填充完成');
           
           // 第四步：渲染资料视图 - 在所有数据填充完成后渲染"我的资料"视图
           renderUserProfile();
           }, 100); // 给DOM操作100ms缓冲时间
           
       } catch (error) {
           Logger.error('表单预填充过程中发生错误:', error);
           alert('加载用户数据时发生错误，请刷新页面重试');
       }
   }
}

// 重置表单字段的辅助函数
function resetFormFields() {
   try {
       // 重置文本输入框
       ['name', 'studentId', 'hobbies', 'books', 'detailedPreferences'].forEach(id => {
           const input = document.getElementById(id);
           if (input) {
               input.value = '';
           }
       });
       
       // 重置单选按钮组
       ['gender', 'matchGenderPreference', 'matchingTypePreference', 'readingCommitment'].forEach(name => {
           const radios = document.querySelectorAll(`input[name="${name}"]`);
           radios.forEach(radio => radio.checked = false);
       });
       
       // 重置复选框组
       const checkboxes = document.querySelectorAll('input[name="bookCategories"]');
       checkboxes.forEach(cb => cb.checked = false);
       
       // 重置最爱书籍容器
       const favoriteBooks = document.getElementById('favoriteBooks');
       if (favoriteBooks) {
           favoriteBooks.innerHTML = '';
       }
       
       Logger.info('表单字段已重置');
   } catch (error) {
       Logger.error('重置表单字段时发生错误:', error);
   }
}

// 填充最爱书籍的辅助函数
function populateFavoriteBooks(favoriteBooks) {
   const container = document.getElementById('favoriteBooks');
   
   // 清空现有输入框
   container.innerHTML = '';
   
   // 确保至少有2个输入框
   const booksToShow = Math.max(2, favoriteBooks.length);
   
   for (let i = 0; i < booksToShow; i++) {
       const bookGroup = document.createElement('div');
       bookGroup.className = 'book-input-group';
       bookGroup.innerHTML = `
           <input type="text" placeholder="请输入书名" maxlength="100" value="${favoriteBooks[i] || ''}">
           <button type="button" class="remove-book" onclick="removeFavoriteBook(this)" style="display: none;">删除</button>
       `;
       container.appendChild(bookGroup);
   }
   
   // 更新删除按钮的显示状态
   updateBookInputsVisibility();
}

// 兴趣爱好分类和同义词库
const INTEREST_CATEGORIES = {
    '音乐': ['音乐', '古典音乐', '流行音乐', '摇滚音乐', '民谣', '爵士乐', '电子音乐', '说唱', '钢琴', '吉他', '小提琴', '唱歌', '作曲'],
    '文学': ['文学', '小说', '诗歌', '散文', '古典文学', '现代文学', '外国文学', '中国文学', '科幻小说', '推理小说', '言情小说', '历史小说', '写作', '阅读'],
    '艺术': ['艺术', '绘画', '素描', '油画', '水彩', '国画', '书法', '雕塑', '摄影', '设计', '美术', '插画', '动漫'],
    '运动': ['运动', '跑步', '游泳', '篮球', '足球', '羽毛球', '乒乓球', '网球', '健身', '瑜伽', '登山', '骑行', '滑雪', '武术'],
    '电影': ['电影', '看电影', '影视', '纪录片', '动画', '独立电影', '好莱坞', '欧洲电影', '亚洲电影', '导演', '编剧'],
    '科技': ['科技', '编程', '计算机', '人工智能', '数据科学', '机器学习', '网络安全', '区块链', '游戏开发', '前端', '后端'],
    '旅行': ['旅行', '旅游', '背包客', '自驾游', '出国', '摄影旅行', '户外', '探险', '徒步', '露营'],
    '美食': ['美食', '烹饪', '做饭', '烘焙', '品酒', '咖啡', '茶道', '日料', '西餐', '中餐', '甜品'],
    '心理学': ['心理学', '心理咨询', '认知科学', '行为分析', '社会心理学', '发展心理学', '临床心理学'],
    '历史': ['历史', '古代史', '近代史', '世界史', '中国史', '考古', '文物', '博物馆', '传统文化'],
    '哲学': ['哲学', '伦理学', '逻辑学', '形而上学', '认识论', '存在主义', '禅学', '思辨'],
    '科学': ['科学', '物理', '化学', '生物', '数学', '天文', '地理', '环境科学', '医学', '药学']
};

// 书籍分类库
const BOOK_CATEGORIES = {
    '文学经典': ['红楼梦', '西游记', '水浒传', '三国演义', '老人与海', '百年孤独', '追忆似水年华', '战争与和平', '罪与罚', '简爱', '傲慢与偏见'],
    '现代小说': ['活着', '平凡的世界', '白夜行', '解忧杂货店', '挪威的森林', '1984', '动物农场', '麦田里的守望者', '了不起的盖茨比'],
    '心理学': ['乌合之众', '影响力', '思考快与慢', '心理学与生活', '社会心理学', '人性的弱点', '冥想正念指南'],
    '历史传记': ['人类简史', '未来简史', '万历十五年', '明朝那些事儿', '史记', '资治通鉴', '苏东坡传', '梵高传'],
    '哲学思想': ['苏菲的世界', '存在与时间', '论语', '道德经', '庄子', '沉思录', '理想国', '尼采文集'],
    '科学科普': ['时间简史', '果壳中的宇宙', '自私的基因', '枪炮病菌与钢铁', '宇宙大爆炸', '相对论'],
    '商业管理': ['从优秀到卓越', '创新者的窘境', '精益创业', '原则', '金字塔原理', '麦肯锡方法'],
    '自我提升': ['高效能人士的七个习惯', '刻意练习', '原子习惯', '深度工作', '时间管理', '学会提问']
};

// AI驱动的智能匹配算法
async function getAiSimilarity(word1, word2) {
    if (!AI_BASE_URL || !AI_API_KEY) {
        return 0; // 如果未配置AI，则返回0
    }

    const systemPrompt = `You are an expert in judging the semantic similarity of words. Your task is to determine how similar two given words or phrases are in meaning. Respond ONLY with a JSON object containing a single key "similarity_score", with a value from 0.0 to 1.0, where 1.0 is identical meaning and 0.0 is completely unrelated.`;
    const userPrompt = JSON.stringify({ word1, word2 });

    try {
        const response = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('AI API Error:', response.status, await response.text());
            return 0;
        }

        const result = await response.json();
        const score = result.choices[0]?.message?.content;
        
        if (score) {
            const parsedScore = JSON.parse(score);
            return parsedScore.similarity_score || 0;
        }
        return 0;
    } catch (error) {
        console.error('Failed to fetch AI similarity:', error);
        return 0;
    }
}

// ===== 深度AI语义分析系统 =====

// 阅读人格画像分析
async function getReadingPersonalityProfile(userText, favoriteBooks = []) {
    if (!AI_BASE_URL || !AI_API_KEY || (!userText.trim() && favoriteBooks.length === 0)) {
        return { 
            personality_dimensions: {},
            reading_motivations: [],
            cognitive_style: 'unknown',
            confidence_score: 0
        };
    }

    const systemPrompt = `You are a reading psychology expert specializing in personality analysis through literary preferences. 

Analyze the user's reading personality based on their book preferences and descriptions. Evaluate these key dimensions:

1. **EXPLORATION vs CERTAINTY** (0.0-1.0): 
   - 0.0 = Prefers familiar genres/authors, sticks to proven favorites
   - 1.0 = Constantly seeks new genres, experimental works, diverse perspectives

2. **EMOTIONAL vs RATIONAL** (0.0-1.0):
   - 0.0 = Logic-driven, prefers factual/analytical content
   - 1.0 = Emotion-driven, seeks feeling and empathy in literature

3. **INTROSPECTIVE vs SOCIAL** (0.0-1.0):
   - 0.0 = Focuses on personal growth, inner psychological exploration
   - 1.0 = Interested in social issues, interpersonal dynamics, community

4. **ESCAPIST vs REALISTIC** (0.0-1.0):
   - 0.0 = Prefers realistic, contemporary settings
   - 1.0 = Seeks fantasy, sci-fi, alternative worlds for escape

5. **FAST_PACED vs CONTEMPLATIVE** (0.0-1.0):
   - 0.0 = Slow, meditative reading, philosophical depth
   - 1.0 = Action-packed, quick plot progression

Return JSON with:
{
  "personality_dimensions": {
    "exploration_vs_certainty": float,
    "emotional_vs_rational": float,
    "introspective_vs_social": float,
    "escapist_vs_realistic": float,
    "fast_paced_vs_contemplative": float
  },
  "reading_motivations": [array of motivation strings],
  "cognitive_style": "analytical|intuitive|creative|systematic",
  "aesthetic_preferences": {
    "language_style": "classical|modern|experimental",
    "narrative_structure": "linear|non_linear|fragmented",
    "emotional_tone": "light|serious|varied"
  },
  "cultural_orientation": "eastern|western|global|local",
  "confidence_score": float (0.0-1.0)
}`;

    const userPrompt = JSON.stringify({
        user_description: userText,
        favorite_books: favoriteBooks,
        analysis_focus: "deep_personality_profiling"
    });

    try {
        const response = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('AI Personality Analysis Error:', response.status, await response.text());
            return { personality_dimensions: {}, reading_motivations: [], cognitive_style: 'unknown', confidence_score: 0 };
        }

        const result = await response.json();
        const analysis = result.choices[0]?.message?.content;
        
        if (analysis) {
            return JSON.parse(analysis);
        }
        return { personality_dimensions: {}, reading_motivations: [], cognitive_style: 'unknown', confidence_score: 0 };
    } catch (error) {
        console.error('Failed to fetch personality analysis:', error);
        return { personality_dimensions: {}, reading_motivations: [], cognitive_style: 'unknown', confidence_score: 0 };
    }
}

// 隐含偏好挖掘分析
async function getImplicitPreferenceAnalysis(userText, favoriteBooks = [], bookCategories = []) {
    if (!AI_BASE_URL || !AI_API_KEY) {
        return { implicit_themes: [], hidden_patterns: [], literary_dna: {}, confidence_score: 0 };
    }

    const systemPrompt = `You are a literary data scientist expert in uncovering hidden reading patterns and implicit preferences.

Analyze the user's implicit preferences beyond obvious genre choices. Look for:

1. **HIDDEN THEMATIC PATTERNS**: Underlying themes that connect diverse book choices
2. **TEMPORAL PREFERENCES**: Historical periods, eras, time settings the user gravitates toward
3. **GEOGRAPHICAL/CULTURAL AFFINITIES**: Specific regions, cultures, or perspectives
4. **NARRATIVE ARCHETYPES**: Character types, story structures, conflict patterns
5. **PHILOSOPHICAL LEANINGS**: Worldviews, value systems reflected in book choices
6. **SENSORY/AESTHETIC PREFERENCES**: Language texture, pacing, atmospheric qualities

Return JSON with:
{
  "implicit_themes": [array of subtle themes user is drawn to],
  "hidden_patterns": [array of non-obvious connection patterns],
  "temporal_preferences": {
    "historical_periods": [preferred time periods],
    "contemporary_vs_classic": float (0.0=classic, 1.0=contemporary)
  },
  "cultural_affinities": [array of cultural/geographic preferences],
  "narrative_archetypes": [character types, story patterns user prefers],
  "philosophical_leanings": [underlying worldviews and values],
  "aesthetic_dna": {
    "language_texture": "sparse|rich|poetic|conversational",
    "emotional_register": "subtle|intense|varied|controlled",
    "complexity_preference": float (0.0=simple, 1.0=complex)
  },
  "confidence_score": float (0.0-1.0)
}`;

    const userPrompt = JSON.stringify({
        user_description: userText,
        favorite_books: favoriteBooks,
        selected_categories: bookCategories,
        analysis_depth: "implicit_pattern_mining"
    });

    try {
        const response = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('AI Implicit Analysis Error:', response.status, await response.text());
            return { implicit_themes: [], hidden_patterns: [], literary_dna: {}, confidence_score: 0 };
        }

        const result = await response.json();
        const analysis = result.choices[0]?.message?.content;
        
        if (analysis) {
            return JSON.parse(analysis);
        }
        return { implicit_themes: [], hidden_patterns: [], literary_dna: {}, confidence_score: 0 };
    } catch (error) {
        console.error('Failed to fetch implicit analysis:', error);
        return { implicit_themes: [], hidden_patterns: [], literary_dna: {}, confidence_score: 0 };
    }
}

// 深度兼容性匹配分析
async function getDeepCompatibilityAnalysis(user1Profile, user2Profile, user1Implicit, user2Implicit) {
    if (!AI_BASE_URL || !AI_API_KEY) {
        return { 
            compatibility_score: 0, 
            compatibility_dimensions: {},
            synergy_potential: [],
            growth_opportunities: [],
            reading_chemistry: 'unknown'
        };
    }

    const systemPrompt = `You are an expert in reading compatibility and literary relationship dynamics.

Analyze deep compatibility between two readers based on their personality profiles and implicit preferences. Calculate sophisticated compatibility across multiple dimensions:

1. **COGNITIVE SYNERGY**: How well their thinking styles complement each other
2. **AESTHETIC HARMONY**: Alignment in literary taste and style preferences  
3. **INTELLECTUAL GROWTH POTENTIAL**: Capacity to learn from each other
4. **EMOTIONAL RESONANCE**: Shared emotional wavelengths and empathy
5. **EXPLORATORY COMPATIBILITY**: Balance between similar interests and complementary differences

Calculate these compatibility types:
- **MIRROR COMPATIBILITY**: Similar personalities/preferences (comfort zone)
- **COMPLEMENTARY COMPATIBILITY**: Different but synergistic (growth zone)
- **BRIDGE COMPATIBILITY**: One can introduce the other to new territories

Return JSON with:
{
  "compatibility_score": float (0.0-1.0),
  "compatibility_dimensions": {
    "cognitive_synergy": float (0.0-1.0),
    "aesthetic_harmony": float (0.0-1.0),
    "growth_potential": float (0.0-1.0),
    "emotional_resonance": float (0.0-1.0),
    "exploratory_balance": float (0.0-1.0)
  },
  "compatibility_type": "mirror|complementary|bridge|complex",
  "synergy_potential": [array of potential benefits from this pairing],
  "growth_opportunities": [array of ways they could expand each other's horizons],
  "reading_chemistry": "explosive|steady|gentle|challenging|inspiring",
  "recommendation_confidence": float (0.0-1.0),
  "relationship_dynamics": "mentor_mentee|equal_explorers|complementary_guides|kindred_spirits"
}`;

    const userPrompt = JSON.stringify({
        user1: {
            personality: user1Profile,
            implicit_preferences: user1Implicit
        },
        user2: {
            personality: user2Profile,
            implicit_preferences: user2Implicit
        },
        analysis_type: "deep_compatibility_assessment"
    });

    try {
        const response = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('AI Deep Compatibility Error:', response.status, await response.text());
            return { compatibility_score: 0, compatibility_dimensions: {}, synergy_potential: [], growth_opportunities: [], reading_chemistry: 'unknown' };
        }

        const result = await response.json();
        const analysis = result.choices[0]?.message?.content;
        
        if (analysis) {
            return JSON.parse(analysis);
        }
        return { compatibility_score: 0, compatibility_dimensions: {}, synergy_potential: [], growth_opportunities: [], reading_chemistry: 'unknown' };
    } catch (error) {
        console.error('Failed to fetch deep compatibility analysis:', error);
        return { compatibility_score: 0, compatibility_dimensions: {}, synergy_potential: [], growth_opportunities: [], reading_chemistry: 'unknown' };
    }
}

// 智能文本偏好分析（升级版）
async function getAiTextPreferenceAnalysis(text1, text2) {
    if (!AI_BASE_URL || !AI_API_KEY || !text1.trim() || !text2.trim()) {
        return { similarity_score: 0, common_elements: [] };
    }

    const systemPrompt = `You are an expert in analyzing reading preferences and literary tastes with deep semantic understanding.

Analyze two users' detailed book preferences and determine their compatibility using advanced semantic analysis:

1. **SURFACE SIMILARITIES**: Direct matches in authors, genres, themes
2. **DEEP SEMANTIC CONNECTIONS**: Conceptual relationships, thematic resonances
3. **STYLISTIC AFFINITIES**: Shared appreciation for narrative techniques, language styles
4. **PSYCHOLOGICAL RESONANCES**: Similar emotional needs fulfilled by reading
5. **CULTURAL/TEMPORAL ALIGNMENTS**: Shared historical/geographic interests

Provide both quantitative scores and qualitative insights.

Return JSON with:
{
  "similarity_score": float (0.0-1.0),
  "semantic_depth_score": float (0.0-1.0),
  "common_elements": [array of shared preferences],
  "deep_connections": [array of non-obvious thematic/stylistic links],
  "analysis_details": "detailed explanation of compatibility",
  "recommendation_reasons": [specific reasons why they'd be good reading partners],
  "potential_book_recommendations": [books both might enjoy together],
  "growth_potential": "how they could expand each other's reading horizons"
}`;

    const userPrompt = JSON.stringify({ 
        preference1: text1, 
        preference2: text2,
        analysis_mode: "deep_semantic_compatibility"
    });

    try {
        const response = await fetch(AI_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify({
                model: AI_MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('AI Text Preference API Error:', response.status, await response.text());
            return { similarity_score: 0, common_elements: [] };
        }

        const result = await response.json();
        const analysis = result.choices[0]?.message?.content;
        
        if (analysis) {
            const parsedAnalysis = JSON.parse(analysis);
            return {
                similarity_score: parsedAnalysis.similarity_score || 0,
                semantic_depth_score: parsedAnalysis.semantic_depth_score || 0,
                common_elements: parsedAnalysis.common_elements || [],
                deep_connections: parsedAnalysis.deep_connections || [],
                analysis_details: parsedAnalysis.analysis_details || '',
                recommendation_reasons: parsedAnalysis.recommendation_reasons || [],
                potential_book_recommendations: parsedAnalysis.potential_book_recommendations || [],
                growth_potential: parsedAnalysis.growth_potential || ''
            };
        }
        return { similarity_score: 0, common_elements: [] };
    } catch (error) {
        console.error('Failed to fetch AI text preference analysis:', error);
        return { similarity_score: 0, common_elements: [] };
    }
}

// 阅读承诺兼容性评分
function calculateReadingCommitmentCompatibility(commitment1, commitment2) {
    if (!commitment1 || !commitment2) {
        return { score: 0, compatibility: 'unknown' };
    }

    // 阅读承诺等级映射
    const commitmentLevels = {
        'light': 1,      // 轻松阅读
        'medium': 2,     // 适中阅读  
        'intensive': 3,  // 深度阅读
        'epic': 4        // 史诗阅读
    };

    const level1 = commitmentLevels[commitment1];
    const level2 = commitmentLevels[commitment2];
    
    if (!level1 || !level2) {
        return { score: 0, compatibility: 'unknown' };
    }

    const difference = Math.abs(level1 - level2);
    
    // 基于差异计算兼容性分数和描述
    switch (difference) {
        case 0:
            return { 
                score: 1.0, 
                compatibility: 'perfect',
                description: '完全一致的阅读量期望'
            };
        case 1:
            return { 
                score: 0.7, 
                compatibility: 'good',
                description: '相近的阅读量期望'
            };
        case 2:
            return { 
                score: 0.4, 
                compatibility: 'moderate',
                description: '中等程度的阅读量差异'
            };
        case 3:
            return { 
                score: 0.1, 
                compatibility: 'poor',
                description: '较大的阅读量期望差异'
            };
        default:
            return { score: 0, compatibility: 'incompatible' };
    }
}

// 深度智能匹配算法（升级版）
// ===== 已弃用的匹配算法 (保留用于向后兼容) =====
// 注意：此函数已被 calculateAICompatibility 替代，不建议使用
async function calculateSimilarity_deprecated(member1, member2) {
    const result = {
        score: 0,
        commonHobbies: [],
        commonBooks: [],
        detailLevel: { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 },
        readingCommitmentCompatibility: null,
        textPreferenceAnalysis: null,
        // 新增深度分析结果
        personalityProfiles: {
            member1: null,
            member2: null
        },
        implicitAnalysis: {
            member1: null,
            member2: null
        },
        deepCompatibilityAnalysis: null,
        matchingDimensions: {
            traditional_similarity: 0,      // 传统相似度
            personality_compatibility: 0,   // 人格兼容度
            implicit_resonance: 0,         // 隐含共鸣
            growth_potential: 0,           // 成长潜力
            overall_chemistry: 0           // 整体化学反应
        }
    };

    // 确保用户数据已迁移到最新版本
    const migratedMember1 = migrateUserData(member1);
    const migratedMember2 = migrateUserData(member2);

    // ===== 数据完整性检查 =====
    const hobbies1 = migratedMember1.questionnaire.hobbies || migratedMember1.hobbies || [];
    const hobbies2 = migratedMember2.questionnaire.hobbies || migratedMember2.hobbies || [];
    const books1 = migratedMember1.questionnaire.books || migratedMember1.books || [];
    const books2 = migratedMember2.questionnaire.books || migratedMember2.books || [];
    const text1 = migratedMember1.questionnaire.detailedBookPreferences || migratedMember1.detailedBookPreferences || '';
    const text2 = migratedMember2.questionnaire.detailedBookPreferences || migratedMember2.detailedBookPreferences || '';
    
    // 计算数据完整性分数（0-1之间）
    const dataCompleteness1 = (
        (hobbies1.length > 0 ? 0.3 : 0) +
        (books1.length > 0 ? 0.3 : 0) + 
        (text1.trim().length > 0 ? 0.4 : 0)
    );
    const dataCompleteness2 = (
        (hobbies2.length > 0 ? 0.3 : 0) +
        (books2.length > 0 ? 0.3 : 0) + 
        (text2.trim().length > 0 ? 0.4 : 0)
    );
    
    // 如果两个用户的数据完整性都很低，直接返回低分
    const minDataCompleteness = Math.min(dataCompleteness1, dataCompleteness2);
    if (minDataCompleteness < 0.3) {
        result.score = minDataCompleteness * 2; // 最多给0.6分
        return result;
    }

    // ===== 阶段1: 传统匹配分析 =====
    
    // 1. 传统兴趣爱好匹配
    const hobbyResult = await calculateSmartMatches(
        hobbies1,
        hobbies2, 
        INTEREST_CATEGORIES
    );
    result.commonHobbies = hobbyResult.matches;
    result.detailLevel.exactMatches += hobbyResult.exactMatches;
    result.detailLevel.semanticMatches += hobbyResult.semanticMatches;
    result.detailLevel.categoryMatches += hobbyResult.categoryMatches;

    // 2. 传统书籍匹配
    const bookResult = await calculateSmartMatches(
        books1,
        books2, 
        BOOK_CATEGORIES
    );
    result.commonBooks = bookResult.matches;
    result.detailLevel.exactMatches += bookResult.exactMatches;
    result.detailLevel.semanticMatches += bookResult.semanticMatches;
    result.detailLevel.categoryMatches += bookResult.categoryMatches;

    // 3. 最爱书籍匹配（增强字段）
    if (migratedMember1.questionnaire.favoriteBooks && migratedMember2.questionnaire.favoriteBooks) {
        const favoriteBookResult = await calculateSmartMatches(
            migratedMember1.questionnaire.favoriteBooks,
            migratedMember2.questionnaire.favoriteBooks,
            BOOK_CATEGORIES
        );
        result.commonBooks.push(...favoriteBookResult.matches.map(m => ({ ...m, source: 'favorite' })));
        result.detailLevel.exactMatches += favoriteBookResult.exactMatches;
        result.detailLevel.semanticMatches += favoriteBookResult.semanticMatches;
        result.detailLevel.categoryMatches += favoriteBookResult.categoryMatches;
    }

    // 4. 阅读承诺兼容性匹配
    result.readingCommitmentCompatibility = calculateReadingCommitmentCompatibility(
        migratedMember1.questionnaire.readingCommitment || migratedMember1.readingCommitment,
        migratedMember2.questionnaire.readingCommitment || migratedMember2.readingCommitment
    );

    // 5. 升级版详细书籍偏好AI文本分析（仅在AI启用时）
    if (text1.trim() && text2.trim() && aiAnalysisEnabled) {
        result.textPreferenceAnalysis = await getAiTextPreferenceAnalysis(text1, text2);
    }

    // 计算传统维度分数
    result.matchingDimensions.traditional_similarity = 
        (hobbyResult.score + bookResult.score + 
         (result.commonBooks.filter(b => b.source === 'favorite').length * 1.2) +
         (result.readingCommitmentCompatibility?.score || 0) * 0.8 +
         (result.textPreferenceAnalysis?.similarity_score || 0) * 1.5);

    // ===== 阶段2: 深度AI人格分析（仅在AI启用时） =====
    
    if (aiAnalysisEnabled) {
        // 构建每个用户的完整阅读档案
        const getUserReadingProfile = (member) => ({
            description: member.questionnaire.detailedBookPreferences || member.detailedBookPreferences || '',
            favoriteBooks: member.questionnaire.favoriteBooks || member.favoriteBooks || [],
            bookCategories: member.questionnaire.bookCategories || member.bookCategories || [],
            hobbies: member.questionnaire.hobbies || member.hobbies || []
        });

        const profile1 = getUserReadingProfile(migratedMember1);
        const profile2 = getUserReadingProfile(migratedMember2);

        // 并行执行深度AI分析以提高性能
        const [personality1, personality2, implicit1, implicit2] = await Promise.all([
            getReadingPersonalityProfile(profile1.description, profile1.favoriteBooks),
            getReadingPersonalityProfile(profile2.description, profile2.favoriteBooks),
            getImplicitPreferenceAnalysis(profile1.description, profile1.favoriteBooks, profile1.bookCategories),
            getImplicitPreferenceAnalysis(profile2.description, profile2.favoriteBooks, profile2.bookCategories)
        ]);

        result.personalityProfiles.member1 = personality1;
        result.personalityProfiles.member2 = personality2;
        result.implicitAnalysis.member1 = implicit1;
        result.implicitAnalysis.member2 = implicit2;

        // ===== 阶段3: 深度兼容性分析 =====
        
        if (personality1.confidence_score > 0.3 && personality2.confidence_score > 0.3) {
            result.deepCompatibilityAnalysis = await getDeepCompatibilityAnalysis(
                personality1, personality2, implicit1, implicit2
            );

            // 计算各个深度维度分数
            if (result.deepCompatibilityAnalysis.compatibility_score > 0) {
                const compatDimensions = result.deepCompatibilityAnalysis.compatibility_dimensions || {};
                
                result.matchingDimensions.personality_compatibility = 
                    (compatDimensions.cognitive_synergy || 0) * 2 +
                    (compatDimensions.emotional_resonance || 0) * 1.5;
                    
                result.matchingDimensions.implicit_resonance = 
                    (compatDimensions.aesthetic_harmony || 0) * 2 +
                    (compatDimensions.exploratory_balance || 0) * 1.3;
                    
                result.matchingDimensions.growth_potential = 
                    (compatDimensions.growth_potential || 0) * 2.5;
                    
                result.matchingDimensions.overall_chemistry = 
                    result.deepCompatibilityAnalysis.compatibility_score * 3;
            }
        }
        // ===== 阶段4: 智能权重计算最终分数 =====
        
        // 数据完整性调节因子（基于两个用户的平均数据完整性）
        const avgDataCompleteness = (dataCompleteness1 + dataCompleteness2) / 2;
        const dataCompletenessMultiplier = Math.min(avgDataCompleteness + 0.2, 1.0); // 最低0.2，最高1.0
        
        // 动态权重分配（基于数据质量和置信度）
        const weights = {
            traditional: 1.0 * dataCompletenessMultiplier,
            personality: (result.personalityProfiles.member1?.confidence_score || 0) * (result.personalityProfiles.member2?.confidence_score || 0) * 1.5 * dataCompletenessMultiplier,
            implicit: ((result.implicitAnalysis.member1?.confidence_score || 0) + (result.implicitAnalysis.member2?.confidence_score || 0)) / 2 * 1.2 * dataCompletenessMultiplier,
            growth: (result.deepCompatibilityAnalysis?.recommendation_confidence || 0.5) * dataCompletenessMultiplier,
            chemistry: (result.deepCompatibilityAnalysis?.recommendation_confidence || 0.5) * dataCompletenessMultiplier
        };

        // 计算加权总分
        result.score =
            result.matchingDimensions.traditional_similarity * weights.traditional +
            result.matchingDimensions.personality_compatibility * weights.personality +
            result.matchingDimensions.implicit_resonance * weights.implicit +
            result.matchingDimensions.growth_potential * weights.growth +
            result.matchingDimensions.overall_chemistry * weights.chemistry;

        // 应用数据完整性最终调节
        result.score = result.score * dataCompletenessMultiplier;
        
    } else {
        // AI关闭时的传统分数计算
        result.score = result.matchingDimensions.traditional_similarity;
    }

    // 标准化分数到合理范围
    result.score = Math.min(result.score, 10); // 设置上限

    return result;
}

async function calculateSmartMatches(list1, list2, categories) {
    const matches = [];
    let score = 0;
    let exactMatches = 0;
    let semanticMatches = 0;
    let categoryMatches = 0;
    const processedPairs = new Set();

    // 1. 精确匹配 (权重: 1.0)
    for (const item1 of list1) {
        for (const item2 of list2) {
            if (item1 === item2) {
                matches.push({ item: item1, type: 'exact', weight: 1.0 });
                score += 1.0;
                exactMatches++;
                processedPairs.add(`${item1}|${item2}`);
            }
        }
    }

    // 2. AI 语义匹配 (权重: AI分数 * 0.8) - 仅在AI启用时执行
    if (aiAnalysisEnabled) {
        const SIMILARITY_THRESHOLD = 0.6; // 相似度阈值
        for (const item1 of list1) {
            for (const item2 of list2) {
                const pairKey1 = `${item1}|${item2}`;
                const pairKey2 = `${item2}|${item1}`;
                if (item1 !== item2 && !processedPairs.has(pairKey1) && !processedPairs.has(pairKey2)) {
                    const aiScore = await getAiSimilarity(item1, item2);
                    if (aiScore > SIMILARITY_THRESHOLD) {
                        const weightedScore = aiScore * 0.8;
                        matches.push({
                            item: `${item1} ≈ ${item2} (${aiScore.toFixed(2)})`,
                            type: 'semantic',
                            weight: weightedScore
                        });
                        score += weightedScore;
                        semanticMatches++;
                    }
                    processedPairs.add(pairKey1);
                    processedPairs.add(pairKey2);
                }
            }
        }
    }

    // 3. 同类别匹配 (权重: 0.6)
    for (const [category, keywords] of Object.entries(categories)) {
        const inCategory1 = list1.some(item => keywords.includes(item));
        const inCategory2 = list2.some(item => keywords.includes(item));

        if (inCategory1 && inCategory2) {
            // 检查是否已有更精确的匹配
            const hasMoreSpecificMatch = matches.some(m => {
                const items = m.item.split(' ≈ ');
                return keywords.includes(items[0]) || keywords.includes(items[1]);
            });

            if (!hasMoreSpecificMatch) {
                matches.push({
                    item: `${category}类兴趣`,
                    type: 'category',
                    weight: 0.6
                });
                score += 0.6;
                categoryMatches++;
            }
        }
    }

    return { matches, score, exactMatches, semanticMatches, categoryMatches };
}

// 检查两个用户是否符合性别偏好匹配
function checkGenderPreferenceMatch(user1, user2) {
    // 确保用户数据已迁移
    const migratedUser1 = migrateUserData(user1);
    const migratedUser2 = migrateUserData(user2);
    
    const user1Gender = migratedUser1.questionnaire.gender;
    const user2Gender = migratedUser2.questionnaire.gender;
    const user1Preference = migratedUser1.questionnaire.matchGenderPreference;
    const user2Preference = migratedUser2.questionnaire.matchGenderPreference;
    
    // 如果任一用户没有设置偏好，则不进行过滤
    if (!user1Preference || !user2Preference) {
        return true;
    }
    
    // 如果任一用户偏好是"不介意"，则匹配
    if (user1Preference === 'no_preference' || user2Preference === 'no_preference') {
        return true;
    }
    
    // 如果任一用户没有填写性别，则不进行过滤（避免排除没填性别的用户）
    if (!user1Gender || !user2Gender) {
        return true;
    }
    
    // 检查双向匹配：user1希望匹配user2的性别，且user2希望匹配user1的性别
    const user1WantsUser2 = (user1Preference === user2Gender);
    const user2WantsUser1 = (user2Preference === user1Gender);
    
    return user1WantsUser2 && user2WantsUser1;
}

// ===== 降级策略辅助函数 =====

/**
 * 获取分析模式标签
 */
function getAnalysisModeLabel(result) {
    if (result.degraded) {
        return `AI降级→传统`;
    } else if (result.traditionalMode) {
        return '传统';
    } else if (result.healthDegraded) {
        return '传统(降级)';
    } else if (result.analysis?.ai_analysis) {
        return 'AI智能';
    }
    return '传统';
}

/**
 * 获取分析模式
 */
function getAnalysisMode(result) {
    if (result.analysis?.ai_analysis && !result.degraded) {
        return 'ai';
    } else if (result.degraded) {
        return 'ai_degraded';
    } else if (result.healthDegraded) {
        return 'traditional_degraded';
    }
    return 'traditional';
}

/**
 * 从结果中获取字段（兼容AI和传统模式）
 */
function getFieldFromResult(result, fieldName) {
    if (result.analysis?.[fieldName]) {
        return result.analysis[fieldName];
    } else if (result[fieldName]) {
        return result[fieldName];
    }
    
    // 默认值
    const defaults = {
        'commonHobbies': [],
        'commonBooks': [],
        'detailLevel': { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 }
    };
    
    return defaults[fieldName] || null;
}

/**
 * 获取匹配类型
 */
function getMatchTypeFromResult(result) {
    if (result.analysis?.ai_analysis?.match_type) {
        return result.analysis.ai_analysis.match_type;
    } else if (result.degraded) {
        return '降级匹配';
    } else if (result.traditionalMode) {
        return '传统匹配';
    }
    return '未知类型';
}

/**
 * 手动重置API健康状态（管理员功能）
 */
function resetApiHealth() {
    if (!hasPermission('api_management')) {
        alert('权限不足');
        return;
    }
    
    const confirmed = confirm('确定要重置API健康状态吗？这将清除所有错误记录并退出降级模式。');
    if (confirmed) {
        apiHealthMonitor.forceReset();
        alert('API健康状态已重置');
    }
}

/**
 * 检查和显示API健康状态（管理员功能）
 */
function showApiHealthStatus() {
    if (!hasPermission('api_management')) {
        alert('权限不足');
        return;
    }
    
    const status = apiHealthMonitor.getDegradationStatus();
    const healthInfo = `
📊 API健康状态报告
================
🔧 总体状态: ${status.degraded ? '⚠️ 降级模式' : '✅ 正常'}
🎯 AI分析开关: ${aiAnalysisEnabled ? '🟢 开启' : '🔴 关闭'}
📈 成功请求: ${apiHealthMonitor.successCount}
❌ 失败请求: ${apiHealthMonitor.errorCount}
🔄 连续错误: ${status.consecutiveErrors}
📊 错误率: ${(status.errorRate * 100).toFixed(1)}%
⏱️ 当前批次大小: ${apiHealthMonitor.currentBatchSize}

${status.degraded ? `
⚠️ 降级模式详情:
📅 开始时间: ${new Date(status.startTime).toLocaleString()}
⏰ 持续时间: ${Math.round(status.duration / 1000)}秒
🔄 可恢复: ${status.canRecover ? '是' : '否'}
` : ''}
================
    `.trim();
    
    alert(healthInfo);
}

// ===== 匹配标题和状态生成函数 =====

/**
 * 生成智能匹配标题（考虑降级状态）
 */
function getMatchingTitle(matches, type) {
    const status = apiHealthMonitor.getDegradationStatus();
    const degradedCount = matches.filter(m => m.degraded).length;
    const traditionalCount = matches.filter(m => m.traditionalMode || m.healthDegraded).length;
    
    let baseTitle = type === 'similar' ? '🎯 相似搭档推荐' : '🌱 互补搭档推荐';
    let subtitle = '';
    
    if (status.degraded) {
        baseTitle = `⚠️ ${baseTitle} (降级模式)`;
        subtitle = `系统已切换到传统算法 | 降级时长: ${Math.round(status.duration/1000)}秒`;
    } else if (!aiAnalysisEnabled) {
        baseTitle = `📊 传统算法${baseTitle.substring(2)}`;
        subtitle = 'AI分析已关闭，使用传统匹配算法';
    } else if (degradedCount > 0) {
        baseTitle = `🔀 混合模式${baseTitle.substring(2)}`;
        subtitle = `智能AI分析 + 传统算法降级 | ${degradedCount}/${matches.length} 个配对降级`;
    } else {
        baseTitle = `🧠 深度智能${baseTitle.substring(2)}`;
        subtitle = 'AI驱动的高级语义分析匹配';
    }
    
    return { title: baseTitle, subtitle };
}

/**
 * 获取匹配项的样式类
 */
function getMatchItemClass(match) {
    let classes = ['match-item'];
    
    if (match.degraded) {
        classes.push('degraded-match');
    } else if (match.traditionalMode || match.healthDegraded) {
        classes.push('traditional-match');
    }
    
    return classes.join(' ');
}

/**
 * 生成匹配状态标签
 */
function generateMatchStatusTags(match) {
    let tags = [];
    
    if (match.degraded) {
        tags.push(`<span class="tag degraded-tag">AI降级→传统</span>`);
    } else if (match.healthDegraded) {
        tags.push(`<span class="tag traditional-degraded-tag">传统(降级)</span>`);
    } else if (match.traditionalMode) {
        tags.push(`<span class="tag category-tag">传统算法</span>`);
    } else if (match.aiAnalysis) {
        tags.push(`<span class="tag ai-analysis-tag">AI智能</span>`);
        if (match.confidenceLevel) {
            tags.push(`<span class="tag score-tag">置信度: ${(match.confidenceLevel * 100).toFixed(0)}%</span>`);
        }
    }
    
    if (match.analysisMode) {
        const modeLabels = {
            'ai': '🧠 AI模式',
            'ai_degraded': '🔀 AI降级',
            'traditional_degraded': '📊 传统降级',
            'traditional': '📊 传统模式',
            'error': '❌ 分析错误'
        };
        const modeLabel = modeLabels[match.analysisMode] || match.analysisMode;
        // 只在没有其他状态标签时显示模式标签
        if (tags.length === 0) {
            tags.push(`<span class="tag ai-element-tag">${modeLabel}</span>`);
        }
    }
    
    return tags.join(' ');
}

// ===== 用户匹配类型偏好调整AI分析分数 =====

// 用户画像缓存
const userProfileCache = new Map();

/**
 * 创建标准化的用户画像，用于AI匹配分析
 * @param {Object} user - 用户数据
 * @returns {Object} 标准化的用户画像
 */
function createUserProfile(user) {
    // 检查缓存
    const userId = user.id || user.name;
    if (userProfileCache.has(userId)) {
        return userProfileCache.get(userId);
    }
    
    const migratedUser = migrateUserData(user);
    const questionnaire = migratedUser.questionnaire || {};
    
    // 数据完整性评估
    const hasBasicInfo = !!(migratedUser.name && migratedUser.studentId);
    const hasInterests = !!(questionnaire.hobbies && questionnaire.hobbies.length > 0) || 
                        !!(migratedUser.hobbies && migratedUser.hobbies.length > 0);
    const hasBooks = !!(questionnaire.books && questionnaire.books.length > 0) || 
                    !!(migratedUser.books && migratedUser.books.length > 0);
    const hasFavoriteBooks = !!(questionnaire.favoriteBooks && questionnaire.favoriteBooks.length > 0);
    const hasDetailedPrefs = !!(questionnaire.detailedBookPreferences && questionnaire.detailedBookPreferences.trim());
    const hasReadingCommitment = !!questionnaire.readingCommitment;
    const hasGender = !!questionnaire.gender;
    const hasBookCategories = !!(questionnaire.bookCategories && questionnaire.bookCategories.length > 0);
    
    // 计算数据完整性分数 (0-1)
    const completenessScore = (
        (hasBasicInfo ? 0.1 : 0) +
        (hasInterests ? 0.15 : 0) +
        (hasBooks ? 0.15 : 0) +
        (hasFavoriteBooks ? 0.2 : 0) +
        (hasDetailedPrefs ? 0.2 : 0) +
        (hasReadingCommitment ? 0.1 : 0) +
        (hasGender ? 0.05 : 0) +
        (hasBookCategories ? 0.05 : 0)
    );
    
    const profile = {
        // 基本信息
        basic_info: {
            name: migratedUser.name || '',
            student_id: migratedUser.studentId || '',
            gender: questionnaire.gender || '',
            join_date: migratedUser.joinDate || ''
        },
        
        // 兴趣爱好
        interests: {
            hobbies: questionnaire.hobbies || migratedUser.hobbies || [],
            count: (questionnaire.hobbies || migratedUser.hobbies || []).length
        },
        
        // 阅读偏好
        reading_preferences: {
            book_categories: questionnaire.bookCategories || [],
            favorite_books: questionnaire.favoriteBooks || [],
            general_books: questionnaire.books || migratedUser.books || [],
            detailed_preferences: questionnaire.detailedBookPreferences || '',
            reading_commitment: questionnaire.readingCommitment || '',
            reading_habits: questionnaire.readingHabits || {}
        },
        
        // 匹配偏好
        matching_preferences: {
            gender_preference: questionnaire.matchGenderPreference || '',
            matching_type_preference: questionnaire.matchingTypePreference || ''
        },
        
        // 数据质量指标
        data_quality: {
            completeness_score: completenessScore,
            has_basic_info: hasBasicInfo,
            has_interests: hasInterests,
            has_reading_data: hasBooks || hasFavoriteBooks,
            has_detailed_preferences: hasDetailedPrefs,
            data_version: questionnaire.version || '1.0'
        }
    };
    
    // 缓存用户画像
    userProfileCache.set(userId, profile);
    
    return profile;
}

// ===== API优化工具函数 =====

// 请求缓存管理
const requestCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存

// ===== 内存使用优化配置 =====
const MEMORY_CONFIG = {
    MAX_CACHE_SIZE: 1000,        // 最大缓存条目数
    MAX_PROFILE_CACHE_SIZE: 500, // 最大用户画像缓存数
    CHUNK_SIZE: 50,              // 每个处理块的大小
    GC_INTERVAL: 10 * 60 * 1000, // 垃圾回收间隔（10分钟）
    MEMORY_WARNING_THRESHOLD: 0.8 // 内存警告阈值（80%）
};

// 内存使用监控
const memoryMonitor = {
    lastGCTime: Date.now(),
    cacheHits: 0,
    cacheMisses: 0,
    
    checkMemoryUsage() {
        // 检查缓存大小
        if (requestCache.size > MEMORY_CONFIG.MAX_CACHE_SIZE) {
            this.cleanupOldestEntries(requestCache, MEMORY_CONFIG.MAX_CACHE_SIZE * 0.7);
        }
        
        if (userProfileCache.size > MEMORY_CONFIG.MAX_PROFILE_CACHE_SIZE) {
            this.cleanupOldestEntries(userProfileCache, MEMORY_CONFIG.MAX_PROFILE_CACHE_SIZE * 0.7);
        }
        
        // 定期垃圾回收
        if (Date.now() - this.lastGCTime > MEMORY_CONFIG.GC_INTERVAL) {
            this.performGarbageCollection();
            this.lastGCTime = Date.now();
        }
    },
    
    cleanupOldestEntries(cache, targetSize) {
        const entries = Array.from(cache.entries());
        // 如果是requestCache，按时间戳排序
        if (cache === requestCache) {
            entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
        }
        
        // 删除最旧的条目
        const deleteCount = cache.size - targetSize;
        for (let i = 0; i < deleteCount; i++) {
            cache.delete(entries[i][0]);
        }
        
        console.log(`清理缓存：删除了 ${deleteCount} 个旧条目`);
        
        // 如果删除的条目过多，记录内存警告
        if (deleteCount > targetSize * 0.5) {
            errorMonitoringSystem.logError('MEMORY_WARNING', {
                deletedItems: deleteCount,
                targetSize,
                cacheType: cache === requestCache ? 'requestCache' : 'profileCache'
            });
        }
    },
    
    performGarbageCollection() {
        // 清理过期的请求缓存
        const now = Date.now();
        let expiredCount = 0;
        
        for (const [key, value] of requestCache.entries()) {
            if (!isValidCache(value)) {
                requestCache.delete(key);
                expiredCount++;
            }
        }
        
        if (expiredCount > 0) {
            console.log(`垃圾回收：清理了 ${expiredCount} 个过期缓存条目`);
        }
        
        // 强制垃圾回收（如果可用），移除对Node.js `global` 的引用以修复浏览器错误
        if (typeof window !== 'undefined' && typeof window.gc === 'function') {
            window.gc();
        }
    },
    
    getCacheStats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0 
            ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)
            : 0;
            
        return {
            requestCacheSize: requestCache.size,
            profileCacheSize: userProfileCache.size,
            cacheHitRate: `${hitRate}%`,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses
        };
    }
};

// ===== 高级错误监控与恢复系统 =====

// 错误类型分类
const ERROR_TYPES = {
    NETWORK_ERROR: 'network_error',
    RATE_LIMIT: 'rate_limit', 
    API_UNAVAILABLE: 'api_unavailable',
    TIMEOUT: 'timeout',
    AUTHENTICATION: 'authentication',
    QUOTA_EXCEEDED: 'quota_exceeded',
    SERVER_ERROR: 'server_error',
    PARSING_ERROR: 'parsing_error',
    UNKNOWN: 'unknown'
};

// 错误恢复策略配置
const RECOVERY_STRATEGIES = {
    [ERROR_TYPES.NETWORK_ERROR]: {
        maxRetries: 3,
        baseDelay: 2000,
        backoffMultiplier: 2,
        canRecover: true,
        criticalLevel: 'medium'
    },
    [ERROR_TYPES.RATE_LIMIT]: {
        maxRetries: 5,
        baseDelay: 5000,
        backoffMultiplier: 2,
        canRecover: true,
        criticalLevel: 'high'
    },
    [ERROR_TYPES.API_UNAVAILABLE]: {
        maxRetries: 2,
        baseDelay: 10000,
        backoffMultiplier: 3,
        canRecover: false,
        criticalLevel: 'critical'
    },
    [ERROR_TYPES.TIMEOUT]: {
        maxRetries: 2,
        baseDelay: 3000,
        backoffMultiplier: 2,
        canRecover: true,
        criticalLevel: 'medium'
    },
    [ERROR_TYPES.AUTHENTICATION]: {
        maxRetries: 1,
        baseDelay: 1000,
        backoffMultiplier: 1,
        canRecover: false,
        criticalLevel: 'critical'
    },
    [ERROR_TYPES.QUOTA_EXCEEDED]: {
        maxRetries: 0,
        baseDelay: 30000,
        backoffMultiplier: 1,
        canRecover: false,
        criticalLevel: 'critical'
    },
    [ERROR_TYPES.SERVER_ERROR]: {
        maxRetries: 2,
        baseDelay: 5000,
        backoffMultiplier: 2,
        canRecover: true,
        criticalLevel: 'high'
    },
    [ERROR_TYPES.PARSING_ERROR]: {
        maxRetries: 1,
        baseDelay: 1000,
        backoffMultiplier: 1,
        canRecover: true,
        criticalLevel: 'low'
    },
    [ERROR_TYPES.UNKNOWN]: {
        maxRetries: 2,
        baseDelay: 2000,
        backoffMultiplier: 2,
        canRecover: true,
        criticalLevel: 'medium'
    }
};


// ===== 全面错误监控与恢复系统 =====

/**
 * 增强型错误监控系统 - 阶段3.2
 * 提供全面的错误分类、健康监控、自动恢复和实时统计
 */
const errorMonitoringSystem = {
    // 错误分类与计数
    errorCategories: {
        API_RATE_LIMIT: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'high',
            description: 'API速率限制',
            recoveryAction: 'exponential_backoff'
        },
        API_NETWORK_ERROR: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'medium',
            description: 'API网络错误',
            recoveryAction: 'retry_with_delay'
        },
        AI_PARSING_ERROR: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'medium',
            description: 'AI返回解析错误',
            recoveryAction: 'fallback_traditional'
        },
        AI_TIMEOUT_ERROR: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'high',
            description: 'AI请求超时',
            recoveryAction: 'reduce_batch_size'
        },
        CACHE_ERROR: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'low',
            description: '缓存系统错误',
            recoveryAction: 'cache_cleanup'
        },
        MEMORY_WARNING: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'medium',
            description: '内存使用警告',
            recoveryAction: 'garbage_collection'
        },
        USER_DATA_ERROR: { 
            count: 0, 
            lastOccurred: null, 
            severity: 'low',
            description: '用户数据不完整',
            recoveryAction: 'skip_processing'
        }
    },
    
    // 实时系统健康状态
    systemHealth: {
        overall: 'healthy',        // healthy, degraded, critical, maintenance
        api: 'operational',        // operational, degraded, down
        cache: 'operational',      // operational, degraded, disabled
        memory: 'optimal',         // optimal, warning, critical
        lastHealthCheck: Date.now(),
        consecutiveHealthChecks: 0,
        isRecovering: false,
        recoveryStartTime: null
    },
    
    // 监控配置
    config: {
        HEALTH_CHECK_INTERVAL: 2 * 60 * 1000,     // 2分钟健康检查
        ERROR_WINDOW_SIZE: 100,               // 错误率计算窗口
        CRITICAL_ERROR_THRESHOLD: 10,         // 严重错误阈值
        RECOVERY_SUCCESS_THRESHOLD: 5,        // 恢复成功阈值
        MEMORY_WARNING_THRESHOLD: 0.8,        // 内存警告阈值
        CACHE_HIT_RATE_WARNING: 0.3,          // 缓存命中率警告线
        MAX_ERROR_LOG_SIZE: 1000              // 错误日志最大条目
    },
    
    // 错误日志存储
    errorLog: [],
    performanceMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        responseTimeHistory: [],
        lastMetricsReset: Date.now()
    },
    
    // 自动恢复策略配置
    recoveryStrategies: {
        exponential_backoff: {
            name: '指数退避',
            execute: async (errorDetails) => {
                const delay = Math.min(1000 * Math.pow(2, errorDetails.retryCount || 0), 30000);
                console.log(`执行指数退避策略，延迟 ${delay}ms`);
                await sleep(delay);
                return { success: true, nextRetryDelay: delay * 2 };
            }
        },
        fallback_traditional: {
            name: '降级到传统算法',
            execute: async (errorDetails) => {
                console.log('AI不可用，自动切换到传统匹配算法');
                aiAnalysisEnabled = false;
                return { success: true, switchedMode: 'traditional' };
            }
        },
        cache_cleanup: {
            name: '缓存清理',
            execute: async (errorDetails) => {
                console.log('执行缓存清理恢复策略');
                memoryMonitor.performGarbageCollection();
                advancedCacheSystem.cleanupCache(advancedCacheSystem.aiAnalysisCache, 
                    advancedCacheSystem.config.MAX_AI_CACHE_SIZE * 0.5);
                return { success: true, cleanedItems: 'cache' };
            }
        },
        reduce_batch_size: {
            name: '减少批处理大小',
            execute: async (errorDetails) => {
                const oldSize = apiHealthMonitor.currentBatchSize;
                apiHealthMonitor.currentBatchSize = Math.max(1, Math.floor(oldSize / 2));
                console.log(`降低批处理大小: ${oldSize} -> ${apiHealthMonitor.currentBatchSize}`);
                return { success: true, oldSize, newSize: apiHealthMonitor.currentBatchSize };
            }
        },
        garbage_collection: {
            name: '强制垃圾回收',
            execute: async (errorDetails) => {
                console.log('执行内存垃圾回收');
                memoryMonitor.performGarbageCollection();
                return { success: true, action: 'gc_performed' };
            }
        }
    },
    
    // 记录错误的核心方法
    logError(errorType, errorDetails = {}) {
        const timestamp = Date.now();
        const errorCategory = this.errorCategories[errorType];
        
        if (errorCategory) {
            errorCategory.count++;
            errorCategory.lastOccurred = timestamp;
        }
        
        // 添加到错误日志
        const logEntry = {
            timestamp,
            type: errorType,
            severity: errorCategory?.severity || 'unknown',
            details: errorDetails,
            userAgent: navigator?.userAgent || 'unknown',
            url: window?.location?.href || 'unknown'
        };
        
        this.errorLog.push(logEntry);
        
        // 限制日志大小
        if (this.errorLog.length > this.config.MAX_ERROR_LOG_SIZE) {
            this.errorLog = this.errorLog.slice(-this.config.MAX_ERROR_LOG_SIZE);
        }
        
        // 更新系统健康状态
        this.updateSystemHealth();
        
        // 输出到控制台（带颜色标识）
        const severityColors = {
            'high': 'color: #dc3545; font-weight: bold;',
            'medium': 'color: #fd7e14; font-weight: bold;',
            'low': 'color: #6c757d;'
        };
        
        console.log(
            `%c[ERROR-MONITOR] ${errorType}: ${errorCategory?.description || 'Unknown error'}`,
            severityColors[errorCategory?.severity] || '',
            errorDetails
        );
        
        // 触发自动恢复机制
        this.handleAutoRecovery(errorType, errorDetails);
    },
    
    // 自动恢复处理
    async handleAutoRecovery(errorType, errorDetails) {
        const errorCategory = this.errorCategories[errorType];
        if (!errorCategory || !errorCategory.recoveryAction) {
            return;
        }
        
        const strategy = this.recoveryStrategies[errorCategory.recoveryAction];
        if (strategy) {
            try {
                console.log(`🔧 开始执行自动恢复策略: ${strategy.name}`);
                const result = await strategy.execute({ 
                    ...errorDetails, 
                    errorType, 
                    timestamp: Date.now() 
                });
                
                console.log(`✅ 恢复策略执行成功:`, result);
                
                // 记录恢复成功
                this.logRecoveryAction(errorType, strategy.name, result, true);
            } catch (recoveryError) {
                console.error(`❌ 恢复策略执行失败:`, recoveryError);
                this.logRecoveryAction(errorType, strategy.name, recoveryError, false);
            }
        }
    },
    
    // 记录恢复操作
    logRecoveryAction(errorType, strategyName, result, success) {
        this.errorLog.push({
            timestamp: Date.now(),
            type: 'RECOVERY_ACTION',
            severity: 'info',
            details: {
                originalError: errorType,
                strategy: strategyName,
                result: result,
                success: success
            }
        });
    },
    
    // 更新系统健康状态
    updateSystemHealth() {
        const now = Date.now();
        const recentErrors = this.getRecentErrors(5 * 60 * 1000); // 5分钟内的错误
        
        // 计算整体健康状态
        const highSeverityErrors = recentErrors.filter(e => 
            this.errorCategories[e.type]?.severity === 'high').length;
        const totalRecentErrors = recentErrors.length;
        
        let overallHealth = 'healthy';
        if (highSeverityErrors >= 3 || totalRecentErrors >= 10) {
            overallHealth = 'critical';
        } else if (highSeverityErrors >= 1 || totalRecentErrors >= 5) {
            overallHealth = 'degraded';
        }
        
        // 更新API状态
        const apiErrors = recentErrors.filter(e => 
            e.type.startsWith('API_') || e.type.startsWith('AI_')).length;
        let apiStatus = 'operational';
        if (apiErrors >= 5) {
            apiStatus = 'down';
        } else if (apiErrors >= 2) {
            apiStatus = 'degraded';
        }
        
        // 更新缓存状态
        const cacheErrors = recentErrors.filter(e => e.type === 'CACHE_ERROR').length;
        let cacheStatus = 'operational';
        if (cacheErrors >= 3) {
            cacheStatus = 'disabled';
        } else if (cacheErrors >= 1) {
            cacheStatus = 'degraded';
        }
        
        // 更新内存状态
        const memoryErrors = recentErrors.filter(e => e.type === 'MEMORY_WARNING').length;
        let memoryStatus = 'optimal';
        if (memoryErrors >= 3) {
            memoryStatus = 'critical';
        } else if (memoryErrors >= 1) {
            memoryStatus = 'warning';
        }
        
        // 保存旧状态用于比较
        const oldHealth = { ...this.systemHealth };
        
        // 更新健康状态
        this.systemHealth = {
            overall: overallHealth,
            api: apiStatus,
            cache: cacheStatus,
            memory: memoryStatus,
            lastHealthCheck: now,
            consecutiveHealthChecks: this.systemHealth.consecutiveHealthChecks + 1,
            isRecovering: this.systemHealth.isRecovering,
            recoveryStartTime: this.systemHealth.recoveryStartTime
        };
        
        // 检查状态变化
        if (oldHealth.overall !== overallHealth) {
            console.log(`🏥 系统健康状态变化: ${oldHealth.overall} -> ${overallHealth}`);
        }
        
        // 更新UI显示（如果存在）
        this.updateMonitoringUI();
    },
    
    // 获取最近的错误
    getRecentErrors(timeWindow = 5 * 60 * 1000) {
        const cutoff = Date.now() - timeWindow;
        return this.errorLog.filter(entry => entry.timestamp > cutoff);
    },
    
    // 获取错误统计
    getErrorStats() {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        const lastHour = now - 60 * 60 * 1000;
        const last5min = now - 5 * 60 * 1000;
        
        const recent24h = this.errorLog.filter(e => e.timestamp > last24h);
        const recentHour = this.errorLog.filter(e => e.timestamp > lastHour);
        const recent5min = this.errorLog.filter(e => e.timestamp > last5min);
        
        return {
            total: this.errorLog.length,
            last24h: recent24h.length,
            lastHour: recentHour.length,
            last5min: recent5min.length,
            // 修正：直接使用 apiHealthMonitor 的准确错误率
            overallErrorRate: apiHealthMonitor.getErrorRate(),
            byCategory: Object.fromEntries(
                Object.entries(this.errorCategories).map(([key, value]) => [
                    key,
                    { count: value.count, lastOccurred: value.lastOccurred }
                ])
            ),
            bySeverity: {
                high: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'high').length,
                medium: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'medium').length,
                low: recent24h.filter(e => this.errorCategories[e.type]?.severity === 'low').length
            }
        };
    },
    
    // 更新监控UI（如果存在监控面板）
    updateMonitoringUI() {
        // 更新API状态指示器
        const apiStatusElement = document.getElementById('apiStatus');
        const apiStatusText = document.getElementById('apiStatusText');
        
        if (apiStatusElement && apiStatusText) {
            const statusStyles = {
                'operational': { color: '#28a745', text: '正常' },
                'degraded': { color: '#ffc107', text: '降级' },
                'down': { color: '#dc3545', text: '故障' }
            };
            
            const style = statusStyles[this.systemHealth.api] || statusStyles['down'];
            apiStatusElement.style.color = style.color;
            apiStatusText.textContent = style.text;
        }
        
        // 更新错误率显示
        const errorRateElement = document.getElementById('errorRate');
        if (errorRateElement) {
            const errorRate = apiHealthMonitor.getErrorRate();
            errorRateElement.textContent = `${(errorRate * 100).toFixed(2)}%`;
            
            // 根据错误率设置颜色
            if (errorRate > 0.1) { // 10%
                errorRateElement.style.color = '#dc3545';
            } else if (errorRate > 0.05) { // 5%
                errorRateElement.style.color = '#ffc107';
            } else {
                errorRateElement.style.color = '#28a745';
            }
        }
        
        // 更新缓存命中率
        const cacheHitRateElement = document.getElementById('cacheHitRate');
        if (cacheHitRateElement) {
            const cacheStats = advancedCacheSystem.getCacheStats();
            const hitRate = cacheStats.aiAnalysis?.hitRate || '0%';
            cacheHitRateElement.textContent = hitRate;
            
            // 根据命中率设置颜色
            const hitRateNum = parseFloat(hitRate);
            if (hitRateNum < 30) {
                cacheHitRateElement.style.color = '#dc3545';
            } else if (hitRateNum < 60) {
                cacheHitRateElement.style.color = '#ffc107';
            } else {
                cacheHitRateElement.style.color = '#28a745';
            }
        }
    },
    
    // 获取系统健康报告
    getHealthReport() {
        const stats = this.getErrorStats();
        const cacheStats = advancedCacheSystem.getCacheStats();
        const memoryStats = memoryMonitor.getCacheStats();
        
        return {
            timestamp: Date.now(),
            systemHealth: this.systemHealth,
            errorStats: stats,
            performance: {
                totalRequests: this.performanceMetrics.totalRequests,
                successRate: this.performanceMetrics.totalRequests > 0 ? 
                    (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                averageResponseTime: this.performanceMetrics.averageResponseTime + 'ms'
            },
            cacheHealth: {
                aiCacheSize: cacheStats.aiAnalysis?.size || 0,
                aiCacheHitRate: cacheStats.aiAnalysis?.hitRate || '0%',
                userProfilesSize: cacheStats.userProfiles?.size || 0,
                requestCacheSize: cacheStats.requestCache?.size || 0
            },
            memoryHealth: {
                requestCacheSize: memoryStats.requestCacheSize,
                profileCacheSize: memoryStats.profileCacheSize,
                cacheHitRate: memoryStats.cacheHitRate
            },
            recommendations: this.generateRecommendations()
        };
    },
    
    // 生成优化建议
    generateRecommendations() {
        const recommendations = [];
        const stats = this.getErrorStats();
        
        if (stats.errorRate5min > 1) {
            recommendations.push({
                priority: 'high',
                message: '错误率过高，建议检查API配置和网络连接',
                action: 'check_api_config'
            });
        }
        
        if (this.systemHealth.cache === 'degraded') {
            recommendations.push({
                priority: 'medium',
                message: '缓存系统性能下降，建议清理缓存',
                action: 'cleanup_cache'
            });
        }
        
        if (this.systemHealth.memory === 'warning') {
            recommendations.push({
                priority: 'medium',
                message: '内存使用过高，建议执行垃圾回收',
                action: 'garbage_collection'
            });
        }
        
        const cacheStats = advancedCacheSystem.getCacheStats();
        const aiHitRate = parseFloat(cacheStats.aiAnalysis?.hitRate) || 0;
        if (aiHitRate < 30) {
            recommendations.push({
                priority: 'low',
                message: 'AI分析缓存命中率较低，建议优化缓存策略',
                action: 'optimize_cache_strategy'
            });
        }
        
        return recommendations;
    },
    
    // 手动触发健康检查
    performHealthCheck() {
        console.log('🏥 执行手动健康检查...');
        this.updateSystemHealth();
        const report = this.getHealthReport();
        console.log('健康检查报告:', report);
        return report;
    },
    
    // 重置监控数据
    resetMonitoring() {
        console.log('🔄 重置监控数据...');
        
        // 重置错误计数器
        Object.keys(this.errorCategories).forEach(key => {
            this.errorCategories[key].count = 0;
            this.errorCategories[key].lastOccurred = null;
        });
        
        // 清空错误日志
        this.errorLog = [];
        
        // 重置性能指标
        this.performanceMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            averageResponseTime: 0,
            responseTimeHistory: [],
            lastMetricsReset: Date.now()
        };
        
        // 重置健康状态
        this.systemHealth = {
            overall: 'healthy',
            api: 'operational',
            cache: 'operational',
            memory: 'optimal',
            lastHealthCheck: Date.now(),
            consecutiveHealthChecks: 0,
            isRecovering: false,
            recoveryStartTime: null
        };
        
        console.log('✅ 监控数据重置完成');
    }
};

// 定期健康检查
setInterval(() => {
    errorMonitoringSystem.updateSystemHealth();
}, errorMonitoringSystem.config.HEALTH_CHECK_INTERVAL);

// ===== API健康监控和降级管理 =====
const apiHealthMonitor = {
    errorCount: 0,
    successCount: 0,
    consecutiveErrors: 0,
    lastErrorTime: null,
    currentBatchSize: 3,
    degradedMode: false,
    degradationStartTime: null,
    degradationThreshold: 5,          // 连续错误阈值
    recoveryThreshold: 3,             // 恢复检测阈值
    degradationCooldown: 5 * 60 * 1000, // 5分钟冷却期
    
    recordSuccess() {
        this.successCount++;
        this.consecutiveErrors = 0;
        
        // 同步更新性能指标
        errorMonitoringSystem.performanceMetrics.totalRequests++;
        errorMonitoringSystem.performanceMetrics.successfulRequests++;

        // 集成错误监控系统
        if (this.systemHealth?.isRecovering) {
            errorMonitoringSystem.systemHealth.consecutiveHealthChecks++;
        }
        
        // 检查是否可以从降级模式恢复
        if (this.degradedMode) {
            this.checkRecovery();
        }
    },
    
    recordError() {
        this.errorCount++;
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        
        // 同步更新性能指标
        errorMonitoringSystem.performanceMetrics.totalRequests++;
        
        // 检查是否需要进入降级模式
        if (!this.degradedMode && this.consecutiveErrors >= this.degradationThreshold) {
            this.enterDegradedMode();
        }
    },
    
    getErrorRate() {
        const total = this.errorCount + this.successCount;
        return total > 0 ? this.errorCount / total : 0;
    },
    
    shouldUseAI() {
        // 检查AI分析总开关
        if (!aiAnalysisEnabled) {
            return false;
        }
        
        // 检查是否在降级模式
        if (this.degradedMode) {
            return false;
        }
        
        // 检查连续错误数
        return this.consecutiveErrors < this.degradationThreshold;
    },
    
    getDynamicBatchSize() {
        const errorRate = this.getErrorRate();
        if (errorRate > 0.3) {
            this.currentBatchSize = Math.max(1, this.currentBatchSize - 1);
        } else if (errorRate < 0.1 && this.consecutiveErrors === 0) {
            this.currentBatchSize = Math.min(5, this.currentBatchSize + 1);
        }
        return this.currentBatchSize;
    },
    
    // 进入降级模式
    enterDegradedMode() {
        this.degradedMode = true;
        this.degradationStartTime = Date.now();
        
        console.warn(`⚠️ AI服务降级：连续${this.consecutiveErrors}次错误，切换到传统匹配算法`);
        
        // 更新UI提示
        this.updateDegradationUI(true);
        
        // 发送通知
        this.notifyDegradation('进入降级模式', 'warning');
    },
    
    // 检查恢复条件
    checkRecovery() {
        if (!this.degradedMode) return;
        
        const now = Date.now();
        const timeSinceDegradation = now - this.degradationStartTime;
        
        // 必须满足时间冷却期和连续成功条件
        if (timeSinceDegradation >= this.degradationCooldown && this.consecutiveErrors === 0) {
            this.exitDegradedMode();
        }
    },
    
    // 退出降级模式
    exitDegradedMode() {
        this.degradedMode = false;
        this.degradationStartTime = null;
        
        console.log(`✅ AI服务恢复：退出降级模式，重新启用AI智能匹配`);
        
        // 更新UI提示
        this.updateDegradationUI(false);
        
        // 发送通知
        this.notifyDegradation('AI服务已恢复', 'success');
    },
    
    // 手动重置降级状态
    forceReset() {
        this.degradedMode = false;
        this.degradationStartTime = null;
        this.consecutiveErrors = 0;
        this.errorCount = 0;
        this.successCount = 0;
        this.currentBatchSize = 3;
        
        console.log('🔄 API健康监控已手动重置');
        this.updateDegradationUI(false);
    },
    
    // 更新降级状态UI
    updateDegradationUI(isDegraded) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const aiToggleBtn = document.getElementById('aiToggleBtn');
        
        if (loadingIndicator) {
            if (isDegraded) {
                loadingIndicator.style.background = '#fff3cd';
                loadingIndicator.style.color = '#856404';
                loadingIndicator.style.border = '1px solid #ffeaa7';
                loadingIndicator.innerHTML = '⚠️ AI服务暂时不可用，已切换到传统匹配算法';
            } else {
                loadingIndicator.style.background = '';
                loadingIndicator.style.color = '#007bff';
                loadingIndicator.style.border = '';
                const baseText = aiAnalysisEnabled ? '🧠 正在进行AI智能分析，请稍候...' : '📊 正在进行传统匹配分析，请稍候...';
                loadingIndicator.innerHTML = baseText;
            }
        }
        
        if (aiToggleBtn && isDegraded) {
            // 在AI开关按钮上显示降级状态
            const originalText = aiToggleBtn.textContent;
            if (!originalText.includes('(降级)')) {
                aiToggleBtn.textContent = originalText + ' (降级中)';
                aiToggleBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
            }
        } else if (aiToggleBtn && !isDegraded) {
            // 恢复正常状态
            aiToggleBtn.textContent = aiToggleBtn.textContent.replace(' (降级中)', '');
            updateAiToggleUI(); // 恢复正常样式
        }
    },
    
    // 发送降级通知
    notifyDegradation(message, type = 'info') {
        // 创建临时通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        switch (type) {
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
                break;
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #00b894 0%, #00a085 100%)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    },
    
    // 获取降级状态信息
    getDegradationStatus() {
        return {
            degraded: this.degradedMode,
            startTime: this.degradationStartTime,
            duration: this.degradedMode ? Date.now() - this.degradationStartTime : 0,
            consecutiveErrors: this.consecutiveErrors,
            errorRate: this.getErrorRate(),
            canRecover: this.degradedMode && 
                       (Date.now() - this.degradationStartTime) >= this.degradationCooldown
        };
    }
};

// 智能重试配置
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,      // 1秒基础延迟
    maxDelay: 30000,      // 最大30秒延迟
    backoffMultiplier: 2, // 指数增长倍数
    jitterRange: 0.1      // 10%的随机抖动
};

/**
 * 生成缓存键
 */
function generateCacheKey(user1, user2) {
    const id1 = user1.id || user1.name;
    const id2 = user2.id || user2.name;
    // 确保键的一致性，无论用户顺序
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

/**
 * 分块处理函数 - 将大数组分成小块处理，避免内存峰值
 * @param {Array} array - 要处理的数组
 * @param {number} chunkSize - 每块的大小
 * @returns {Array} 分块后的数组
 */
function chunkArray(array, chunkSize = MEMORY_CONFIG.CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * 异步分块处理器 - 逐块处理数据，释放内存压力
 * @param {Array} items - 要处理的项目
 * @param {Function} processor - 处理函数
 * @param {Object} options - 配置选项
 * @returns {Array} 处理结果
 */
async function processInChunks(items, processor, options = {}) {
    const {
        chunkSize = MEMORY_CONFIG.CHUNK_SIZE,
        onProgress = null,
        delayBetweenChunks = 100
    } = options;
    
    const chunks = chunkArray(items, chunkSize);
    const results = [];
    let processedCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkResults = await Promise.all(
            chunk.map(item => processor(item))
        );
        
        results.push(...chunkResults);
        processedCount += chunk.length;
        
        // 进度回调
        if (onProgress) {
            onProgress(processedCount, items.length, i + 1, chunks.length);
        }
        
        // 检查内存使用
        memoryMonitor.checkMemoryUsage();
        
        // 块间延迟，让出CPU时间
        if (i < chunks.length - 1 && delayBetweenChunks > 0) {
            await sleep(delayBetweenChunks);
        }
    }
    
    return results;
}

// ===== 用户预过滤优化 =====

/**
 * 快速预过滤函数 - 在AI分析前过滤明显不合适的配对
 * @param {Object} user1 - 第一个用户
 * @param {Object} user2 - 第二个用户
 * @returns {Object} 过滤结果 {shouldMatch: boolean, reason: string}
 */
function preFilterPair(user1, user2) {
    // 1. 性别偏好检查（已存在，但这里明确列出）
    if (!checkGenderPreferenceMatch(user1, user2)) {
        return {
            shouldMatch: false,
            reason: "性别偏好不匹配"
        };
    }
    
    // 2. 数据完整性检查 - 如果两个用户数据都极其不完整，直接过滤
    const profile1 = createUserProfile(user1);
    const profile2 = createUserProfile(user2);
    
    // 如果两个用户的数据完整性都低于10%，直接跳过
    if (profile1.data_quality.completeness_score < 0.1 && 
        profile2.data_quality.completeness_score < 0.1) {
        return {
            shouldMatch: false,
            reason: "用户数据过于缺失"
        };
    }
    
    // 3. 阅读承诺差异检查 - 如果阅读量期望差异太大（3级以上），直接过滤
    const commitment1 = user1.questionnaire?.readingCommitment || user1.readingCommitment;
    const commitment2 = user2.questionnaire?.readingCommitment || user2.readingCommitment;
    
    if (commitment1 && commitment2) {
        const commitmentLevels = {
            'light': 1,
            'medium': 2,
            'intensive': 3,
            'epic': 4
        };
        const level1 = commitmentLevels[commitment1];
        const level2 = commitmentLevels[commitment2];
        
        if (level1 && level2 && Math.abs(level1 - level2) >= 3) {
            return {
                shouldMatch: false,
                reason: "阅读量期望差异过大"
            };
        }
    }
    
    // 4. 匹配类型偏好冲突检查 - 如果双方偏好明确冲突，提前过滤
    const pref1 = user1.questionnaire?.matchingTypePreference || user1.matchingTypePreference;
    const pref2 = user2.questionnaire?.matchingTypePreference || user2.matchingTypePreference;
    
    if (pref1 && pref2 && 
        pref1 !== 'no_preference' && pref2 !== 'no_preference' && 
        pref1 !== pref2) {
        // 如果一方要相似型，另一方要互补型，可能不太合适
        // 但这里只是降低优先级，不是完全过滤
        return {
            shouldMatch: true,
            priority: 0.7,  // 降低优先级
            reason: "匹配类型偏好不同"
        };
    }
    
    // 5. 书籍类别兼容性检查 - 如果完全没有交集，降低优先级
    const categories1 = user1.questionnaire?.bookCategories || user1.bookCategories || [];
    const categories2 = user2.questionnaire?.bookCategories || user2.bookCategories || [];
    
    if (categories1.length > 0 && categories2.length > 0) {
        const hasCommonCategory = categories1.some(cat => categories2.includes(cat));
        if (!hasCommonCategory) {
            // 没有共同的书籍类别，但不完全过滤（可能是互补型匹配）
            return {
                shouldMatch: true,
                priority: 0.8,  // 略微降低优先级
                reason: "书籍类别无交集"
            };
        }
    }
    
    // 6. 活跃度检查 - 如果用户状态不是approved，过滤
    if (user1.status !== 'approved' || user2.status !== 'approved') {
        return {
            shouldMatch: false,
            reason: "用户状态未审核"
        };
    }
    
    // 通过所有过滤条件
    return {
        shouldMatch: true,
        priority: 1.0,
        reason: "通过预过滤"
    };
}

/**
 * 批量预过滤函数 - 对所有配对进行预过滤和优先级排序
 * @param {Array} members - 所有成员
 * @returns {Array} 过滤并排序后的配对列表
 */
function preFilterAndPrioritizePairs(members) {
    const pairings = [];
    
    // 收集所有可能的配对并进行预过滤
    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            const filterResult = preFilterPair(members[i], members[j]);
            
            if (filterResult.shouldMatch) {
                pairings.push({
                    user1: members[i],
                    user2: members[j],
                    priority: filterResult.priority || 1.0,
                    filterReason: filterResult.reason
                });
            }
        }
    }
    
    // 按优先级排序，高优先级的先处理
    pairings.sort((a, b) => b.priority - a.priority);
    
    console.log(`预过滤完成：从 ${members.length * (members.length - 1) / 2} 个可能配对中筛选出 ${pairings.length} 个有效配对`);
    
    return pairings;
}

// ===== 轻量级数据结构优化 =====

/**
 * 创建用户的轻量级引用，减少内存使用
 * @param {Object} user - 原始用户对象
 * @returns {Object} 轻量级用户引用
 */
function createLightweightUserRef(user) {
    return {
        id: user.id,
        name: user.name,
        studentId: user.studentId,
        status: user.status,
        // 只保留必要的问卷数据引用
        questionnaire: user.questionnaire ? {
            gender: user.questionnaire.gender,
            matchGenderPreference: user.questionnaire.matchGenderPreference,
            matchingTypePreference: user.questionnaire.matchingTypePreference,
            readingCommitment: user.questionnaire.readingCommitment,
            bookCategories: user.questionnaire.bookCategories,
            version: user.questionnaire.version
        } : null,
        // 保留传统字段的引用
        hobbies: user.hobbies,
        books: user.books,
        gender: user.gender,
        readingCommitment: user.readingCommitment,
        bookCategories: user.bookCategories,
        matchGenderPreference: user.matchGenderPreference,
        matchingTypePreference: user.matchingTypePreference
    };
}

/**
 * 优化的预过滤函数 - 使用轻量级数据结构
 */
function optimizedPreFilterPair(lightUser1, lightUser2) {
    // 1. 性别偏好检查（简化版）
    const genderPrefMatch = checkGenderPreferenceMatch(lightUser1, lightUser2);
    if (!genderPrefMatch) {
        return { shouldMatch: false, reason: "性别偏好不匹配" };
    }
    
    // 2. 状态检查
    if (lightUser1.status !== 'approved' || lightUser2.status !== 'approved') {
        return { shouldMatch: false, reason: "用户状态未审核" };
    }
    
    // 3. 阅读承诺差异检查
    const commitment1 = lightUser1.questionnaire?.readingCommitment || lightUser1.readingCommitment;
    const commitment2 = lightUser2.questionnaire?.readingCommitment || lightUser2.readingCommitment;
    
    if (commitment1 && commitment2) {
        const commitmentLevels = { 'light': 1, 'medium': 2, 'intensive': 3, 'epic': 4 };
        const level1 = commitmentLevels[commitment1];
        const level2 = commitmentLevels[commitment2];
        
        if (level1 && level2 && Math.abs(level1 - level2) >= 3) {
            return { shouldMatch: false, reason: "阅读量期望差异过大" };
        }
    }
    
    return { shouldMatch: true, priority: 1.0, reason: "通过预过滤" };
}

// ===== 高级缓存策略系统 =====

// 多层缓存架构
const advancedCacheSystem = {
    // 第1层：用户画像缓存（已存在）
    userProfiles: userProfileCache,
    
    // 第2层：AI分析结果缓存
    aiAnalysisCache: new Map(),
    
    // 第3层：匹配结果缓存
    matchResultsCache: new Map(),
    
    // 第4层：批次结果缓存
    batchResultsCache: new Map(),
    
    // 缓存配置
    config: {
        AI_ANALYSIS_TTL: 7 * 24 * 60 * 60 * 1000,    // AI分析缓存7天
        MATCH_RESULTS_TTL: 24 * 60 * 60 * 1000,      // 匹配结果缓存24小时
        BATCH_RESULTS_TTL: 60 * 60 * 1000,           // 批次结果缓存1小时
        MAX_AI_CACHE_SIZE: 2000,                     // AI分析缓存最大条目
        MAX_MATCH_CACHE_SIZE: 1000,                  // 匹配结果缓存最大条目
        MAX_BATCH_CACHE_SIZE: 100,                   // 批次缓存最大条目
    },
    
    // 缓存统计
    stats: {
        aiCacheHits: 0,
        aiCacheMisses: 0,
        matchCacheHits: 0,
        matchCacheMisses: 0,
        batchCacheHits: 0,
        batchCacheMisses: 0
    },
    
    // 智能缓存键生成
    generateAIAnalysisKey(profile1, profile2) {
        // 基于用户画像内容生成哈希键
        const content1 = JSON.stringify({
            interests: profile1.interests,
            reading: profile1.reading_preferences,
            matching: profile1.matching_preferences
        });
        const content2 = JSON.stringify({
            interests: profile2.interests,
            reading: profile2.reading_preferences,
            matching: profile2.matching_preferences
        });
        
        // --- DEBUG LOGGING START ---
        Logger.debug(`[Cache Key Gen] Profile 1 Content for ${profile1.basic_info.name}:`, content1);
        Logger.debug(`[Cache Key Gen] Profile 2 Content for ${profile2.basic_info.name}:`, content2);
        // --- DEBUG LOGGING END ---
        
        // 确保键的一致性
        const sortedContents = [content1, content2].sort();
        const finalKey = `ai_${this.simpleHash(sortedContents.join('|'))}`;

        // --- DEBUG LOGGING START ---
        Logger.debug(`[Cache Key Gen] Generated Key for ${profile1.basic_info.name} & ${profile2.basic_info.name}:`, finalKey);
        // --- DEBUG LOGGING END ---

        return finalKey;
    },
    
    generateMatchKey(userIds, matchType) {
        const sortedIds = userIds.sort();
        return `match_${matchType}_${sortedIds.join('-')}`;
    },
    
    generateBatchKey(userIdsList, matchType) {
        const signature = userIdsList
            .map(ids => ids.sort().join('-'))
            .sort()
            .join('|');
        return `batch_${matchType}_${this.simpleHash(signature)}`;
    },
    
    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转为32位整数
        }
        return Math.abs(hash).toString(36);
    },
    
    // AI分析结果缓存操作
    setAIAnalysis(profile1, profile2, result) {
        const key = this.generateAIAnalysisKey(profile1, profile2);
        this.aiAnalysisCache.set(key, {
            data: result,
            timestamp: Date.now(),
            profiles: [profile1.basic_info, profile2.basic_info] // 仅存储基本信息用于调试
        });
        
        // 检查缓存大小
        if (this.aiAnalysisCache.size > this.config.MAX_AI_CACHE_SIZE) {
            this.cleanupCache(this.aiAnalysisCache, this.config.MAX_AI_CACHE_SIZE * 0.8);
        }
    },
    
    getAIAnalysis(profile1, profile2) {
        const key = this.generateAIAnalysisKey(profile1, profile2);
        const cached = this.aiAnalysisCache.get(key);
        
        if (cached && this.isValidCache(cached, this.config.AI_ANALYSIS_TTL)) {
            this.stats.aiCacheHits++;
            console.log(`AI分析缓存命中: ${key}`);
            return cached.data;
        }
        
        if (cached) {
            this.aiAnalysisCache.delete(key); // 删除过期缓存
        }
        
        this.stats.aiCacheMisses++;
        return null;
    },
    
    // 通用缓存管理
    isValidCache(cacheEntry, ttl) {
        return cacheEntry && (Date.now() - cacheEntry.timestamp) < ttl;
    },
    
    cleanupCache(cache, targetSize) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // 按时间排序
        
        const deleteCount = cache.size - targetSize;
        for (let i = 0; i < deleteCount; i++) {
            cache.delete(entries[i][0]);
        }
        
        console.log(`缓存清理: 删除了 ${deleteCount} 个旧条目`);
    },
    
    // 缓存预热
    async preheatUserProfiles(users) {
        console.log(`开始预热 ${users.length} 个用户画像...`);
        const startTime = Date.now();
        
        for (const user of users) {
            createUserProfile(user); // 这会自动缓存到userProfileCache
        }
        
        const duration = Date.now() - startTime;
        console.log(`用户画像预热完成，耗时 ${duration}ms`);
    },
    
    // 获取缓存统计信息
    getCacheStats() {
        const aiHitRate = this.stats.aiCacheHits + this.stats.aiCacheMisses > 0 
            ? (this.stats.aiCacheHits / (this.stats.aiCacheHits + this.stats.aiCacheMisses) * 100).toFixed(2)
            : 0;
        
        return {
            userProfiles: {
                size: userProfileCache.size,
                maxSize: MEMORY_CONFIG.MAX_PROFILE_CACHE_SIZE
            },
            aiAnalysis: {
                size: this.aiAnalysisCache.size,
                maxSize: this.config.MAX_AI_CACHE_SIZE,
                hitRate: `${aiHitRate}%`,
                hits: this.stats.aiCacheHits,
                misses: this.stats.aiCacheMisses
            },
            requestCache: {
                size: requestCache.size,
                maxSize: MEMORY_CONFIG.MAX_CACHE_SIZE
            }
        };
    },
    
    // 智能缓存失效
    invalidateUserCaches(userId) {
        // 清理相关的用户画像缓存
        userProfileCache.delete(userId);
        
        // 清理包含该用户的AI分析缓存
        for (const [key, value] of this.aiAnalysisCache.entries()) {
            if (value.profiles && value.profiles.some(p => p.student_id === userId || p.name === userId)) {
                this.aiAnalysisCache.delete(key);
            }
        }
        
        // 清理匹配结果缓存（如果有的话）
        for (const [key] of requestCache.entries()) {
            if (key.includes(userId)) {
                requestCache.delete(key);
            }
        }
        
        console.log(`已清理用户 ${userId} 相关的所有缓存`);
    },
    
    // 全面缓存清理
    clearAllCaches() {
        userProfileCache.clear();
        this.aiAnalysisCache.clear();
        requestCache.clear();
        
        // 重置统计
        this.stats = {
            aiCacheHits: 0,
            aiCacheMisses: 0,
            matchCacheHits: 0,
            matchCacheMisses: 0,
            batchCacheHits: 0,
            batchCacheMisses: 0
        };
        
        console.log('所有缓存已清理');
    }
};

/**
 * 检查缓存是否有效
 */
function isValidCache(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
}

/**
 * 智能延迟函数 - 指数退避 + 随机抖动
 */
function calculateDelay(retryCount) {
    const exponentialDelay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
        RETRY_CONFIG.maxDelay
    );
    
    // 添加随机抖动，避免请求同时发送
    const jitter = exponentialDelay * RETRY_CONFIG.jitterRange * (Math.random() - 0.5);
    return Math.max(0, Math.round(exponentialDelay + jitter));
}

/**
 * 睡眠函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 新一代AI驱动的用户匹配引擎
 * 使用单次AI调用完成全面的匹配分析，替代原有的多层次计算
 * @param {Object} user1 - 第一个用户
 * @param {Object} user2 - 第二个用户  
 * @returns {Object} 详细的匹配分析结果
 */
async function calculateAICompatibility(user1, user2) {
    // 检查缓存
    const cacheKey = generateCacheKey(user1, user2);
    const cachedResult = requestCache.get(cacheKey);
    if (isValidCache(cachedResult)) {
        console.log(`使用缓存结果: ${cacheKey}`);
        memoryMonitor.cacheHits++; // 增加requestCache命中计数
        return cachedResult.data;
    }
    memoryMonitor.cacheMisses++;
    
    // 首先检查性别偏好匹配
    if (!checkGenderPreferenceMatch(user1, user2)) {
        const result = {
            score: 0,
            reason: "性别偏好不匹配",
            gender_preference_compatible: false,
            analysis: null
        };
        // 缓存不匹配结果
        requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    }
    
    // 创建标准化用户画像
    const profile1 = createUserProfile(user1);
    const profile2 = createUserProfile(user2);
    
    // 检查高级AI分析缓存
    const cachedAIAnalysis = advancedCacheSystem.getAIAnalysis(profile1, profile2);
    if (cachedAIAnalysis) {
        console.log(`使用AI分析缓存结果: ${user1.name} - ${user2.name}`);
        advancedCacheSystem.stats.aiCacheHits++; // 增加AI缓存命中计数
        return {
            score: cachedAIAnalysis.compatibility_score,
            reason: cachedAIAnalysis.summary || "AI缓存分析完成",
            gender_preference_compatible: true,
            data_completeness_issue: false,
            analysis: {
                ai_analysis: cachedAIAnalysis,
                user1_completeness: profile1.data_quality.completeness_score,
                user2_completeness: profile2.data_quality.completeness_score,
                commonHobbies: cachedAIAnalysis.shared_interests || [],
                commonBooks: cachedAIAnalysis.shared_books || [],
                detailLevel: {
                    exactMatches: cachedAIAnalysis.exact_matches || 0,
                    semanticMatches: cachedAIAnalysis.semantic_matches || 0,
                    categoryMatches: cachedAIAnalysis.category_matches || 0
                }
            }
        };
    }
    
    // 数据质量检查 - 如果两个用户的数据都很少，返回低分
    const minCompleteness = Math.min(profile1.data_quality.completeness_score, profile2.data_quality.completeness_score);
    if (minCompleteness < 0.2) {
        const result = {
            score: minCompleteness * 2, // 最多0.4分
            reason: "用户数据不足，无法进行有效匹配",
            gender_preference_compatible: true,
            data_completeness_issue: true,
            analysis: {
                user1_completeness: profile1.data_quality.completeness_score,
                user2_completeness: profile2.data_quality.completeness_score
            }
        };
        // 缓存数据不足结果
        requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    }
    
    // 调用AI进行全面匹配分析
    try {
        const aiAnalysis = await getAIMatchingAnalysis(profile1, profile2);
        
        // 根据数据完整性调整最终分数
        const dataQualityMultiplier = (profile1.data_quality.completeness_score + profile2.data_quality.completeness_score) / 2;
        const adjustedScore = aiAnalysis.compatibility_score * Math.min(dataQualityMultiplier + 0.3, 1.0);
        
        // 缓存AI分析结果到高级缓存系统
        advancedCacheSystem.setAIAnalysis(profile1, profile2, aiAnalysis);
        
        const result = {
            score: adjustedScore,
            reason: aiAnalysis.summary || "AI全面分析完成",
            gender_preference_compatible: true,
            data_completeness_issue: false,
            analysis: {
                ai_analysis: aiAnalysis,
                data_quality_multiplier: dataQualityMultiplier,
                user1_completeness: profile1.data_quality.completeness_score,
                user2_completeness: profile2.data_quality.completeness_score,
                // 保持向后兼容的字段
                commonHobbies: aiAnalysis.shared_interests || [],
                commonBooks: aiAnalysis.shared_books || [],
                detailLevel: {
                    exactMatches: aiAnalysis.exact_matches || 0,
                    semanticMatches: aiAnalysis.semantic_matches || 0,
                    categoryMatches: aiAnalysis.category_matches || 0
                }
            }
        };
        
        // 缓存成功结果
        requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        console.warn('AI匹配分析失败，返回低分:', error);
        const fallbackResult = {
            score: 0.1,
            reason: "AI分析失败",
            gender_preference_compatible: true,
        };
        
        // 不缓存失败结果，下次重试
        return fallbackResult;
    }
}

/**
 * 根据用户匹配类型偏好调整AI分析分数
 * @param {Object} aiResult - AI分析原始结果
 * @param {Object} profile1 - 用户1的画像
 * @param {Object} profile2 - 用户2的画像
 * @returns {Object} 调整后的分析结果
 */
function adjustScoreByPreference(aiResult, profile1, profile2) {
    const pref1 = profile1.matching_preferences.matching_type_preference;
    const pref2 = profile2.matching_preferences.matching_type_preference;
    
    // 创建结果副本，避免修改原对象
    const adjustedResult = { ...aiResult };
    let adjustmentFactor = 1.0;
    let adjustmentNote = '';
    
    // 偏好兼容性检查和分数调整
    if (pref1 && pref2 && pref1 !== '' && pref2 !== '') {
        if (pref1 !== 'no_preference' && pref2 !== 'no_preference') {
            if (pref1 !== pref2) {
                // 偏好不匹配，降低分数
                adjustmentFactor = 0.7;
                adjustedResult.preference_mismatch = true;
                adjustmentNote = `用户偏好不匹配：一方偏好${pref1 === 'similar' ? '相似型' : '互补型'}，另一方偏好${pref2 === 'similar' ? '相似型' : '互补型'}搭档`;
                
                // 在潜在挑战中添加偏好差异提醒
                adjustedResult.potential_challenges = [
                    ...adjustedResult.potential_challenges,
                    adjustmentNote
                ];
            } else {
                // 偏好匹配，根据类型调整
                if (pref1 === 'similar') {
                    // 双方都要相似型，提升相似性权重
                    const similarityBonus = (adjustedResult.detailed_analysis.similarity_score || 0) * 0.15;
                    adjustmentFactor = 1.0 + Math.min(0.3, similarityBonus / 10);
                    adjustmentNote = '双方都偏好相似型搭档，相似性权重提升';
                } else if (pref1 === 'complementary') {
                    // 双方都要互补型，提升互补性权重  
                    const complementaryBonus = (adjustedResult.detailed_analysis.complementarity_score || 0) * 0.15;
                    adjustmentFactor = 1.0 + Math.min(0.3, complementaryBonus / 10);
                    adjustmentNote = '双方都偏好互补型搭档，互补性权重提升';
                }
            }
        } else {
            // 至少一方选择"都可以"，正常分析
            adjustmentNote = '至少一方对匹配类型无特殊偏好，按正常权重分析';
        }
    } else {
        // 偏好信息不完整
        adjustmentNote = '偏好信息不完整，按正常权重分析';
    }
    
    // 应用调整因子
    adjustedResult.compatibility_score = Math.min(10, adjustedResult.compatibility_score * adjustmentFactor);
    
    // 添加偏好分析信息
    adjustedResult.preference_analysis = {
        user1_preference: pref1 || 'no_preference',
        user2_preference: pref2 || 'no_preference',
        preference_match: pref1 === pref2 || pref1 === 'no_preference' || pref2 === 'no_preference',
        adjustment_factor: adjustmentFactor,
        adjustment_note: adjustmentNote,
        preference_impact: adjustmentFactor > 1.0 ? 'positive' : adjustmentFactor < 1.0 ? 'negative' : 'neutral'
    };
    
    return adjustedResult;
}

/**
 * 综合性AI匹配分析函数
 * 使用先进的提示词工程，让AI对两个用户进行全面的兼容性分析
 * @param {Object} profile1 - 第一个用户的标准化画像
 * @param {Object} profile2 - 第二个用户的标准化画像
 * @returns {Object} AI分析结果
 */
async function getAIMatchingAnalysis(profile1, profile2) {
    if (!AI_BASE_URL || !AI_API_KEY) {
        throw new Error('AI服务未配置');
    }

    const systemPrompt = `你是一位专业的读书会配对专家，具有深厚的心理学和社会学背景。你的任务是分析两个用户的全面信息，判断他们作为读书会伙伴的兼容性。

## 分析维度框架

### 1. 相似性分析 (Similarity Analysis)
- **兴趣重叠度**: 共同爱好、相似偏好的程度
- **阅读品味**: 喜欢的书籍类型、作者、主题的重叠
- **阅读节奏**: 阅读速度、投入时间的匹配程度
- **价值观共鸣**: 从阅读偏好中体现的价值观相似性

### 2. 互补性分析 (Complementarity Analysis)  
- **知识互补**: 不同领域的知识可以互相补充
- **技能互补**: 分析能力、表达能力等技能的互补
- **视角多样性**: 不同背景带来的多元视角
- **成长潜力**: 互相促进学习和成长的可能性

### 3. 兼容性分析 (Compatibility Analysis)
- **沟通风格**: 基于偏好推断的沟通方式兼容性  
- **学习方式**: 阅读习惯和学习偏好的匹配
- **时间安排**: 阅读投入度和可用时间的协调性
- **人格特质**: 从阅读偏好推断的性格特征兼容性

## 用户匹配偏好考虑 ⭐ 重要
在分析时必须考虑两个用户的匹配类型偏好：
- **similar**: 用户倾向于寻找相似型搭档（兴趣相近、品味相似）
- **complementary**: 用户倾向于寻找互补型搭档（不同背景、互相学习）
- **no_preference**: 对匹配类型没有特殊偏好

### 偏好匹配规则：
1. **双方都偏好相似型**: 重点突出相似性分析，similarity_score权重增加
2. **双方都偏好互补型**: 重点突出互补性分析，complementarity_score权重增加
3. **一方偏好相似型，一方偏好互补型**: 平衡考虑，适度降低整体匹配分数
4. **至少一方选择"都可以"**: 正常分析，不做特殊调整
5. **偏好不匹配时**: 在分析中明确指出偏好差异，并在potential_challenges中提及

## 评分标准
- **优秀匹配 (8.0-10.0)**: 高度相似 + 良好互补 + 完美兼容
- **良好匹配 (6.0-7.9)**: 中等相似 + 部分互补 + 基本兼容  
- **一般匹配 (4.0-5.9)**: 少量共同点 + 有限互补 + 可接受兼容
- **较差匹配 (2.0-3.9)**: 很少共同点 + 互补不足 + 兼容性问题
- **不匹配 (0.0-1.9)**: 几乎无共同点 + 冲突倾向 + 严重不兼容

## 分析要求
1. 深度分析两个用户的所有可用信息
2. 考虑显性和隐性的匹配因素
3. 提供具体的匹配原因和建议
4. 识别潜在的挑战和解决方案
5. 给出具体的读书会活动建议
6. 重点考虑用户的匹配类型偏好

返回格式必须是JSON:
{
    "compatibility_score": 0.0到10.0的数字,
    "match_type": "相似型/互补型/混合型",
    "confidence_level": 0.0到1.0的置信度,
    "summary": "简洁的匹配总结(1-2句话)",
    "detailed_analysis": {
        "similarity_score": 0.0到10.0,
        "complementarity_score": 0.0到10.0,
        "compatibility_score": 0.0到10.0,
        "similarity_highlights": ["相似点1", "相似点2"],
        "complementarity_highlights": ["互补点1", "互补点2"],  
        "compatibility_highlights": ["兼容点1", "兼容点2"]
    },
    "preference_compatibility": {
        "user1_preference": "similar/complementary/no_preference",
        "user2_preference": "similar/complementary/no_preference", 
        "preference_match": true/false,
        "preference_impact": "positive/neutral/negative",
        "preference_note": "关于偏好匹配的说明"
    },
    "shared_interests": ["共同兴趣1", "共同兴趣2"],
    "shared_books": ["共同书籍1", "共同书籍2"],
    "potential_challenges": ["潜在挑战1", "潜在挑战2"],
    "reading_recommendations": ["推荐书籍1", "推荐书籍2"],
    "activity_suggestions": ["活动建议1", "活动建议2"],
    "growth_opportunities": ["成长机会1", "成长机会2"],
    "exact_matches": 精确匹配数量,
    "semantic_matches": 语义匹配数量,
    "category_matches": 类别匹配数量,
    "match_reasoning": "详细的匹配逻辑说明(3-5句话)"
}`;

    const userPrompt = JSON.stringify({
        user1_profile: profile1,
        user2_profile: profile2,
        analysis_request: "进行全面的读书会伙伴兼容性分析",
        focus_areas: ["相似性", "互补性", "兼容性", "成长潜力"]
    });

    try {
        // 检查AI是否可用
        if (!apiHealthMonitor.shouldUseAI()) {
            const status = apiHealthMonitor.getDegradationStatus();
            if (status.degraded) {
                console.warn(`AI服务降级中：连续${status.consecutiveErrors}次错误，降级时长${Math.round(status.duration/1000)}秒`);
                throw new Error('AI服务降级中，使用传统算法');
            } else {
                console.warn('AI暂时不可用，连续错误过多');
                throw new Error('AI服务暂时不可用');
            }
        }
        
        // 添加速率限制处理和智能重试机制
        let retryCount = 0;
        
        while (retryCount <= RETRY_CONFIG.maxRetries) {
            try {
                // 如果是重试，添加智能延迟
                if (retryCount > 0) {
                    const delay = calculateDelay(retryCount);
                    console.log(`AI API重试 ${retryCount}/${RETRY_CONFIG.maxRetries}，等待 ${delay}ms...`);
                    await sleep(delay);
                }
                
                const response = await fetch(AI_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: AI_MODEL_NAME,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (response.status === 429) {
                    // 速率限制，记录错误并重试
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('API_RATE_LIMIT', {
                        retryCount,
                        endpoint: AI_BASE_URL,
                        responseStatus: 429
                    });
                    retryCount++;
                    if (retryCount > RETRY_CONFIG.maxRetries) {
                        throw new Error('AI API速率限制，请稍后再试');
                    }
                    continue;
                }

                if (!response.ok) {
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('API_NETWORK_ERROR', {
                        retryCount,
                        endpoint: AI_BASE_URL,
                        responseStatus: response.status,
                        responseText: await response.text()
                    });
                    throw new Error(`AI API请求失败: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices[0].message.content;
                
                // 成功获取响应，记录成功
                apiHealthMonitor.recordSuccess();
                
                // 解析JSON
                try {
                    const analysis = JSON.parse(content);
                    
                    // 验证和标准化返回结果
                    const rawAnalysis = {
                        compatibility_score: Math.max(0, Math.min(10, analysis.compatibility_score || 0)),
                        match_type: analysis.match_type || "未知类型",
                        confidence_level: Math.max(0, Math.min(1, analysis.confidence_level || 0.5)),
                        summary: analysis.summary || "AI分析完成",
                        detailed_analysis: analysis.detailed_analysis || {},
                        preference_compatibility: analysis.preference_compatibility || {},
                        shared_interests: analysis.shared_interests || [],
                        shared_books: analysis.shared_books || [],
                        potential_challenges: analysis.potential_challenges || [],
                        reading_recommendations: analysis.reading_recommendations || [],
                        activity_suggestions: analysis.activity_suggestions || [],
                        growth_opportunities: analysis.growth_opportunities || [],
                        exact_matches: analysis.exact_matches || 0,
                        semantic_matches: analysis.semantic_matches || 0,
                        category_matches: analysis.category_matches || 0,
                        match_reasoning: analysis.match_reasoning || "AI分析完成"
                    };
                    
                    // 根据用户偏好调整分数
                    return adjustScoreByPreference(rawAnalysis, profile1, profile2);
                } catch (parseError) {
                    console.warn('AI返回的JSON解析失败:', parseError, content);
                    errorMonitoringSystem.logError('AI_PARSING_ERROR', {
                        content: content?.substring(0, 500) + '...',
                        parseError: parseError.message,
                        retryCount
                    });
                    throw new Error('AI返回格式错误');
                }
                
            } catch (requestError) {
                console.warn(`AI请求失败 (尝试 ${retryCount + 1}/${RETRY_CONFIG.maxRetries + 1}):`, requestError.message);
                
                // 记录错误
                if (requestError.message.includes('429') || requestError.message.includes('速率限制')) {
                    // 速率限制错误已经在上面处理
                } else {
                    apiHealthMonitor.recordError();
                    errorMonitoringSystem.logError('AI_NETWORK_ERROR', {
                        retryCount,
                        errorMessage: requestError.message,
                        endpoint: AI_BASE_URL
                    });
                }
                
                retryCount++;
                if (retryCount > RETRY_CONFIG.maxRetries) {
                    throw requestError;
                }
            }
        }
        
        // 如果所有重试都失败，抛出最后的错误
        throw new Error('AI API请求重试次数用尽');
        
    } catch (error) {
        console.error('AI匹配分析请求失败:', error);
        apiHealthMonitor.recordError();
        errorMonitoringSystem.logError('AI_TIMEOUT_ERROR', {
            errorMessage: error.message,
            endpoint: AI_BASE_URL,
            totalRetries: RETRY_CONFIG.maxRetries
        });
        throw error;
    }
}

// 寻找相似搭档（仅管理员）- 升级版
async function findSimilarMatches() {
    if (!isAdmin || !validateAdminSession()) {
        alert('只有管理员可以进行匹配或会话已过期');
        if (!validateAdminSession()) logout();
        return;
    }
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }

    // 显示进度条
    showProgress();
    
    const matches = [];
    
    // 使用预过滤函数获取优先级排序后的配对
    const pairings = preFilterAndPrioritizePairs(members);
    
    console.log(`总共需要处理 ${pairings.length} 个配对，使用动态并发控制`);
    
    // 用户画像预热 - 提前创建所有用户画像缓存
    await advancedCacheSystem.preheatUserProfiles(members);
    
    // 内存使用优化：清理缓存
    memoryMonitor.checkMemoryUsage();
    
    // 显示所有缓存统计
    const cacheStats = advancedCacheSystem.getCacheStats();
    console.log('全面缓存统计:', cacheStats);
    console.log('内存监控统计:', memoryMonitor.getCacheStats());
    
    // 重置API健康监控状态
    apiHealthMonitor.consecutiveErrors = 0;
    
    const startTime = Date.now();
    let processedCount = 0;
    
    // 初始化进度
    updateProgress(0, pairings.length, 0, `准备分析 ${pairings.length} 个配对...`, startTime);
    
    // 使用分块处理优化内存使用
    const processChunk = async (pairing) => {
        try {
            let result;
            
            // 智能算法选择：优先AI，降级时使用传统算法
            if (apiHealthMonitor.shouldUseAI() && aiAnalysisEnabled) {
                try {
                    result = await calculateAICompatibility(pairing.user1, pairing.user2);
                } catch (aiError) {
                    console.warn(`AI匹配失败，降级到传统算法: ${pairing.user1.name} - ${pairing.user2.name}`, aiError.message);
                    
                    // 使用传统算法作为降级策略
                    result = await calculateSimilarity_deprecated(pairing.user1, pairing.user2);
                    
                    // 标记为降级结果
                    result.degraded = true;
                    result.degradationReason = aiError.message;
                }
            } else {
                // 直接使用传统算法
                result = await calculateSimilarity_deprecated(pairing.user1, pairing.user2);
                result.traditionalMode = !aiAnalysisEnabled;
                result.healthDegraded = apiHealthMonitor.degradedMode;
            }
                
            if (result.score > 0) {
                return {
                    member1: pairing.user1,
                    member2: pairing.user2,
                    score: result.score,
                    reason: result.reason || `${getAnalysisModeLabel(result)}匹配分析完成`,
                    // 向后兼容的字段
                    commonHobbies: getFieldFromResult(result, 'commonHobbies'),
                    commonBooks: getFieldFromResult(result, 'commonBooks'),
                    detailLevel: getFieldFromResult(result, 'detailLevel'),
                    // AI特有字段（仅在AI模式下有效）
                    aiAnalysis: result.analysis?.ai_analysis || null,
                    matchType: result.analysis?.ai_analysis?.match_type || getMatchTypeFromResult(result),
                    confidenceLevel: result.analysis?.ai_analysis?.confidence_level || null,
                    // 传统模式特有字段
                    readingCommitmentCompatibility: result.readingCommitmentCompatibility || null,
                    textPreferenceAnalysis: result.textPreferenceAnalysis || null,
                    personalityProfiles: result.personalityProfiles || null,
                    implicitAnalysis: result.implicitAnalysis || null,
                    deepCompatibilityAnalysis: result.deepCompatibilityAnalysis || null,
                    matchingDimensions: result.matchingDimensions || null,
                    // 降级状态标记
                    degraded: result.degraded || false,
                    degradationReason: result.degradationReason || null,
                    traditionalMode: result.traditionalMode || false,
                    healthDegraded: result.healthDegraded || false,
                    type: 'similar',
                    analysisMode: getAnalysisMode(result)
                };
            }
            return null;
        } catch (error) {
            console.warn(`配对失败 ${pairing.user1.name} - ${pairing.user2.name}:`, error);
            return null;
        }
    };
    
    // 使用分块处理器处理配对
    const chunks = chunkArray(pairings, MEMORY_CONFIG.CHUNK_SIZE);
    let allMatches = [];
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const startIdx = chunkIndex * MEMORY_CONFIG.CHUNK_SIZE;
        const endIdx = Math.min(startIdx + chunk.length, pairings.length);
        
        console.log(`处理块 ${chunkIndex + 1}/${chunks.length}，包含 ${chunk.length} 个配对`);
        
        // 在每个块内使用动态并发
        let i = 0;
        while (i < chunk.length) {
            const currentBatchSize = apiHealthMonitor.getDynamicBatchSize();
            const batch = chunk.slice(i, Math.min(i + currentBatchSize, chunk.length));
            
            // 更新进度
            const currentProcessed = startIdx + i;
            updateProgress(
                currentProcessed, 
                pairings.length, 
                allMatches.length, 
                `正在处理配对 ${currentProcessed + 1}-${currentProcessed + batch.length}...`,
                startTime
            );
            
            // 并发处理批次
            const batchResults = await Promise.all(batch.map(processChunk));
            const validResults = batchResults.filter(result => result !== null);
            allMatches.push(...validResults);
            
            i += batch.length;
            processedCount = startIdx + i;
            
            // 批次间延迟
            if (i < chunk.length) {
                const errorRate = apiHealthMonitor.getErrorRate();
                const delay = errorRate > 0.2 ? 1000 : 500;
                await sleep(delay);
            }
        }
        
        // 块间清理和延迟
        if (chunkIndex < chunks.length - 1) {
            // 检查内存使用
            memoryMonitor.checkMemoryUsage();
            
            // 块间延迟，让出CPU
            await sleep(200);
            
            console.log(`块 ${chunkIndex + 1} 完成，当前找到 ${allMatches.length} 个匹配`);
        }
    }
    
    matches.push(...allMatches);
    
    // 完成所有匹配
    matches.sort((a, b) => b.score - a.score);
    
    // 显示完成进度
    updateProgress(
        pairings.length, 
        pairings.length, 
        matches.length, 
        '匹配分析完成！',
        startTime
    );
    
    const titleInfo = getMatchingTitle(matches, 'similar');
    displayMatches(matches.slice(0, 10), titleInfo.title, titleInfo.subtitle);
}

// 寻找互补搭档（仅管理员）- 升级版
async function findComplementaryMatches() {
    if (!isAdmin || !validateAdminSession()) {
        alert('只有管理员可以进行匹配或会话已过期');
        if (!validateAdminSession()) logout();
        return;
    }
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }

    // 显示进度条
    showProgress();
    
    const matches = [];
    
    // 使用预过滤函数获取优先级排序后的配对
    const pairings = preFilterAndPrioritizePairs(members);
    
    console.log(`互补匹配：总共需要处理 ${pairings.length} 个配对，使用动态并发控制`);
    
    // 内存使用优化：清理缓存
    memoryMonitor.checkMemoryUsage();
    
    // 显示所有缓存统计
    const cacheStats = advancedCacheSystem.getCacheStats();
    console.log('全面缓存统计:', cacheStats);
    console.log('内存监控统计:', memoryMonitor.getCacheStats());
    
    // 重置API健康监控状态
    apiHealthMonitor.consecutiveErrors = 0;
    
    const startTime = Date.now();
    let processedCount = 0;
    
    // 初始化进度
    updateProgress(0, pairings.length, 0, `准备分析 ${pairings.length} 个互补配对...`, startTime);
    
    // 使用分块处理优化内存使用
    const processChunk = async (pairing) => {
        try {
            let result;
            
            // 智能算法选择：优先AI，降级时使用传统算法
            if (apiHealthMonitor.shouldUseAI() && aiAnalysisEnabled) {
                try {
                    result = await calculateAICompatibility(pairing.user1, pairing.user2);
                } catch (aiError) {
                    console.warn(`AI匹配失败，降级到传统算法: ${pairing.user1.name} - ${pairing.user2.name}`, aiError.message);
                    
                    // 使用传统算法作为降级策略
                    result = await calculateSimilarity_deprecated(pairing.user1, pairing.user2);
                    
                    // 标记为降级结果
                    result.degraded = true;
                    result.degradationReason = aiError.message;
                }
            } else {
                // 直接使用传统算法
                result = await calculateSimilarity_deprecated(pairing.user1, pairing.user2);
                result.traditionalMode = !aiAnalysisEnabled;
                result.healthDegraded = apiHealthMonitor.degradedMode;
            }
                
            return {
                member1: pairing.user1,
                member2: pairing.user2,
                score: result.score,
                reason: result.reason || `${getAnalysisModeLabel(result)}匹配分析完成`,
                // 向后兼容的字段
                commonHobbies: getFieldFromResult(result, 'commonHobbies'),
                commonBooks: getFieldFromResult(result, 'commonBooks'),
                detailLevel: getFieldFromResult(result, 'detailLevel'),
                // AI特有字段（仅在AI模式下有效）
                aiAnalysis: result.analysis?.ai_analysis || null,
                matchType: result.analysis?.ai_analysis?.match_type || getMatchTypeFromResult(result),
                confidenceLevel: result.analysis?.ai_analysis?.confidence_level || null,
                // 传统模式特有字段
                readingCommitmentCompatibility: result.readingCommitmentCompatibility || null,
                textPreferenceAnalysis: result.textPreferenceAnalysis || null,
                personalityProfiles: result.personalityProfiles || null,
                implicitAnalysis: result.implicitAnalysis || null,
                deepCompatibilityAnalysis: result.deepCompatibilityAnalysis || null,
                matchingDimensions: result.matchingDimensions || null,
                // 降级状态标记
                degraded: result.degraded || false,
                degradationReason: result.degradationReason || null,
                traditionalMode: result.traditionalMode || false,
                healthDegraded: result.healthDegraded || false,
                type: 'complementary',
                analysisMode: getAnalysisMode(result)
            };
        } catch (error) {
            console.warn(`配对失败 ${pairing.user1.name} - ${pairing.user2.name}:`, error);
            // 返回一个低分结果而不是null，确保所有配对都有结果
            return {
                member1: pairing.user1,
                member2: pairing.user2,
                score: 0.1,
                reason: "分析失败",
                commonHobbies: [],
                commonBooks: [],
                detailLevel: { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 },
                aiAnalysis: null,
                matchType: "未知",
                confidenceLevel: 0,
                degraded: false,
                traditionalMode: false,
                healthDegraded: false,
                type: 'complementary',
                analysisMode: 'error'
            };
        }
    };
    
    // 使用分块处理器处理配对
    const chunks = chunkArray(pairings, MEMORY_CONFIG.CHUNK_SIZE);
    let allMatches = [];
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const startIdx = chunkIndex * MEMORY_CONFIG.CHUNK_SIZE;
        
        console.log(`处理块 ${chunkIndex + 1}/${chunks.length}，包含 ${chunk.length} 个配对`);
        
        // 在每个块内使用动态并发
        let i = 0;
        while (i < chunk.length) {
            const currentBatchSize = apiHealthMonitor.getDynamicBatchSize();
            const batch = chunk.slice(i, Math.min(i + currentBatchSize, chunk.length));
            
            // 更新进度
            const currentProcessed = startIdx + i;
            updateProgress(
                currentProcessed, 
                pairings.length, 
                allMatches.length, 
                `正在处理互补配对 ${currentProcessed + 1}-${currentProcessed + batch.length}...`,
                startTime
            );
            
            // 并发处理批次
            const batchResults = await Promise.all(batch.map(processChunk));
            allMatches.push(...batchResults);
            
            i += batch.length;
            processedCount = startIdx + i;
            
            // 批次间延迟
            if (i < chunk.length) {
                const errorRate = apiHealthMonitor.getErrorRate();
                const delay = errorRate > 0.2 ? 1000 : 500;
                await sleep(delay);
            }
        }
        
        // 块间清理和延迟
        if (chunkIndex < chunks.length - 1) {
            // 检查内存使用
            memoryMonitor.checkMemoryUsage();
            
            // 块间延迟，让出CPU
            await sleep(200);
            
            console.log(`块 ${chunkIndex + 1} 完成，当前处理 ${allMatches.length} 个配对`);
        }
    }
    
    matches.push(...allMatches);
    
    // 互补匹配排序：根据分析模式使用不同的排序策略
    matches.sort((a, b) => {
        if (aiAnalysisEnabled) {
            // AI模式：基于AI分析的匹配类型和成长潜力排序
            const aGrowthScore = (a.aiAnalysis?.growth_opportunities?.length || 0) * 0.5 + 
                               (a.aiAnalysis?.detailed_analysis?.complementarity_score || 0) * 0.3 +
                               (a.confidenceLevel || 0) * 0.2;
            const bGrowthScore = (b.aiAnalysis?.growth_opportunities?.length || 0) * 0.5 + 
                               (b.aiAnalysis?.detailed_analysis?.complementarity_score || 0) * 0.3 +
                               (b.confidenceLevel || 0) * 0.2;
            
            // 如果都没有AI分析数据，则按基础分数排序
            if (aGrowthScore === 0 && bGrowthScore === 0) {
                return b.score - a.score;
            }
            
            return bGrowthScore - aGrowthScore;
        } else {
            // 传统模式：基于传统匹配维度排序，互补性优先
            const aComplementarity = (a.matchingDimensions?.growth_potential || 0) + 
                                   (a.matchingDimensions?.implicit_resonance || 0) * 0.8;
            const bComplementarity = (b.matchingDimensions?.growth_potential || 0) + 
                                   (b.matchingDimensions?.implicit_resonance || 0) * 0.8;
            
            if (aComplementarity === 0 && bComplementarity === 0) {
                return b.score - a.score;
            }
            
            return bComplementarity - aComplementarity;
        }
    });
    
    // 显示完成进度
    updateProgress(
        pairings.length, 
        pairings.length, 
        matches.length, 
        '互补匹配分析完成！',
        startTime
    );
    
    const titleInfo = getMatchingTitle(matches, 'complementary');
    displayMatches(matches.slice(0, 10), titleInfo.title, titleInfo.subtitle);
}

// 显示匹配结果
function displayMatches(matches, title, subtitle = null) {
    const resultsDiv = document.getElementById('matchResults');
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-data">没有找到合适的匹配</div>';
        return;
    }
    
    // 生成降级状态统计
    const degradedCount = matches.filter(m => m.degraded).length;
    const traditionalCount = matches.filter(m => m.traditionalMode || m.healthDegraded).length;
    const aiCount = matches.filter(m => m.aiAnalysis && !m.degraded).length;
    
    let statusInfo = '';
    if (degradedCount > 0 || traditionalCount > 0) {
        statusInfo = `
            <div style="margin-bottom: 15px; padding: 12px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                <h4 style="margin: 0 0 8px 0; color: #1565c0;">📊 匹配模式统计</h4>
                <div style="display: flex; gap: 15px; font-size: 13px;">
                    ${aiCount > 0 ? `<span>🧠 AI智能: ${aiCount}个</span>` : ''}
                    ${degradedCount > 0 ? `<span>🔀 AI降级: ${degradedCount}个</span>` : ''}
                    ${traditionalCount > 0 ? `<span>📊 传统算法: ${traditionalCount}个</span>` : ''}
                </div>
                ${subtitle ? `<div style="margin-top: 5px; font-size: 12px; color: #666;">${subtitle}</div>` : ''}
            </div>
        `;
    } else if (subtitle) {
        statusInfo = `
            <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 13px; color: #666;">${subtitle}</div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = `
        <div class="section">
            <h2>${title}</h2>
            ${statusInfo}
            <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
                <p>📊 管理员专用：智能匹配结果分析</p>
                <small>匹配类型：✅ 精确匹配 (1.0分) | 🔗 语义匹配 (0.8分) | 📂 类别匹配 (0.6分)</small>
            </div>
            ${matches.map((match, index) => `
                <div class="${getMatchItemClass(match)}">
                    <h3>匹配 ${index + 1} ${generateMatchIcon(match.score)} ${generateMatchStatusTags(match)}</h3>
                    ${generateMatchScoreHtml(match)}
                    
                    <div class="match-details">
                        <div class="person-info">
                            <h4>${match.member1.name}</h4>
                            <div>兴趣：${match.member1.hobbies.join('、') || '未填写'}</div>
                            <div>最近读的书：${match.member1.books.slice(0, 2).join('、') || '未填写'}</div>
                        </div>
                        
                        <div class="person-info">
                            <h4>${match.member2.name}</h4>
                            <div>兴趣：${match.member2.hobbies.join('、') || '未填写'}</div>
                            <div>最近读的书：${match.member2.books.slice(0, 2).join('、') || '未填写'}</div>
                        </div>
                    </div>
                    
                    ${generateMatchDetails(match)}
                    ${generateDegradationInfo(match)}
                </div>
            `).join('')}
        </div>
    `;
    
    // 滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 生成匹配分数和描述的HTML
function generateMatchScoreHtml(match) {
    const score = match.score;
    const scoreText = score.toFixed(1);

    if (match.type === 'similar') {
        const breakdown = `(精确${match.detailLevel.exactMatches} + 语义${match.detailLevel.semanticMatches} + 类别${match.detailLevel.categoryMatches})`;
        
        // 添加新维度的分数显示
        let enhancedBreakdown = '';
        if (match.readingCommitmentCompatibility) {
            enhancedBreakdown += ` | 阅读承诺: ${(match.readingCommitmentCompatibility.score * 0.8).toFixed(1)}分`;
        }
        if (match.textPreferenceAnalysis && match.textPreferenceAnalysis.similarity_score > 0) {
            enhancedBreakdown += ` | AI文本分析: ${(match.textPreferenceAnalysis.similarity_score * 1.5).toFixed(1)}分`;
        }
        
        return `
            <div class="match-score">
                智能相似度：${scoreText} 分
                <span class="match-breakdown">${breakdown}${enhancedBreakdown}</span>
            </div>`;
    } else { // complementary
        let description = '';
        if (score <= 1.0) {
            description = `差异度：高 (仅 ${scoreText} 分共同点)，<span class="complementary-high">极具互补潜力</span>`;
        } else if (score > 1.0 && score < 2.5) {
            description = `差异度：中 (有 ${scoreText} 分共同点)，<span class="complementary-medium">可共同探索</span>`;
        } else {
            description = `差异度：低 (高达 ${scoreText} 分共同点)，<span class="complementary-low">更像相似搭档</span>`;
        }
        return `<div class="match-score">${description}</div>`;
    }
}

// 生成匹配图标
function generateMatchIcon(score) {
    if (score >= 3) return '🔥';
    if (score >= 2) return '⭐';
    if (score >= 1) return '✨';
    return '💫';
}

// 生成深度匹配详情（升级版）
function generateMatchDetails(match) {
    let detailsHtml = '';
    
    // ===== 传统匹配结果 =====
    
    // 兴趣爱好匹配详情
    if (match.commonHobbies && match.commonHobbies.length > 0) {
        const hobbyDetails = categorizeMatches(match.commonHobbies);
        detailsHtml += `
            <div class="common-interests">
                <h4>🎯 兴趣爱好匹配</h4>
                ${hobbyDetails}
            </div>
        `;
    }
    
    // 书籍匹配详情
    if (match.commonBooks && match.commonBooks.length > 0) {
        const bookDetails = categorizeMatches(match.commonBooks);
        detailsHtml += `
            <div class="common-interests">
                <h4>📚 书籍阅读匹配</h4>
                ${bookDetails}
            </div>
        `;
    }
    
    // 阅读承诺兼容性详情
    if (match.readingCommitmentCompatibility && match.readingCommitmentCompatibility.score > 0) {
        const commitment = match.readingCommitmentCompatibility;
        const compatibilityIcon = {
            'perfect': '💯',
            'good': '✨',
            'moderate': '⚖️',
            'poor': '⚠️',
            'unknown': '❓'
        }[commitment.compatibility] || '❓';
        
        detailsHtml += `
            <div class="common-interests">
                <h4>${compatibilityIcon} 阅读承诺兼容性</h4>
                <div class="match-type-group">
                    <span class="match-type-label">兼容度：</span>
                    <span class="tag ${commitment.compatibility}-tag">${commitment.description}</span>
                    <span class="tag score-tag">兼容分数: ${(commitment.score * 0.8).toFixed(1)}</span>
                </div>
            </div>
        `;
    }
    
    // ===== 深度AI分析结果 =====
    
    // 偏好匹配分析显示
    if (match.aiAnalysis && match.aiAnalysis.preference_analysis) {
        const prefAnalysis = match.aiAnalysis.preference_analysis;
        const getPreferenceIcon = (impact) => {
            const icons = {
                'positive': '✅',
                'neutral': '⚖️', 
                'negative': '⚠️'
            };
            return icons[impact] || '❓';
        };
        
        const getPreferenceLabel = (pref) => {
            const labels = {
                'similar': '🎯 相似型',
                'complementary': '🌈 互补型',
                'no_preference': '✨ 都可以'
            };
            return labels[pref] || '未设置';
        };
        
        detailsHtml += `
            <div class="common-interests preference-analysis">
                <h4>${getPreferenceIcon(prefAnalysis.preference_impact)} 匹配偏好分析</h4>
                <div class="match-type-group">
                    <span class="match-type-label">用户偏好：</span>
                    <span class="tag preference-tag">${getPreferenceLabel(prefAnalysis.user1_preference)}</span>
                    <span class="vs-indicator">vs</span>
                    <span class="tag preference-tag">${getPreferenceLabel(prefAnalysis.user2_preference)}</span>
                </div>
                <div class="match-type-group">
                    <span class="match-type-label">偏好匹配：</span>
                    <span class="tag ${prefAnalysis.preference_match ? 'exact' : 'poor'}-tag">
                        ${prefAnalysis.preference_match ? '✓ 匹配' : '✗ 不匹配'}
                    </span>
                    <span class="tag score-tag">调整系数: ${prefAnalysis.adjustment_factor.toFixed(2)}</span>
                </div>
                ${prefAnalysis.adjustment_note ? `
                    <div class="preference-note">
                        <strong>说明：</strong>${prefAnalysis.adjustment_note}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 升级版AI文本偏好分析
    if (match.textPreferenceAnalysis && match.textPreferenceAnalysis.similarity_score > 0) {
        const analysis = match.textPreferenceAnalysis;
        detailsHtml += `
            <div class="common-interests deep-analysis">
                <h4>🤖 深度AI文本分析</h4>
                <div class="match-type-group">
                    <span class="match-type-label">语义相似度：</span>
                    <span class="tag ai-analysis-tag">${(analysis.similarity_score * 100).toFixed(0)}% 相似</span>
                    ${analysis.semantic_depth_score ? `<span class="tag depth-tag">深度: ${(analysis.semantic_depth_score * 100).toFixed(0)}%</span>` : ''}
                </div>
                ${analysis.common_elements && analysis.common_elements.length > 0 ? `
                    <div class="match-type-group">
                        <span class="match-type-label">🔍 表面共同点：</span>
                        ${analysis.common_elements.map(element => `
                            <span class="tag surface-element-tag">${element}</span>
                        `).join('')}
                    </div>
                ` : ''}
                ${analysis.deep_connections && analysis.deep_connections.length > 0 ? `
                    <div class="match-type-group">
                        <span class="match-type-label">🧠 深层连接：</span>
                        ${analysis.deep_connections.map(connection => `
                            <span class="tag deep-connection-tag">${connection}</span>
                        `).join('')}
                    </div>
                ` : ''}
                ${analysis.recommendation_reasons && analysis.recommendation_reasons.length > 0 ? `
                    <div class="match-type-group">
                        <span class="match-type-label">💡 推荐理由：</span>
                        <div class="recommendation-list">
                            ${analysis.recommendation_reasons.map(reason => `
                                <div class="recommendation-item">• ${reason}</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${analysis.potential_book_recommendations && analysis.potential_book_recommendations.length > 0 ? `
                    <div class="match-type-group">
                        <span class="match-type-label">📖 建议共读书籍：</span>
                        ${analysis.potential_book_recommendations.map(book => `
                            <span class="tag book-rec-tag">${book}</span>
                        `).join('')}
                    </div>
                ` : ''}
                ${analysis.growth_potential ? `
                    <div class="growth-potential">
                        <strong>🌱 成长潜力：</strong> ${analysis.growth_potential}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 新AI分析结果显示
    if (match.aiAnalysis && match.aiAnalysis.detailed_analysis) {
        const analysis = match.aiAnalysis;
        const details = analysis.detailed_analysis;
        
        detailsHtml += `
            <div class="common-interests ai-analysis">
                <h4>🤖 AI深度匹配分析</h4>
                <div class="match-summary">
                    <p><strong>匹配类型：</strong>${analysis.match_type}</p>
                    <p><strong>分析总结：</strong>${analysis.summary}</p>
                </div>
                
                <div class="analysis-dimensions">
                    <div class="dimension-score">
                        <span>相似性：</span>
                        <span class="score">${(details.similarity_score || 0).toFixed(1)}/10</span>
                    </div>
                    <div class="dimension-score">
                        <span>互补性：</span>
                        <span class="score">${(details.complementarity_score || 0).toFixed(1)}/10</span>
                    </div>
                    <div class="dimension-score">
                        <span>兼容性：</span>
                        <span class="score">${(details.compatibility_score || 0).toFixed(1)}/10</span>
                    </div>
                </div>
                
                ${details.similarity_highlights && details.similarity_highlights.length > 0 ? `
                    <div class="highlights-section">
                        <h5>🎯 相似点：</h5>
                        <ul>${details.similarity_highlights.map(h => `<li>${h}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${details.complementarity_highlights && details.complementarity_highlights.length > 0 ? `
                    <div class="highlights-section">
                        <h5>🔄 互补点：</h5>
                        <ul>${details.complementarity_highlights.map(h => `<li>${h}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${analysis.growth_opportunities && analysis.growth_opportunities.length > 0 ? `
                    <div class="highlights-section">
                        <h5>🌱 成长机会：</h5>
                        <ul>${analysis.growth_opportunities.map(o => `<li>${o}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                
                ${analysis.reading_recommendations && analysis.reading_recommendations.length > 0 ? `
                    <div class="highlights-section">
                        <h5>📚 推荐书籍：</h5>
                        <ul>${analysis.reading_recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 原深度兼容性分析已集成到上面的AI分析中，此处不再需要
    
    // 原匹配维度得分已集成到上面的AI分析维度中，此处不再需要
    
    return detailsHtml;
}

// ===== 深度分析辅助函数 =====

// 生成人格维度比较
function generatePersonalityComparison(p1, p2) {
    const dimensions = [
        { key: 'exploration_vs_certainty', label: '探索vs确定性', icon: '🔍' },
        { key: 'emotional_vs_rational', label: '感性vs理性', icon: '❤️🧠' },
        { key: 'introspective_vs_social', label: '内省vs社交', icon: '🪞👥' },
        { key: 'escapist_vs_realistic', label: '逃避vs现实', icon: '🌙☀️' },
        { key: 'fast_paced_vs_contemplative', label: '快节奏vs沉思', icon: '⚡🧘' }
    ];
    
    let html = '';
    dimensions.forEach(dim => {
        const val1 = p1.personality_dimensions?.[dim.key] || 0;
        const val2 = p2.personality_dimensions?.[dim.key] || 0;
        const similarity = 1 - Math.abs(val1 - val2);
        const matchLevel = similarity > 0.8 ? 'high' : similarity > 0.5 ? 'medium' : 'low';
        
        html += `
            <div class="personality-dimension">
                <span class="dimension-icon">${dim.icon}</span>
                <span class="dimension-name">${dim.label}</span>
                <div class="dimension-bars">
                    <div class="member-bar" style="width: ${val1 * 100}%"></div>
                    <div class="member-bar member2" style="width: ${val2 * 100}%"></div>
                </div>
                <span class="similarity-indicator ${matchLevel}">${(similarity * 100).toFixed(0)}%</span>
            </div>
        `;
    });
    
    return html;
}

// 生成文化取向比较
function generateCulturalOrientation(p1, p2) {
    if (p1.cultural_orientation && p2.cultural_orientation) {
        const match = p1.cultural_orientation === p2.cultural_orientation;
        return `
            <div class="cultural-orientation">
                <span class="match-type-label">文化取向：</span>
                <span class="tag cultural-tag">${getCulturalLabel(p1.cultural_orientation)}</span>
                <span class="vs-indicator">${match ? '✓' : 'vs'}</span>
                <span class="tag cultural-tag">${getCulturalLabel(p2.cultural_orientation)}</span>
            </div>
        `;
    }
    return '';
}

// 生成隐含偏好比较
function generateImplicitComparison(i1, i2) {
    let html = '';
    
    // 主题共鸣
    const commonThemes = findCommonElements(i1.implicit_themes || [], i2.implicit_themes || []);
    if (commonThemes.length > 0) {
        html += `
            <div class="implicit-section">
                <span class="match-type-label">🎨 共同主题：</span>
                ${commonThemes.map(theme => `<span class="tag theme-tag">${theme}</span>`).join('')}
            </div>
        `;
    }
    
    // 文化亲和力
    const commonCultures = findCommonElements(i1.cultural_affinities || [], i2.cultural_affinities || []);
    if (commonCultures.length > 0) {
        html += `
            <div class="implicit-section">
                <span class="match-type-label">🌍 文化共鸣：</span>
                ${commonCultures.map(culture => `<span class="tag culture-tag">${culture}</span>`).join('')}
            </div>
        `;
    }
    
    // 叙事原型
    const commonArchetypes = findCommonElements(i1.narrative_archetypes || [], i2.narrative_archetypes || []);
    if (commonArchetypes.length > 0) {
        html += `
            <div class="implicit-section">
                <span class="match-type-label">📖 叙事共性：</span>
                ${commonArchetypes.map(archetype => `<span class="tag archetype-tag">${archetype}</span>`).join('')}
            </div>
        `;
    }
    
    return html;
}

// 生成兼容性维度展示
function generateCompatibilityDimensions(dimensions) {
    const dimList = [
        { key: 'cognitive_synergy', label: '认知协同', icon: '🧠' },
        { key: 'aesthetic_harmony', label: '美学和谐', icon: '🎨' },
        { key: 'growth_potential', label: '成长潜力', icon: '🌱' },
        { key: 'emotional_resonance', label: '情感共鸣', icon: '💫' },
        { key: 'exploratory_balance', label: '探索平衡', icon: '⚖️' }
    ];
    
    let html = '<div class="compatibility-dimensions">';
    dimList.forEach(dim => {
        const value = dimensions[dim.key] || 0;
        const percentage = (value * 100).toFixed(0);
        html += `
            <div class="compat-dimension">
                <span class="dim-icon">${dim.icon}</span>
                <span class="dim-label">${dim.label}</span>
                <div class="dim-bar">
                    <div class="dim-fill" style="width: ${percentage}%"></div>
                    <span class="dim-value">${percentage}%</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

// 辅助函数：获取兼容性类型标签
function getCompatibilityTypeLabel(type) {
    const labels = {
        'mirror': '镜像型',
        'complementary': '互补型',
        'bridge': '桥梁型',
        'complex': '复合型'
    };
    return labels[type] || type;
}

// 辅助函数：获取化学反应标签
function getChemistryLabel(chemistry) {
    const labels = {
        'explosive': '💥 爆发式',
        'steady': '🔄 稳定式',
        'gentle': '🌸 温和式',
        'challenging': '⚡ 挑战式',
        'inspiring': '✨ 启发式'
    };
    return labels[chemistry] || chemistry;
}

// 辅助函数：获取关系动态标签
function getRelationshipDynamicsLabel(dynamics) {
    const labels = {
        'mentor_mentee': '师生型',
        'equal_explorers': '共探型',
        'complementary_guides': '互导型',
        'kindred_spirits': '知音型'
    };
    return labels[dynamics] || dynamics;
}

// 辅助函数：获取文化标签
function getCulturalLabel(orientation) {
    const labels = {
        'eastern': '东方文化',
        'western': '西方文化',
        'global': '全球视野',
        'local': '本土文化'
    };
    return labels[orientation] || orientation;
}

// 辅助函数：找出共同元素
function findCommonElements(arr1, arr2) {
    return arr1.filter(item => arr2.includes(item));
}

// 生成降级信息显示
function generateDegradationInfo(match) {
    if (!match.degraded && !match.degradationReason && !match.healthDegraded) {
        return '';
    }
    
    let degradationHtml = '<div class="common-interests degradation-info" style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-left: 5px solid #ff9800;">';
    degradationHtml += '<h4>⚠️ 降级处理信息</h4>';
    
    if (match.degraded) {
        degradationHtml += `
            <div class="match-type-group">
                <span class="match-type-label">降级原因：</span>
                <span class="tag degraded-tag">${match.degradationReason || 'AI服务异常'}</span>
            </div>
            <div class="match-type-group">
                <span class="match-type-label">处理方式：</span>
                <span class="tag ai-element-tag">自动切换到传统匹配算法</span>
            </div>
        `;
    }
    
    if (match.healthDegraded) {
        const status = apiHealthMonitor.getDegradationStatus();
        degradationHtml += `
            <div class="match-type-group">
                <span class="match-type-label">系统状态：</span>
                <span class="tag traditional-degraded-tag">API健康降级模式</span>
            </div>
            <div class="match-type-group">
                <span class="match-type-label">降级时长：</span>
                <span class="tag score-tag">${Math.round(status.duration/1000)}秒</span>
            </div>
        `;
    }
    
    degradationHtml += '<div style="margin-top: 8px; font-size: 12px; color: #ef6c00;">';
    degradationHtml += '💡 降级模式确保服务连续性，算法会在条件恢复后自动切换回AI模式';
    degradationHtml += '</div>';
    
    degradationHtml += '</div>';
    
    return degradationHtml;
}

// 分类显示匹配项
function categorizeMatches(matches) {
    const exact = matches.filter(m => m.type === 'exact');
    const semantic = matches.filter(m => m.type === 'contains');
    const category = matches.filter(m => m.type === 'category');
    
    let html = '';
    
    if (exact.length > 0) {
        html += `<div class="match-type-group">
            <span class="match-type-label">✅ 完全一致：</span>
            ${exact.map(m => `<span class="tag exact-tag">${m.item}</span>`).join('')}
        </div>`;
    }
    
    if (semantic.length > 0) {
        html += `<div class="match-type-group">
            <span class="match-type-label">🔗 AI语义相关：</span>
            ${semantic.map(m => `<span class="tag semantic-tag">${m.item}</span>`).join('')}
        </div>`;
    }
    
    if (category.length > 0) {
        html += `<div class="match-type-group">
            <span class="match-type-label">📂 同类兴趣：</span>
            ${category.map(m => `
                <span class="tag category-tag" title="${m.details || ''}">${m.item}</span>
            `).join('')}
        </div>`;
    }
    
    return html;
}

// ===== 监控仪表板管理函数 =====

/**
 * 刷新监控数据显示
 */
function refreshMonitoringData() {
    Logger.monitoring('刷新监控数据...');
    
    // 更新系统健康状态
    errorMonitoringSystem.updateSystemHealth();
    
    // 获取最新统计数据
    const errorStats = errorMonitoringSystem.getErrorStats();
    const healthReport = errorMonitoringSystem.getHealthReport();
    
    // 更新错误统计显示
    document.getElementById('totalErrors').textContent = errorStats.total;
    document.getElementById('hourlyErrors').textContent = errorStats.lastHour;
    document.getElementById('recentErrors').textContent = errorStats.last5min;
    
    // 更新性能统计显示
    document.getElementById('totalRequests').textContent = healthReport.performance.totalRequests;
    document.getElementById('successRate').textContent = healthReport.performance.successRate;
    document.getElementById('avgResponseTime').textContent = healthReport.performance.averageResponseTime;
    
    // 更新系统健康状态显示
    const healthElement = document.getElementById('systemHealth');
    const healthMap = {
        'healthy': { text: '良好', color: '#28a745' },
        'degraded': { text: '降级', color: '#ffc107' },
        'critical': { text: '严重', color: '#dc3545' },
        'maintenance': { text: '维护', color: '#6c757d' }
    };
    
    const healthInfo = healthMap[healthReport.systemHealth.overall] || healthMap['critical'];
    healthElement.textContent = healthInfo.text;
    healthElement.style.color = healthInfo.color;
    
    Logger.monitoring('监控数据刷新完成');
}

/**
 * 显示详细健康报告
 */
function showDetailedHealthReport() {
    const report = errorMonitoringSystem.getHealthReport();
    
    let reportHtml = `
        <div style="max-width: 800px; max-height: 600px; overflow-y: auto; padding: 20px; background: white; border-radius: 12px;">
            <h3 style="margin-bottom: 20px; color: #2c3e50;">📋 系统健康详细报告</h3>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #34495e; margin-bottom: 10px;">🏥 系统健康状态</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div><strong>整体状态:</strong> ${report.systemHealth.overall}</div>
                    <div><strong>API状态:</strong> ${report.systemHealth.api}</div>
                    <div><strong>缓存状态:</strong> ${report.systemHealth.cache}</div>
                    <div><strong>内存状态:</strong> ${report.systemHealth.memory}</div>
                    <div><strong>最后检查:</strong> ${new Date(report.systemHealth.lastHealthCheck).toLocaleString('zh-CN')}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #34495e; margin-bottom: 10px;">📊 错误统计</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div><strong>总错误数:</strong> ${report.errorStats.total}</div>
                    <div><strong>最近24小时:</strong> ${report.errorStats.last24h}</div>
                    <div><strong>最近1小时:</strong> ${report.errorStats.lastHour}</div>
                    <div><strong>最近5分钟:</strong> ${report.errorStats.last5min}</div>
                    <div><strong>整体错误率:</strong> ${(report.errorStats.overallErrorRate * 100).toFixed(2)}%</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #34495e; margin-bottom: 10px;">⚡ 性能指标</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div><strong>总请求数:</strong> ${report.performance.totalRequests}</div>
                    <div><strong>成功率:</strong> ${report.performance.successRate}</div>
                    <div><strong>平均响应时间:</strong> ${report.performance.averageResponseTime}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #34495e; margin-bottom: 10px;">🗄️ 缓存健康</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div><strong>AI缓存大小:</strong> ${report.cacheHealth.aiCacheSize}</div>
                    <div><strong>AI缓存命中率:</strong> ${report.cacheHealth.aiCacheHitRate}</div>
                    <div><strong>用户画像缓存:</strong> ${report.cacheHealth.userProfilesSize}</div>
                    <div><strong>请求缓存大小:</strong> ${report.cacheHealth.requestCacheSize}</div>
                </div>
            </div>
            
            ${report.recommendations.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #34495e; margin-bottom: 10px;">💡 优化建议</h4>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        ${report.recommendations.map(rec => `
                            <div style="margin-bottom: 8px;">
                                <span style="font-weight: bold; color: ${rec.priority === 'high' ? '#dc3545' : rec.priority === 'medium' ? '#fd7e14' : '#6c757d'};">
                                    [${rec.priority.toUpperCase()}]
                                </span>
                                ${rec.message}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="closeHealthReport()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    关闭报告
                </button>
            </div>
        </div>
    `;
    
    // 创建模态框显示报告
    const modal = document.createElement('div');
    modal.id = 'healthReportModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    modal.innerHTML = reportHtml;
    
    document.body.appendChild(modal);
    
    // 点击外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeHealthReport();
        }
    });
}

/**
 * 关闭健康报告模态框
 */
function closeHealthReport() {
    const modal = document.getElementById('healthReportModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 重置监控数据
 */
function resetMonitoringData() {
    if (confirm('确定要重置所有监控数据吗？这将清除错误日志、性能统计等数据。')) {
        errorMonitoringSystem.resetMonitoring();
        refreshMonitoringData();
        alert('✅ 监控数据已重置');
    }
}

/**
 * 显示API健康状态（保持向后兼容）
 */
function showApiHealthStatus() {
    const report = errorMonitoringSystem.getHealthReport();
    const apiStats = apiHealthMonitor;
    
    const statusInfo = `
📊 API健康状态报告

🔹 基础统计:
  • 成功请求: ${apiStats.successCount}
  • 失败请求: ${apiStats.errorCount}
  • 连续错误: ${apiStats.consecutiveErrors}
  • 当前批处理大小: ${apiStats.currentBatchSize}
  • 错误率: ${(apiStats.getErrorRate() * 100).toFixed(2)}%

🔹 系统状态:
  • 整体健康: ${report.systemHealth.overall}
  • API状态: ${report.systemHealth.api}
  • 缓存状态: ${report.systemHealth.cache}
  • 内存状态: ${report.systemHealth.memory}

🔹 降级状态:
  • 降级模式: ${apiStats.degradedMode ? '已启用' : '未启用'}
  • AI分析开关: ${aiAnalysisEnabled ? '开启' : '关闭'}

点击"详细报告"查看更多信息...
    `;
    
    alert(statusInfo);
}

/**
 * 重置API健康状态（保持向后兼容）
 */
function resetApiHealth() {
    if (confirm('确定要重置API健康监控数据吗？')) {
        // 重置API健康监控器
        apiHealthMonitor.errorCount = 0;
        apiHealthMonitor.successCount = 0;
        apiHealthMonitor.consecutiveErrors = 0;
        apiHealthMonitor.lastErrorTime = null;
        apiHealthMonitor.currentBatchSize = 3;
        apiHealthMonitor.degradedMode = false;
        apiHealthMonitor.degradationStartTime = null;
        
        // 重置错误监控系统
        errorMonitoringSystem.resetMonitoring();
        
        // 启用AI分析（如果被禁用）
        aiAnalysisEnabled = true;
        updateAiToggleUI();
        
        // 刷新监控显示
        refreshMonitoringData();
        
        alert('✅ API健康状态已重置');
    }
}

// 页面加载时初始化监控仪表板
// 新增：验证管理员会话 (移动到全局作用域)
function validateAdminSession() {
    const loginTime = sessionStorage.getItem('adminLoginTime');
    if (!loginTime) {
        return false;
    }

    const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2小时
    const currentTime = Date.now();

    if (currentTime - loginTime > SESSION_TIMEOUT) {
        return false;
    }

    // 每次验证通过，刷新登录时间（活动检测）
    sessionStorage.setItem('adminLoginTime', currentTime);
    return true;
}

const originalShowLoggedInView = showLoggedInView;
showLoggedInView = function() {
    originalShowLoggedInView.apply(this, arguments);
    
    // 如果是管理员，初始化监控数据
    if (isAdmin) {
        setTimeout(() => {
            refreshMonitoringData();
            
            // 智能监控刷新策略
            let monitoringConfig = {
                refreshInterval: 2 * 60 * 1000, // 2分钟
                isMonitoringVisible: false,
                pauseWhenHidden: true
            };
            
            // 检测监控面板是否可见
            function isMonitoringPanelVisible() {
                const monitoringElements = [
                    document.getElementById('totalErrors'),
                    document.getElementById('systemHealth')
                ];
                return monitoringElements.some(el => el && el.offsetParent !== null);
            }

            // 智能刷新监控数据
            function smartRefreshMonitoring() {
                // 检查是否应该刷新
                if (monitoringConfig.pauseWhenHidden && !isMonitoringPanelVisible()) {
                    Logger.debug('监控面板不可见，跳过刷新');
                    return;
                }
                
                refreshMonitoringData();
            }

            // 设置定期刷新监控数据
            if (!window.monitoringInterval) {
                window.monitoringInterval = setInterval(smartRefreshMonitoring, monitoringConfig.refreshInterval);
            }
        }, 1000);
    }
};

// 退出登录时清除监控定时器
const originalLogout = logout;
logout = function() {
    if (window.monitoringInterval) {
        clearInterval(window.monitoringInterval);
        window.monitoringInterval = null;
    }
    originalLogout.apply(this, arguments);
};

// 密码重置功能
function setupPasswordReset() {
    const resetPasswordLink = document.getElementById('resetPasswordLink');
    if (resetPasswordLink) {
        resetPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPasswordResetModal();
        });
    }
}

function showPasswordResetModal() {
    const modal = document.getElementById('passwordResetModal');
    if (modal) {
        modal.style.display = 'flex';
        // 清空输入框
        document.getElementById('resetToken').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }
}

function closePasswordResetModal() {
    const modal = document.getElementById('passwordResetModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function resetPassword() {
    const resetToken = document.getElementById('resetToken').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    // 基本验证
    if (!resetToken) {
        alert('请输入GitHub Token');
        return;
    }
    
    if (!newPassword) {
        alert('请输入新密码');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('密码长度至少需要6位');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    // 验证GitHub Token是否正确
    if (resetToken !== GITHUB_TOKEN && resetToken !== localStorage.getItem('github_token')) {
        alert('GitHub Token验证失败，无法重置密码');
        return;
    }
    
    try {
        // 更新本地存储的管理员密码
        if (ADMIN_PASSWORD !== 'BUILD_TIME_ADMIN_PASSWORD') {
            // 如果是构建时配置的密码，无法通过本地存储修改
            alert('此系统使用构建时配置的管理员密码，无法通过此方式重置。请联系系统管理员。');
            return;
        }
        
        // 保存新密码到localStorage
        localStorage.setItem('admin_password', newPassword);
        ADMIN_PASSWORD = newPassword;
        
        alert('密码重置成功！请使用新密码登录。');
        closePasswordResetModal();
        
        // 如果当前是管理员登录状态，自动退出
        if (isAdmin) {
            logout();
        }
        
    } catch (error) {
        console.error('密码重置失败:', error);
        alert('密码重置失败，请稍后重试');
    }
}

// 主题切换功能
let currentTheme = 'light';

function initTheme() {
    // 从localStorage读取保存的主题，或使用系统偏好
    const savedTheme = localStorage.getItem('userTheme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    currentTheme = savedTheme || systemTheme;
    applyTheme(currentTheme);
    
    // 设置主题切换按钮事件
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
        updateThemeButton();
    }
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('userTheme')) {
            // 如果用户没有手动设置过主题，跟随系统
            currentTheme = e.matches ? 'dark' : 'light';
            applyTheme(currentTheme);
            updateThemeButton();
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('userTheme', newTheme);
    updateThemeButton();
    
    // 添加切换动画效果
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function updateThemeButton() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
        themeToggleBtn.title = currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式';
    }
}

// 在DOMContentLoaded时初始化主题
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    setupPasswordReset();
});

// 处理模态框外部点击关闭
document.addEventListener('click', function(e) {
    const modal = document.getElementById('passwordResetModal');
    if (modal && e.target === modal) {
        closePasswordResetModal();
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePasswordResetModal();
    }
});

// 邮箱验证功能
let verificationCountdown = 0;
let countdownTimer = null;

function updateEmailVerificationDisplay() {
    if (!currentUser) return;
    
    const emailStatus = document.getElementById('emailStatus');
    const emailVerificationStatus = document.getElementById('emailVerificationStatus');
    const verifyEmailBtn = document.getElementById('verifyEmailBtn');
    
    if (currentUser.emailVerified) {
        if (emailStatus) emailStatus.style.display = 'none';
        if (emailVerificationStatus) emailVerificationStatus.style.display = 'inline';
        if (verifyEmailBtn) verifyEmailBtn.textContent = '重新验证';
    } else {
        if (emailStatus) emailStatus.style.display = 'inline';
        if (emailVerificationStatus) emailVerificationStatus.style.display = 'none';
        if (verifyEmailBtn) verifyEmailBtn.textContent = '发送验证';
    }
}

function sendEmailVerification() {
    const emailInput = document.getElementById('userEmail');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('请先输入邮箱地址');
        emailInput.focus();
        return;
    }
    
    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('请输入有效的邮箱地址');
        emailInput.focus();
        return;
    }
    
    // 防止频繁发送
    if (verificationCountdown > 0) {
        alert(`请等待 ${verificationCountdown} 秒后再重新发送`);
        return;
    }
    
    // 模拟发送邮箱验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 在实际应用中，这里应该调用后端API发送邮件
    // 现在我们将验证码存储在sessionStorage中进行模拟
    sessionStorage.setItem('emailVerificationCode', verificationCode);
    sessionStorage.setItem('verificationEmail', email);
    sessionStorage.setItem('verificationTime', Date.now().toString());
    
    // 显示验证码输入区域
    const verificationGroup = document.getElementById('emailVerificationGroup');
    if (verificationGroup) {
        verificationGroup.style.display = 'block';
    }
    
    // 开始倒计时（60秒）
    startCountdown(60);
    
    // 模拟提示（在实际应用中会发送真实邮件）
    alert(`验证码已发送到 ${email}\n\n模拟验证码: ${verificationCode}\n（实际应用中验证码会发送到邮箱）`);
}

function startCountdown(seconds) {
    verificationCountdown = seconds;
    const verifyBtn = document.getElementById('verifyEmailBtn');
    const countdownSpan = document.getElementById('verificationCountdown');
    
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = '0.5';
    }
    
    countdownTimer = setInterval(() => {
        verificationCountdown--;
        if (countdownSpan) {
            countdownSpan.textContent = `重新发送 (${verificationCountdown}s)`;
        }
        
        if (verificationCountdown <= 0) {
            clearInterval(countdownTimer);
            if (countdownSpan) countdownSpan.textContent = '';
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = '1';
            }
        }
    }, 1000);
}

function verifyEmailCode() {
    const codeInput = document.getElementById('emailVerificationCode');
    const inputCode = codeInput.value.trim();
    
    if (!inputCode) {
        alert('请输入验证码');
        codeInput.focus();
        return;
    }
    
    const storedCode = sessionStorage.getItem('emailVerificationCode');
    const storedEmail = sessionStorage.getItem('verificationEmail');
    const verificationTime = parseInt(sessionStorage.getItem('verificationTime') || '0');
    
    // 检查验证码是否过期（10分钟）
    const currentTime = Date.now();
    const isExpired = (currentTime - verificationTime) > 10 * 60 * 1000;
    
    if (isExpired) {
        alert('验证码已过期，请重新发送');
        sessionStorage.removeItem('emailVerificationCode');
        sessionStorage.removeItem('verificationEmail');
        sessionStorage.removeItem('verificationTime');
        return;
    }
    
    if (inputCode === storedCode) {
        // 验证成功
        if (currentUser) {
            const userIndex = members.findIndex(m => m.id === currentUser.id);
            if (userIndex > -1) {
                members[userIndex].emailVerified = true;
                members[userIndex].emailVerificationDate = new Date().toISOString();
                members[userIndex].email = storedEmail;
                
                // 保存到服务器
                saveMembersToGist().then(() => {
                    currentUser = members[userIndex];
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    alert('邮箱验证成功！');
                    
                    // 隐藏验证码输入区域
                    const verificationGroup = document.getElementById('emailVerificationGroup');
                    if (verificationGroup) {
                        verificationGroup.style.display = 'none';
                    }
                    
                    // 更新显示状态
                    updateEmailVerificationDisplay();
                    
                    // 清理session数据
                    sessionStorage.removeItem('emailVerificationCode');
                    sessionStorage.removeItem('verificationEmail');
                    sessionStorage.removeItem('verificationTime');
                    
                    // 清空输入框
                    codeInput.value = '';
                });
            }
        }
    } else {
        alert('验证码错误，请重新输入');
        codeInput.focus();
        codeInput.select();
    }
}

// ===== 个性化设置功能 =====

/**
 * 显示用户设置界面
 */
function showUserSettings() {
    // 隐藏其他界面
    document.getElementById('userProfileSection').style.display = 'none';
    document.getElementById('memberSection').style.display = 'none';
    
    // 显示设置界面
    document.getElementById('userSettingsSection').style.display = 'block';
    
    // 加载当前设置
    loadUserSettings();
}

/**
 * 取消设置修改，返回资料界面
 */
function cancelUserSettings() {
    document.getElementById('userSettingsSection').style.display = 'none';
    document.getElementById('userProfileSection').style.display = 'block';
}

/**
 * 加载用户设置
 */
function loadUserSettings() {
    // 加载主题设置
    const savedTheme = localStorage.getItem('userTheme');
    let themePreference = 'auto';
    
    if (savedTheme) {
        themePreference = savedTheme;
    }
    
    const themeRadios = document.querySelectorAll('input[name="themePreference"]');
    themeRadios.forEach(radio => {
        if (radio.value === themePreference) {
            radio.checked = true;
        }
    });
    
    // 加载通知设置
    const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '["match_found", "system_updates"]');
    const notificationCheckboxes = document.querySelectorAll('input[name="notifications"]');
    notificationCheckboxes.forEach(checkbox => {
        checkbox.checked = notificationSettings.includes(checkbox.value);
    });
    
    // 加载匹配频率设置
    const matchFrequency = localStorage.getItem('matchFrequency') || 'normal';
    const frequencyRadios = document.querySelectorAll('input[name="matchFrequency"]');
    frequencyRadios.forEach(radio => {
        if (radio.value === matchFrequency) {
            radio.checked = true;
        }
    });
    
    // 加载隐私设置
    const privacySettings = JSON.parse(localStorage.getItem('privacySettings') || '[]');
    const privacyCheckboxes = document.querySelectorAll('input[name="privacy"]');
    privacyCheckboxes.forEach(checkbox => {
        checkbox.checked = privacySettings.includes(checkbox.value);
    });
    
    // 更新系统信息
    updateSystemInfo();
}

/**
 * 保存用户设置
 */
function saveUserSettings() {
    try {
        // 保存主题设置
        const selectedTheme = document.querySelector('input[name="themePreference"]:checked');
        if (selectedTheme) {
            const themeValue = selectedTheme.value;
            if (themeValue === 'auto') {
                localStorage.removeItem('userTheme');
                // 跟随系统设置
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                applyTheme(systemTheme);
            } else {
                localStorage.setItem('userTheme', themeValue);
                applyTheme(themeValue);
            }
            updateThemeButton();
        }
        
        // 保存通知设置
        const selectedNotifications = [];
        const notificationCheckboxes = document.querySelectorAll('input[name="notifications"]:checked');
        notificationCheckboxes.forEach(checkbox => {
            selectedNotifications.push(checkbox.value);
        });
        localStorage.setItem('notificationSettings', JSON.stringify(selectedNotifications));
        
        // 保存匹配频率设置
        const selectedFrequency = document.querySelector('input[name="matchFrequency"]:checked');
        if (selectedFrequency) {
            localStorage.setItem('matchFrequency', selectedFrequency.value);
        }
        
        // 保存隐私设置
        const selectedPrivacy = [];
        const privacyCheckboxes = document.querySelectorAll('input[name="privacy"]:checked');
        privacyCheckboxes.forEach(checkbox => {
            selectedPrivacy.push(checkbox.value);
        });
        localStorage.setItem('privacySettings', JSON.stringify(selectedPrivacy));
        
        // 如果用户已登录，同步设置到用户数据
        if (currentUser) {
            syncSettingsToUserProfile();
        }
        
        alert('设置保存成功！');
        cancelUserSettings();
        
    } catch (error) {
        console.error('保存设置时出错:', error);
        alert('保存设置失败，请重试');
    }
}

/**
 * 同步设置到用户档案
 */
function syncSettingsToUserProfile() {
    if (!currentUser) return;
    
    try {
        const userIndex = members.findIndex(m => m.id === currentUser.id);
        if (userIndex > -1) {
            // 更新用户的设置数据
            members[userIndex].userSettings = {
                themePreference: localStorage.getItem('userTheme') || 'auto',
                notifications: JSON.parse(localStorage.getItem('notificationSettings') || '[]'),
                matchFrequency: localStorage.getItem('matchFrequency') || 'normal',
                privacy: JSON.parse(localStorage.getItem('privacySettings') || '[]'),
                lastUpdated: new Date().toISOString()
            };
            
            // 更新本地currentUser
            currentUser = members[userIndex];
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // 保存到远程
            saveMembersToGist();
        }
    } catch (error) {
        console.error('同步设置到用户档案时出错:', error);
    }
}

/**
 * 更新系统信息显示
 */
function updateSystemInfo() {
    // 更新最后登录时间
    const lastLoginElement = document.getElementById('lastLoginTime');
    const lastLogin = sessionStorage.getItem('lastLoginTime') || localStorage.getItem('lastLoginTime');
    if (lastLoginElement && lastLogin) {
        lastLoginElement.textContent = new Date(lastLogin).toLocaleString('zh-CN');
    }
    
    // 更新账号创建时间
    const accountCreatedElement = document.getElementById('accountCreatedTime');
    if (accountCreatedElement && currentUser && currentUser.createdAt) {
        accountCreatedElement.textContent = new Date(currentUser.createdAt).toLocaleString('zh-CN');
    }
    
    // 更新数据同步状态
    const syncStatusElement = document.getElementById('dataSyncStatus');
    if (syncStatusElement) {
        const lastSync = localStorage.getItem('lastDataSync');
        if (lastSync) {
            const timeDiff = Date.now() - parseInt(lastSync);
            if (timeDiff < 60000) {
                syncStatusElement.textContent = '正常';
                syncStatusElement.style.color = '#28a745';
            } else if (timeDiff < 300000) {
                syncStatusElement.textContent = '待同步';
                syncStatusElement.style.color = '#ffc107';
            } else {
                syncStatusElement.textContent = '需要同步';
                syncStatusElement.style.color = '#dc3545';
            }
        }
    }
}

/**
 * 导出用户数据
 */
function exportUserData() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    
    try {
        // 收集所有相关数据
        const exportData = {
            userProfile: currentUser,
            settings: {
                theme: localStorage.getItem('userTheme'),
                notifications: JSON.parse(localStorage.getItem('notificationSettings') || '[]'),
                matchFrequency: localStorage.getItem('matchFrequency'),
                privacy: JSON.parse(localStorage.getItem('privacySettings') || '[]')
            },
            localData: {
                avatar: localStorage.getItem('userAvatar'),
                interestTags: JSON.parse(localStorage.getItem('userInterestTags') || '[]'),
                lastLoginTime: localStorage.getItem('lastLoginTime')
            },
            exportInfo: {
                exportDate: new Date().toISOString(),
                version: '1.2.0'
            }
        };
        
        // 创建并下载文件
        const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `求索书社_用户数据_${currentUser.name}_${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        alert('数据导出成功！文件已下载到您的设备');
        
    } catch (error) {
        console.error('导出数据时出错:', error);
        alert('导出数据失败，请重试');
    }
}

/**
 * 清除本地缓存数据
 */
function clearLocalData() {
    const confirmClear = confirm('确定要清除所有本地缓存数据吗？这将会：\n\n• 重置所有个人设置\n• 清除本地头像和标签数据\n• 清除登录状态\n\n注意：这不会删除您在服务器上的账号数据');
    
    if (confirmClear) {
        try {
            // 保留重要的配置数据
            const importantKeys = ['githubToken', 'gistId'];
            const importantData = {};
            importantKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    importantData[key] = value;
                }
            });
            
            // 清除localStorage
            localStorage.clear();
            
            // 恢复重要配置
            Object.keys(importantData).forEach(key => {
                localStorage.setItem(key, importantData[key]);
            });
            
            // 清除sessionStorage
            sessionStorage.clear();
            
            alert('本地缓存已清除！页面即将刷新');
            
            // 刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('清除缓存时出错:', error);
            alert('清除缓存失败，请重试');
        }
    }
}

/**
 * 删除用户账号（危险操作）
 */
function deleteUserAccount() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    
    const userName = currentUser.name;
    const confirmDelete = confirm(`⚠️ 危险操作警告 ⚠️\n\n您确定要永久删除账号 "${userName}" 吗？\n\n此操作将会：\n• 永久删除您的所有资料和数据\n• 从所有匹配结果中移除\n• 无法恢复\n\n如果确定删除，请在下一个对话框中输入您的姓名确认`);
    
    if (confirmDelete) {
        const confirmName = prompt(`请输入您的姓名 "${userName}" 以确认删除账号：`);
        
        if (confirmName === userName) {
            try {
                // 从成员列表中删除用户
                const userIndex = members.findIndex(m => m.id === currentUser.id);
                if (userIndex > -1) {
                    members.splice(userIndex, 1);
                    
                    // 保存到服务器
                    saveMembersToGist().then(() => {
                        // 清除本地数据
                        localStorage.clear();
                        sessionStorage.clear();
                        
                        alert('账号删除成功。感谢您使用求索书社，再见！');
                        
                        // 刷新页面回到登录界面
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }).catch(error => {
                        console.error('删除账号时出错:', error);
                        alert('删除账号失败，请联系管理员或重试');
                    });
                }
            } catch (error) {
                console.error('删除账号时出错:', error);
                alert('删除账号失败，请重试');
            }
        } else {
            alert('姓名确认失败，账号删除操作已取消');
        }
    }
}

// UI权限控制函数
function updateUIBasedOnPermissions() {
    if (!isAdmin || !currentAdminRole) return;

    // 系统监控面板 - 仅超级管理员可见
    const monitoringPanel = document.getElementById('monitoringPanel');
    if (monitoringPanel) {
        if (hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
            monitoringPanel.style.display = 'block';
            // 移除权限限制提示
            const permissionWarning = monitoringPanel.querySelector('.permission-restricted');
            if (permissionWarning) {
                permissionWarning.style.display = 'none';
            }
        } else {
            // 显示权限限制提示
            const permissionWarning = monitoringPanel.querySelector('.permission-restricted');
            if (permissionWarning) {
                permissionWarning.style.display = 'block';
            }
        }
    }

    // API管理按钮 - 仅超级管理员可见
    const apiStatusBtn = document.getElementById('apiStatusBtn');
    const resetApiBtn = document.getElementById('resetApiBtn');
    
    if (hasPermission(PERMISSIONS.API_MANAGEMENT)) {
        if (apiStatusBtn) apiStatusBtn.style.display = 'inline-block';
        if (resetApiBtn) resetApiBtn.style.display = 'inline-block';
    } else {
        if (apiStatusBtn) apiStatusBtn.style.display = 'none';
        if (resetApiBtn) resetApiBtn.style.display = 'none';
    }

    // 系统配置按钮 - 仅超级管理员可见
    const systemConfigBtn = document.getElementById('systemConfigBtn');
    if (systemConfigBtn) {
        if (hasPermission(PERMISSIONS.SYSTEM_MONITORING)) {
            systemConfigBtn.style.display = 'inline-block';
        } else {
            systemConfigBtn.style.display = 'none';
        }
    }

    // 数据刷新按钮 - 根据权限显示
    const refreshButtons = document.querySelectorAll('button[onclick="loadMembersFromGist()"]');
    refreshButtons.forEach(btn => {
        if (hasPermission(PERMISSIONS.DATA_REFRESH)) {
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
    });

    // AI功能切换 - 仅超级管理员可见
    const aiToggleBtnContainer = document.getElementById('aiToggleBtnContainer');
    if (aiToggleBtnContainer) {
        if (hasPermission(PERMISSIONS.API_MANAGEMENT)) {
            aiToggleBtnContainer.style.display = 'flex';
        } else {
            aiToggleBtnContainer.style.display = 'none';
        }
    }

    // 更新管理员面板标题显示权限级别
    updateAdminPanelHeader();
    
    // 根据权限控制审计日志面板
    updateAuditLogPermissions();
}

// 更新审计日志权限控制
function updateAuditLogPermissions() {
    const auditLogPanel = document.getElementById('auditLogPanel');
    const auditLogPermissionHint = document.getElementById('auditLogPermissionHint');
    const exportAuditBtn = document.getElementById('exportAuditBtn');
    
    if (!auditLogPanel) return;
    
    if (hasPermission(PERMISSIONS.USER_MANAGEMENT)) {
        auditLogPanel.style.display = 'block';
        
        if (currentAdminRole === ROLES.SUPER_ADMIN) {
            // 超级管理员可以看到提示和导出功能
            if (auditLogPermissionHint) {
                auditLogPermissionHint.style.display = 'block';
                auditLogPermissionHint.textContent = '超级管理员可以查看所有管理员的操作记录。';
            }
            if (exportAuditBtn) exportAuditBtn.style.display = 'inline-block';
        } else {
            // 普通管理员看到限制提示
            if (auditLogPermissionHint) {
                auditLogPermissionHint.style.display = 'block';
                auditLogPermissionHint.textContent = '普通管理员只能查看自己的操作记录。';
            }
            if (exportAuditBtn) exportAuditBtn.style.display = 'none';
        }
        
        // 加载并显示审计日志
        renderAuditLogs();
    } else {
        auditLogPanel.style.display = 'none';
    }
}

// 渲染审计日志列表
function renderAuditLogs() {
    const auditLogList = document.getElementById('auditLogList');
    if (!auditLogList || !auditLogs) return;
    
    // 获取筛选条件
    const actionFilter = document.getElementById('auditLogFilter')?.value || 'all';
    const dateFilter = document.getElementById('auditLogDateFilter')?.value || '';
    
    // 筛选日志
    let filteredLogs = auditLogs.slice(); // 复制数组
    
    // 权限筛选：普通管理员只能看到自己的记录
    if (currentAdminRole !== ROLES.SUPER_ADMIN) {
        const currentAdminName = currentUser?.name || 'Unknown Admin';
        filteredLogs = filteredLogs.filter(log => log.adminName === currentAdminName);
    }
    
    // 操作类型筛选
    if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
    }
    
    // 日期筛选
    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filteredLogs = filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate.toDateString() === filterDate.toDateString();
        });
    }
    
    // 渲染日志列表
    if (filteredLogs.length === 0) {
        auditLogList.innerHTML = `
            <div class="no-data" style="padding: 20px; text-align: center; color: var(--text-muted);">
                ${actionFilter === 'all' && !dateFilter ? '暂无操作记录' : '没有符合条件的记录'}
            </div>
        `;
        return;
    }
    
    const logHTML = filteredLogs.map(log => {
        const date = new Date(log.timestamp);
        const actionText = getActionDisplayText(log.action);
        const roleIcon = log.adminRole === ROLES.SUPER_ADMIN ? '👑' : '⚙️';
        
        return `
            <div class="audit-log-item" style="padding: 12px 15px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                <div style="flex-shrink: 0; font-size: 18px;">${roleIcon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: var(--text-primary);">${actionText}</strong>
                        ${log.targetUser ? `<span style="color: var(--text-secondary);">→ ${log.targetUser.name}</span>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 15px;">
                        <span>👤 ${log.adminName}</span>
                        <span>⏰ ${date.toLocaleString('zh-CN')}</span>
                        ${log.details ? `<span>📝 ${JSON.stringify(log.details)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    auditLogList.innerHTML = logHTML;
}

// 获取操作类型的显示文本
function getActionDisplayText(action) {
    const actionTexts = {
        [AUDIT_ACTIONS.ADMIN_LOGIN]: '🔑 管理员登录',
        [AUDIT_ACTIONS.ADMIN_LOGOUT]: '🚪 管理员退出',
        [AUDIT_ACTIONS.APPROVE_MEMBER]: '✅ 批准成员',
        [AUDIT_ACTIONS.DELETE_MEMBER]: '🗑️ 删除成员',
        [AUDIT_ACTIONS.EDIT_MEMBER]: '✏️ 编辑成员',
        [AUDIT_ACTIONS.DATA_REFRESH]: '🔄 刷新数据',
        [AUDIT_ACTIONS.API_RESET]: '🔧 重置API',
        [AUDIT_ACTIONS.AI_TOGGLE]: '🤖 AI功能切换',
        [AUDIT_ACTIONS.CONFIG_CHANGE]: '⚙️ 配置更改'
    };
    return actionTexts[action] || action;
}

// 刷新审计日志
async function refreshAuditLogs() {
    if (!requirePermission(PERMISSIONS.USER_MANAGEMENT, '查看审计日志')) {
        return;
    }
    
    try {
        await loadAuditLogsFromGist();
        renderAuditLogs();
        Logger.info('Audit logs refreshed successfully');
    } catch (error) {
        Logger.error('Failed to refresh audit logs:', error);
        alert('刷新审计日志失败，请稍后重试');
    }
}

// 导出审计日志
function exportAuditLogs() {
    if (!requirePermission(PERMISSIONS.SYSTEM_MONITORING, '导出审计日志')) {
        return;
    }
    
    if (!auditLogs || auditLogs.length === 0) {
        alert('没有可导出的审计日志');
        return;
    }
    
    const csvContent = convertAuditLogsToCsv(auditLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 转换审计日志为CSV格式
function convertAuditLogsToCsv(logs) {
    const headers = ['时间戳', '管理员', '角色', '操作', '目标用户', '详情'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
        const row = [
            `"${log.timestamp}"`,
            `"${log.adminName}"`,
            `"${log.adminRole}"`,
            `"${getActionDisplayText(log.action)}"`,
            `"${log.targetUser ? log.targetUser.name : ''}"`,
            `"${log.details ? JSON.stringify(log.details).replace(/"/g, '""') : ''}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// 更新管理员面板标题
function updateAdminPanelHeader() {
    const adminSection = document.querySelector('#adminSection h2');
    if (adminSection && currentAdminRole) {
        const roleConfig = ADMIN_ROLE_CONFIG[currentAdminRole];
        if (roleConfig) {
            adminSection.textContent = `${roleConfig.icon} ${roleConfig.text}面板`;
        }
    }
}

// 显示权限不足提示
function showPermissionDenied(action) {
    const roleConfig = ADMIN_ROLE_CONFIG[currentAdminRole] || { text: '当前角色' };
    alert(`⚠️ 权限不足\n\n${roleConfig.text}无法执行此操作：${action}\n\n如需此权限，请联系超级管理员。`);
}

// 增强版权限检查，带用户友好提示
function requirePermission(permission, actionName) {
    if (!hasPermission(permission)) {
        showPermissionDenied(actionName);
        return false;
    }
    return true;
}

// 重写现有函数以添加权限检查
const originalLoadMembersFromGist = window.loadMembersFromGist;
window.loadMembersFromGist = function() {
    if (!requirePermission(PERMISSIONS.DATA_REFRESH, '刷新数据')) {
        return;
    }
    return originalLoadMembersFromGist.apply(this, arguments);
};

const originalShowApiHealthStatus = window.showApiHealthStatus;
window.showApiHealthStatus = function() {
    if (!requirePermission(PERMISSIONS.API_MANAGEMENT, '查看API状态')) {
        return;
    }
    return originalShowApiHealthStatus.apply(this, arguments);
};

const originalResetApiHealth = window.resetApiHealth;
window.resetApiHealth = function() {
    if (!requirePermission(PERMISSIONS.API_MANAGEMENT, '重置API状态')) {
        return;
    }
    return originalResetApiHealth.apply(this, arguments);
};

const originalToggleAiAnalysis = window.toggleAiAnalysis;
window.toggleAiAnalysis = function() {
    if (!requirePermission(PERMISSIONS.API_MANAGEMENT, '切换AI分析功能')) {
        return;
    }
    return originalToggleAiAnalysis.apply(this, arguments);
};

// 添加设置按钮事件监听
document.addEventListener('DOMContentLoaded', function() {
    const userSettingsBtn = document.getElementById('userSettingsBtn');
    if (userSettingsBtn) {
        userSettingsBtn.addEventListener('click', showUserSettings);
    }

    // 初始化权限控制
    if (isAdmin) {
        updateUIBasedOnPermissions();
    }
    
    // 审计日志筛选事件监听
    const auditLogFilter = document.getElementById('auditLogFilter');
    const auditLogDateFilter = document.getElementById('auditLogDateFilter');
    
    if (auditLogFilter) {
        auditLogFilter.addEventListener('change', renderAuditLogs);
    }
    
    if (auditLogDateFilter) {
        auditLogDateFilter.addEventListener('change', renderAuditLogs);
    }
    
    // 编辑用户表单提交事件监听
    const editMemberForm = document.getElementById('editMemberForm');
    if (editMemberForm) {
        editMemberForm.addEventListener('submit', handleEditMemberSubmit);
    }
});
