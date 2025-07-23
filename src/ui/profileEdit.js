// 用户资料编辑模块
// 处理用户资料的编辑、验证、保存等功能

import { store } from '../state.js';
import { Logger, sanitizeText, validateEnhancedForm } from '../utils.js';
import { saveMembers } from '../api.js';

// 编辑状态管理
let isEditMode = false;
let originalUserData = null;

// 验证规则配置
const VALIDATION_RULES = {
    gender: {
        required: false,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    bookCategories: {
        required: true,
        minItems: 1,
        maxItems: 7
    },
    favoriteBooks: {
        required: true,
        minItems: 2,
        maxItems: 10,
        itemMaxLength: 100
    },
    detailedBookPreferences: {
        maxLength: 500
    },
    personalBio: {
        maxLength: 300
    },
    readingCommitment: {
        required: true,
        enum: ['light', 'medium', 'intensive', 'epic']
    }
};

/**
 * 初始化用户资料编辑功能
 */
export function initializeProfileEdit() {
    Logger.debug('初始化用户资料编辑功能');
    
    // 确保编辑表单容器存在
    ensureEditFormContainer();
    
    // 绑定编辑按钮事件
    bindEditProfileEvents();
}

/**
 * 确保编辑表单容器存在
 */
function ensureEditFormContainer() {
    const userProfileSection = document.getElementById('userProfileSection');
    if (!userProfileSection) return;
    
    let editContainer = document.getElementById('profileEditContainer');
    if (!editContainer) {
        editContainer = document.createElement('div');
        editContainer.id = 'profileEditContainer';
        editContainer.className = 'profile-edit-container hidden';
        userProfileSection.appendChild(editContainer);
    }
}

/**
 * 绑定编辑资料相关事件
 */
function bindEditProfileEvents() {
    // 监听编辑按钮点击（使用事件委托）
    document.addEventListener('click', (e) => {
        if (e.target.id === 'editProfileButton' || e.target.closest('#editProfileButton')) {
            handleEditProfileClick();
        } else if (e.target.id === 'cancelEditButton') {
            handleCancelEdit();
        } else if (e.target.id === 'saveProfileButton') {
            handleSaveProfile(e);
        }
    });
}

/**
 * 处理编辑资料按钮点击
 */
function handleEditProfileClick() {
    try {
        Logger.info('开始编辑用户资料');
        
        const currentUser = store.getCurrentUser();
        if (!currentUser) {
            throw new Error('用户未登录');
        }
        
        // 保存原始数据副本
        originalUserData = JSON.parse(JSON.stringify(currentUser));
        
        // 进入编辑模式
        enterEditMode(currentUser);
        
    } catch (error) {
        Logger.error('进入编辑模式失败', error);
        store.setError('无法开启编辑模式');
    }
}

/**
 * 进入编辑模式
 */
function enterEditMode(userData) {
    isEditMode = true;
    
    // 渲染编辑表单
    renderEditForm(userData);
    
    // 切换显示状态
    const profileContainer = document.getElementById('userProfileContainer');
    const editContainer = document.getElementById('profileEditContainer');
    
    if (profileContainer) profileContainer.classList.add('hidden');
    if (editContainer) editContainer.classList.remove('hidden');
    
    // 预填充表单数据
    populateEditForm(userData);
    
    // 绑定表单事件
    bindFormEvents();
    
    Logger.info('已进入编辑模式');
}

/**
 * 渲染编辑表单
 */
function renderEditForm(userData) {
    const editContainer = document.getElementById('profileEditContainer');
    if (!editContainer) return;
    
    editContainer.innerHTML = `
        <div class="edit-form-wrapper">
            <div class="edit-form-header">
                <h3>编辑个人资料</h3>
                <div class="edit-form-actions">
                    <button id="cancelEditButton" class="btn btn-secondary">
                        <span class="btn-icon">✕</span>
                        取消
                    </button>
                    <button id="saveProfileButton" class="btn btn-primary">
                        <span class="btn-icon">💾</span>
                        保存
                    </button>
                </div>
            </div>
            
            <form id="profileEditForm" class="profile-edit-form">
                <!-- 基本信息 -->
                <section class="form-section">
                    <h4 class="section-title">基本信息</h4>
                    
                    <div class="form-group">
                        <label for="editGender">性别</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="gender" value="male">
                                <span class="radio-label">男</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="gender" value="female">
                                <span class="radio-label">女</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="gender" value="other">
                                <span class="radio-label">其他</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="gender" value="prefer_not_to_say">
                                <span class="radio-label">不愿透露</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editEmail">邮箱地址</label>
                        <input type="email" id="editEmail" placeholder="用于接收匹配通知（可选）">
                        <small class="form-hint">邮箱将用于发送匹配通知，不会公开显示</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserStatus">当前状态</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="userStatus" value="active">
                                <span class="radio-label">🟢 活跃中</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="userStatus" value="busy">
                                <span class="radio-label">🟡 忙碌中</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="userStatus" value="away">
                                <span class="radio-label">🔴 暂时离开</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="userStatus" value="reading">
                                <span class="radio-label">📚 专心阅读</span>
                            </label>
                        </div>
                    </div>
                </section>
                
                <!-- 阅读偏好 -->
                <section class="form-section">
                    <h4 class="section-title">阅读偏好</h4>
                    
                    <div class="form-group">
                        <label>感兴趣的书籍类别 <span class="required">*</span></label>
                        <small class="form-hint">请选择1-7个您感兴趣的类别</small>
                        <div class="checkbox-grid">
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="fiction">
                                <span class="checkbox-label">小说</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="non-fiction">
                                <span class="checkbox-label">非小说</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="biography">
                                <span class="checkbox-label">传记</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="history">
                                <span class="checkbox-label">历史</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="science">
                                <span class="checkbox-label">科学</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="philosophy">
                                <span class="checkbox-label">哲学</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="psychology">
                                <span class="checkbox-label">心理学</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="self-help">
                                <span class="checkbox-label">自助</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="mystery">
                                <span class="checkbox-label">推理</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="sci-fi">
                                <span class="checkbox-label">科幻</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="romance">
                                <span class="checkbox-label">言情</span>
                            </label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bookCategories" value="fantasy">
                                <span class="checkbox-label">奇幻</span>
                            </label>
                        </div>
                        <div class="selection-counter">
                            已选择 <span id="categoryCount">0</span> / 7 个类别
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editReadingCommitment">阅读投入程度 <span class="required">*</span></label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="readingCommitment" value="light">
                                <span class="radio-label">轻度阅读 - 偶尔翻阅</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="readingCommitment" value="medium">
                                <span class="radio-label">中度阅读 - 每周几本</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="readingCommitment" value="intensive">
                                <span class="radio-label">重度阅读 - 每日必读</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="readingCommitment" value="epic">
                                <span class="radio-label">骨灰级 - 废寝忘食</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editMatchingTypePreference">匹配类型偏好</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="matchingTypePreference" value="similar">
                                <span class="radio-label">相似匹配 - 寻找志同道合的书友</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="matchingTypePreference" value="complementary">
                                <span class="radio-label">互补匹配 - 探索不同的阅读领域</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="matchingTypePreference" value="no_preference">
                                <span class="radio-label">无偏好 - 开放所有可能性</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editMatchGenderPreference">匹配性别偏好</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="matchGenderPreference" value="male">
                                <span class="radio-label">仅匹配男性</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="matchGenderPreference" value="female">
                                <span class="radio-label">仅匹配女性</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="matchGenderPreference" value="no_preference">
                                <span class="radio-label">无性别偏好</span>
                            </label>
                        </div>
                    </div>
                </section>
                
                <!-- 兴趣爱好 -->
                <section class="form-section">
                    <h4 class="section-title">兴趣爱好</h4>
                    
                    <div class="form-group">
                        <label for="editFavoriteBooks">最喜欢的书籍 <span class="required">*</span></label>
                        <small class="form-hint">请列出2-10本您最喜欢的书籍，用逗号分隔</small>
                        <div id="favoriteBooksContainer">
                            <div class="favorite-book-item">
                                <input type="text" class="favorite-book-input" placeholder="请输入书名" maxlength="100">
                                <button type="button" class="remove-book-btn">-</button>
                            </div>
                        </div>
                        <button type="button" id="addBookButton" class="btn btn-secondary btn-sm">
                            <span class="btn-icon">+</span>
                            添加书籍
                        </button>
                        <div class="book-counter">
                            已添加 <span id="bookCount">1</span> / 10 本书
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editHobbies">其他兴趣爱好</label>
                        <input type="text" id="editHobbies" placeholder="请用逗号分隔，如：摄影,旅行,音乐">
                        <small class="form-hint">除了阅读之外的其他兴趣爱好</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editBooks">已读过的书籍</label>
                        <textarea id="editBooks" rows="3" placeholder="请列出一些您读过的书籍，用逗号分隔"></textarea>
                        <small class="form-hint">有助于找到有共同阅读经历的书友</small>
                    </div>
                </section>
                
                <!-- 个人简介 -->
                <section class="form-section">
                    <h4 class="section-title">个人简介</h4>
                    
                    <div class="form-group">
                        <label for="editPersonalBio">个人简介</label>
                        <textarea id="editPersonalBio" rows="4" maxlength="300" placeholder="简单介绍一下自己，您的阅读偏好，或者想要寻找什么样的读书搭档..."></textarea>
                        <div class="char-counter">
                            <span id="bioCharCount">0</span> / 300 字
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editDetailedPreferences">详细阅读偏好</label>
                        <textarea id="editDetailedPreferences" rows="3" maxlength="500" placeholder="详细描述您的阅读习惯、偏好的阅读环境、讨论方式等..."></textarea>
                        <div class="char-counter">
                            <span id="prefCharCount">0</span> / 500 字
                        </div>
                    </div>
                </section>
            </form>
        </div>
    `;
}

/**
 * 预填充编辑表单
 */
function populateEditForm(userData) {
    try {
        Logger.debug('预填充表单数据', { user: userData.name });
        
        // 基本信息预填充
        populateBasicInfo(userData);
        
        // 阅读偏好预填充
        populateReadingPreferences(userData);
        
        // 兴趣爱好预填充
        populateInterests(userData);
        
        // 个人简介预填充
        populatePersonalInfo(userData);
        
        Logger.debug('表单数据预填充完成');
        
    } catch (error) {
        Logger.error('表单预填充失败', error);
    }
}

/**
 * 预填充基本信息
 */
function populateBasicInfo(userData) {
    // 性别
    const gender = userData.gender || userData.questionnaire?.basicInfo?.gender;
    if (gender) {
        const genderRadio = document.querySelector(`input[name="gender"][value="${gender}"]`);
        if (genderRadio) genderRadio.checked = true;
    }
    
    // 邮箱
    const email = userData.email || userData.questionnaire?.basicInfo?.email || '';
    const emailInput = document.getElementById('editEmail');
    if (emailInput) emailInput.value = email;
    
    // 用户状态
    const userStatus = userData.userStatus || 'active';
    const statusRadio = document.querySelector(`input[name="userStatus"][value="${userStatus}"]`);
    if (statusRadio) statusRadio.checked = true;
}

/**
 * 预填充阅读偏好
 */
function populateReadingPreferences(userData) {
    // 书籍类别
    const bookCategories = userData.bookCategories || userData.questionnaire?.readingPreferences?.categories || [];
    bookCategories.forEach(category => {
        const checkbox = document.querySelector(`input[name="bookCategories"][value="${category}"]`);
        if (checkbox) checkbox.checked = true;
    });
    updateCategoryCounter();
    
    // 阅读投入程度
    const readingCommitment = userData.readingCommitment || userData.questionnaire?.readingPreferences?.commitment;
    if (readingCommitment) {
        const commitmentRadio = document.querySelector(`input[name="readingCommitment"][value="${readingCommitment}"]`);
        if (commitmentRadio) commitmentRadio.checked = true;
    }
    
    // 匹配类型偏好
    const matchingTypePreference = userData.matchingTypePreference || 'no_preference';
    const matchingRadio = document.querySelector(`input[name="matchingTypePreference"][value="${matchingTypePreference}"]`);
    if (matchingRadio) matchingRadio.checked = true;
    
    // 匹配性别偏好
    const matchGenderPreference = userData.matchGenderPreference || 'no_preference';
    const genderPrefRadio = document.querySelector(`input[name="matchGenderPreference"][value="${matchGenderPreference}"]`);
    if (genderPrefRadio) genderPrefRadio.checked = true;
}

/**
 * 预填充兴趣爱好
 */
function populateInterests(userData) {
    // 最喜欢的书籍
    const favoriteBooks = userData.favoriteBooks || userData.questionnaire?.interests?.books || [];
    populateFavoriteBooks(favoriteBooks);
    
    // 其他兴趣爱好
    const hobbies = userData.hobbies || userData.questionnaire?.interests?.hobbies || '';
    const hobbiesInput = document.getElementById('editHobbies');
    if (hobbiesInput) hobbiesInput.value = hobbies;
    
    // 已读书籍
    const books = userData.books || userData.questionnaire?.interests?.readBooks || '';
    const booksInput = document.getElementById('editBooks');
    if (booksInput) booksInput.value = books;
}

/**
 * 预填充个人简介
 */
function populatePersonalInfo(userData) {
    // 个人简介
    const personalBio = userData.personalBio || userData.questionnaire?.personalDescription || '';
    const bioInput = document.getElementById('editPersonalBio');
    if (bioInput) {
        bioInput.value = personalBio;
        updateCharCounter('editPersonalBio', 'bioCharCount', 300);
    }
    
    // 详细偏好
    const detailedPreferences = userData.detailedBookPreferences || userData.questionnaire?.detailedPreferences || '';
    const prefInput = document.getElementById('editDetailedPreferences');
    if (prefInput) {
        prefInput.value = detailedPreferences;
        updateCharCounter('editDetailedPreferences', 'prefCharCount', 500);
    }
}

/**
 * 预填充最喜欢的书籍
 */
function populateFavoriteBooks(favoriteBooks) {
    const container = document.getElementById('favoriteBooksContainer');
    if (!container) return;
    
    // 清空现有内容
    container.innerHTML = '';
    
    // 如果没有数据，添加一个空输入框
    if (!favoriteBooks || favoriteBooks.length === 0) {
        favoriteBooks = [''];
    }
    
    favoriteBooks.forEach((book, index) => {
        addFavoriteBookInput(book, index === 0);
    });
    
    updateBookCounter();
}

/**
 * 添加最喜欢的书籍输入框
 */
function addFavoriteBookInput(value = '', isFirst = false) {
    const container = document.getElementById('favoriteBooksContainer');
    if (!container) return;
    
    const bookItem = document.createElement('div');
    bookItem.className = 'favorite-book-item';
    bookItem.innerHTML = `
        <input type="text" class="favorite-book-input" placeholder="请输入书名" maxlength="100" value="${value}">
        ${!isFirst ? '<button type="button" class="remove-book-btn">-</button>' : ''}
    `;
    
    container.appendChild(bookItem);
    
    // 绑定删除按钮事件
    const removeBtn = bookItem.querySelector('.remove-book-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            bookItem.remove();
            updateBookCounter();
        });
    }
}

/**
 * 绑定表单事件
 */
function bindFormEvents() {
    // 书籍类别计数器
    document.querySelectorAll('input[name="bookCategories"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCategoryCounter);
    });
    
    // 添加书籍按钮
    const addBookBtn = document.getElementById('addBookButton');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', () => {
            const currentCount = document.querySelectorAll('.favorite-book-input').length;
            if (currentCount < 10) {
                addFavoriteBookInput();
                updateBookCounter();
            }
        });
    }
    
    // 字符计数器
    const bioInput = document.getElementById('editPersonalBio');
    if (bioInput) {
        bioInput.addEventListener('input', () => {
            updateCharCounter('editPersonalBio', 'bioCharCount', 300);
        });
    }
    
    const prefInput = document.getElementById('editDetailedPreferences');
    if (prefInput) {
        prefInput.addEventListener('input', () => {
            updateCharCounter('editDetailedPreferences', 'prefCharCount', 500);
        });
    }
}

/**
 * 更新类别计数器
 */
function updateCategoryCounter() {
    const checkedCategories = document.querySelectorAll('input[name="bookCategories"]:checked');
    const counter = document.getElementById('categoryCount');
    if (counter) {
        counter.textContent = checkedCategories.length;
        
        // 超过限制时显示警告
        const selectionCounter = counter.closest('.selection-counter');
        if (selectionCounter) {
            if (checkedCategories.length > 7) {
                selectionCounter.classList.add('warning');
            } else {
                selectionCounter.classList.remove('warning');
            }
        }
    }
}

/**
 * 更新书籍计数器
 */
function updateBookCounter() {
    const bookInputs = document.querySelectorAll('.favorite-book-input');
    const counter = document.getElementById('bookCount');
    if (counter) {
        counter.textContent = bookInputs.length;
        
        // 更新添加按钮状态
        const addBtn = document.getElementById('addBookButton');
        if (addBtn) {
            addBtn.disabled = bookInputs.length >= 10;
        }
    }
}

/**
 * 更新字符计数器
 */
function updateCharCounter(inputId, counterId, maxLength) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    
    if (input && counter) {
        const currentLength = input.value.length;
        counter.textContent = currentLength;
        
        // 超过警告阈值时添加样式
        const counterContainer = counter.closest('.char-counter');
        if (counterContainer) {
            if (currentLength > maxLength * 0.9) {
                counterContainer.classList.add('warning');
            } else {
                counterContainer.classList.remove('warning');
            }
        }
    }
}

/**
 * 处理取消编辑
 */
function handleCancelEdit() {
    try {
        Logger.info('取消编辑资料');
        
        // 确认取消
        if (hasFormChanges() && !confirm('您有未保存的修改，确定要取消吗？')) {
            return;
        }
        
        exitEditMode();
        
    } catch (error) {
        Logger.error('取消编辑失败', error);
    }
}

/**
 * 检查表单是否有变更
 */
function hasFormChanges() {
    if (!originalUserData) return false;
    
    try {
        const currentFormData = collectFormData();
        return JSON.stringify(currentFormData) !== JSON.stringify(originalUserData);
    } catch (error) {
        Logger.warn('检查表单变更时出错', error);
        return true; // 出错时谨慎处理，假设有变更
    }
}

/**
 * 处理保存资料
 */
async function handleSaveProfile(e) {
    e.preventDefault();
    
    try {
        Logger.info('保存用户资料');
        store.setLoading(true);
        
        // 收集表单数据
        const formData = collectFormData();
        
        // 验证表单数据
        const validationResult = validateFormData(formData);
        if (!validationResult.isValid) {
            throw new Error(`请修正以下错误：\n${validationResult.errors.join('\n')}`);
        }
        
        // 更新用户数据
        await updateUserProfile(formData);
        
        // 退出编辑模式
        exitEditMode();
        
        // 显示成功消息
        store.setError(null);
        Logger.info('用户资料保存成功');
        
        // 可以显示临时成功提示
        showSuccessMessage('资料保存成功！');
        
    } catch (error) {
        Logger.error('保存用户资料失败', error);
        store.setError(error.message);
    } finally {
        store.setLoading(false);
    }
}

/**
 * 收集表单数据
 */
function collectFormData() {
    const formData = {};
    
    // 基本信息
    const genderRadio = document.querySelector('input[name="gender"]:checked');
    if (genderRadio) formData.gender = genderRadio.value;
    
    const emailInput = document.getElementById('editEmail');
    if (emailInput) formData.email = emailInput.value.trim();
    
    const statusRadio = document.querySelector('input[name="userStatus"]:checked');
    if (statusRadio) formData.userStatus = statusRadio.value;
    
    // 阅读偏好
    const categoryCheckboxes = document.querySelectorAll('input[name="bookCategories"]:checked');
    formData.bookCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    const commitmentRadio = document.querySelector('input[name="readingCommitment"]:checked');
    if (commitmentRadio) formData.readingCommitment = commitmentRadio.value;
    
    const matchingTypeRadio = document.querySelector('input[name="matchingTypePreference"]:checked');
    if (matchingTypeRadio) formData.matchingTypePreference = matchingTypeRadio.value;
    
    const matchGenderRadio = document.querySelector('input[name="matchGenderPreference"]:checked');
    if (matchGenderRadio) formData.matchGenderPreference = matchGenderRadio.value;
    
    // 兴趣爱好
    const bookInputs = document.querySelectorAll('.favorite-book-input');
    formData.favoriteBooks = Array.from(bookInputs)
        .map(input => input.value.trim())
        .filter(book => book.length > 0);
    
    const hobbiesInput = document.getElementById('editHobbies');
    if (hobbiesInput) formData.hobbies = hobbiesInput.value.trim();
    
    const booksInput = document.getElementById('editBooks');
    if (booksInput) formData.books = booksInput.value.trim();
    
    // 个人简介
    const bioInput = document.getElementById('editPersonalBio');
    if (bioInput) formData.personalBio = bioInput.value.trim();
    
    const prefInput = document.getElementById('editDetailedPreferences');
    if (prefInput) formData.detailedBookPreferences = prefInput.value.trim();
    
    return formData;
}

/**
 * 验证表单数据
 */
function validateFormData(formData) {
    const errors = [];
    
    // 书籍类别验证
    if (!formData.bookCategories || formData.bookCategories.length === 0) {
        errors.push('请至少选择一个感兴趣的书籍类别');
    } else if (formData.bookCategories.length > 7) {
        errors.push('最多只能选择7个书籍类别');
    }
    
    // 阅读投入程度验证
    if (!formData.readingCommitment) {
        errors.push('请选择阅读投入程度');
    }
    
    // 最喜欢的书籍验证
    if (!formData.favoriteBooks || formData.favoriteBooks.length < 2) {
        errors.push('请至少填写2本最喜欢的书籍');
    } else if (formData.favoriteBooks.length > 10) {
        errors.push('最多只能填写10本最喜欢的书籍');
    }
    
    // 字符长度验证
    if (formData.personalBio && formData.personalBio.length > 300) {
        errors.push('个人简介不能超过300字');
    }
    
    if (formData.detailedBookPreferences && formData.detailedBookPreferences.length > 500) {
        errors.push('详细阅读偏好不能超过500字');
    }
    
    // 邮箱格式验证
    if (formData.email && formData.email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.push('邮箱格式不正确');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 更新用户资料
 */
async function updateUserProfile(formData) {
    const currentUser = store.getCurrentUser();
    const members = store.getMembers();
    
    if (!currentUser || !members) {
        throw new Error('用户数据不存在');
    }
    
    // 找到当前用户在成员列表中的索引
    const userIndex = members.findIndex(member => 
        member.studentId === currentUser.studentId
    );
    
    if (userIndex === -1) {
        throw new Error('在成员列表中未找到用户数据');
    }
    
    // 更新用户数据
    const updatedUser = {
        ...currentUser,
        ...formData,
        lastModified: new Date().toISOString(),
        questionnaire: {
            ...currentUser.questionnaire,
            version: '2.0',
            completedAt: new Date().toISOString(),
            basicInfo: {
                ...currentUser.questionnaire?.basicInfo,
                gender: formData.gender,
                email: formData.email
            },
            readingPreferences: {
                categories: formData.bookCategories,
                commitment: formData.readingCommitment,
                matchingType: formData.matchingTypePreference,
                matchGender: formData.matchGenderPreference
            },
            interests: {
                books: formData.favoriteBooks,
                hobbies: formData.hobbies,
                readBooks: formData.books
            },
            personalDescription: formData.personalBio,
            detailedPreferences: formData.detailedBookPreferences
        }
    };
    
    // 更新成员列表
    members[userIndex] = updatedUser;
    
    // 保存到后端
    await saveMembers(members);
    
    // 更新本地状态
    store.setMembers(members);
    store.setCurrentUser(updatedUser);
    
    Logger.info('用户资料更新成功', { 
        user: updatedUser.name,
        changes: Object.keys(formData)
    });
}

/**
 * 退出编辑模式
 */
function exitEditMode() {
    isEditMode = false;
    originalUserData = null;
    
    // 切换显示状态
    const profileContainer = document.getElementById('userProfileContainer');
    const editContainer = document.getElementById('profileEditContainer');
    
    if (profileContainer) profileContainer.classList.remove('hidden');
    if (editContainer) editContainer.classList.add('hidden');
    
    // 重新渲染用户资料
    const currentUser = store.getCurrentUser();
    if (currentUser) {
        // 触发资料重新渲染
        store.notify('currentUser');
    }
    
    Logger.info('已退出编辑模式');
}

/**
 * 显示成功消息
 */
function showSuccessMessage(message) {
    // 创建临时成功提示
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    // 显示动画
    setTimeout(() => {
        successDiv.style.opacity = '1';
        successDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动消失
    setTimeout(() => {
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

/**
 * 检查是否处于编辑模式
 */
export function isInEditMode() {
    return isEditMode;
}

// 导出其他函数
export {
    handleEditProfileClick,
    exitEditMode
};