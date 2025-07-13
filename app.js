// GitHub Gist 配置 - 构建时替换
let GITHUB_TOKEN = 'BUILD_TIME_GITHUB_TOKEN';
let GIST_ID = 'BUILD_TIME_GIST_ID';
let ADMIN_PASSWORD = 'BUILD_TIME_ADMIN_PASSWORD';
let AI_BASE_URL = 'BUILD_TIME_AI_BASE_URL';
let AI_API_KEY = 'BUILD_TIME_AI_API_KEY';
let AI_MODEL_NAME = 'BUILD_TIME_AI_MODEL_NAME';
const GIST_FILENAME = 'bookclub_members.json';

// 存储所有成员数据
let members = [];
let currentUser = null; // 当前登录用户
let isAdmin = false;

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

// 页面加载时初始化
window.onload = async function() {
   // 优先使用构建时注入的配置
   const isBuiltWithEnv = GITHUB_TOKEN !== 'BUILD_TIME_GITHUB_TOKEN' && ADMIN_PASSWORD !== 'BUILD_TIME_ADMIN_PASSWORD' && GIST_ID !== 'BUILD_TIME_GIST_ID';
   if (!isBuiltWithEnv) {
       // 降级到手动配置
       GITHUB_TOKEN = localStorage.getItem('github_token') || '';
       GIST_ID = localStorage.getItem('gist_id') || '';
       ADMIN_PASSWORD = localStorage.getItem('admin_password') || '';
   }

   // 如果是注册页面，则不需要执行登录逻辑
   if (window.location.pathname.endsWith('register.html')) {
       return;
   }
   
   // 自动加载Gist数据
   if (GIST_ID) {
       await loadMembersFromGist();
   }

   // 检查本地存储的登录状态
   const loggedInUser = sessionStorage.getItem('currentUser');
   if (loggedInUser) {
       currentUser = JSON.parse(loggedInUser);
       isAdmin = sessionStorage.getItem('isAdmin') === 'true';
       showLoggedInView();
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

// 处理登录
async function handleLogin(e) {
   e.preventDefault();
   const name = document.getElementById('loginName').value.trim();
   const studentId = document.getElementById('loginStudentId').value.trim();
   const password = document.getElementById('loginPassword').value.trim();

   // 管理员登录
   if (password) {
       if (password === ADMIN_PASSWORD) {
           isAdmin = true;
           currentUser = { name: 'Admin' };
           sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
           sessionStorage.setItem('isAdmin', 'true');
           showLoggedInView();
           alert('管理员登录成功！');
       } else {
           alert('管理员密码错误！');
       }
       return;
   }

   // 普通用户登录
   if (!name || !studentId) {
       alert('请输入姓名和学号');
       return;
   }

   await loadMembersFromGist();
   const foundUser = members.find(m => m.name === name && m.studentId === studentId);

   if (foundUser) {
       if (foundUser.status === 'approved') {
           currentUser = foundUser;
           isAdmin = false;
           sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
           sessionStorage.setItem('isAdmin', 'false');
           showLoggedInView();
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
   showLoginView();
}

// 管理员退出登录
function adminLogout() {
   logout(); // 调用通用退出登录函数
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
   
   // New enhanced fields (if they exist in the form)
   const gender = document.querySelector('input[name="gender"]:checked')?.value || currentUser.gender || '';
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
           members[userIndex].bookCategories = enhancedFormData.bookCategories;
           members[userIndex].detailedBookPreferences = enhancedFormData.detailedBookPreferences;
           members[userIndex].favoriteBooks = enhancedFormData.favoriteBooks;
           members[userIndex].readingCommitment = enhancedFormData.readingCommitment;
           
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
                       <div><strong>性别：</strong>${formatGender()}</div>
                       <div><strong>匹配偏好：</strong>${formatMatchGenderPreference()}</div>
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
               <button class="delete-btn" onclick="deleteMember('${migratedMember.id}')">删除</button>
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

// UI 更新
function showLoginView() {
   document.getElementById('loginSection').style.display = 'block';
   document.getElementById('memberSection').style.display = 'none';
   document.getElementById('adminSection').style.display = 'none';
}

function showLoggedInView() {
   document.getElementById('loginSection').style.display = 'none';
   if (isAdmin) {
       document.getElementById('adminSection').style.display = 'block';
       document.getElementById('memberSection').style.display = 'none';
       renderPendingList();
       renderMemberList();
   } else {
       document.getElementById('adminSection').style.display = 'none';
       document.getElementById('memberSection').style.display = 'block';
       
       // 确保用户数据已迁移到最新版本
       const migratedUser = migrateUserData(currentUser);
       currentUser = migratedUser;
       
       // 填充基本用户信息
       document.getElementById('name').value = currentUser.name;
       document.getElementById('studentId').value = currentUser.studentId;
       
       // 填充问卷信息
       const questionnaire = currentUser.questionnaire;
       
       // 填充性别
       if (questionnaire.gender) {
           const genderRadio = document.querySelector(`input[name="gender"][value="${questionnaire.gender}"]`);
           if (genderRadio) genderRadio.checked = true;
       }
       
       // 填充匹配性别偏好
       if (questionnaire.matchGenderPreference) {
           const matchGenderRadio = document.querySelector(`input[name="matchGenderPreference"][value="${questionnaire.matchGenderPreference}"]`);
           if (matchGenderRadio) matchGenderRadio.checked = true;
       }
       
       // 填充书目类型（多选）
       if (questionnaire.bookCategories && questionnaire.bookCategories.length > 0) {
           questionnaire.bookCategories.forEach(category => {
               const checkbox = document.querySelector(`input[name="bookCategories"][value="${category}"]`);
               if (checkbox) checkbox.checked = true;
           });
       }
       
       // 填充兴趣爱好和读过的书
       document.getElementById('hobbies').value = (questionnaire.hobbies || []).join(', ');
       document.getElementById('books').value = (questionnaire.books || []).join(', ');
       
       // 填充详细偏好
       if (questionnaire.detailedBookPreferences) {
           document.getElementById('detailedPreferences').value = questionnaire.detailedBookPreferences;
           // 触发字符计数器更新
           const event = new Event('input');
           document.getElementById('detailedPreferences').dispatchEvent(event);
       }
       
       // 填充最爱书籍
       populateFavoriteBooks(questionnaire.favoriteBooks || []);
       
       // 填充阅读预期
       if (questionnaire.readingCommitment) {
           const commitmentRadio = document.querySelector(`input[name="readingCommitment"][value="${questionnaire.readingCommitment}"]`);
           if (commitmentRadio) commitmentRadio.checked = true;
       }
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

    // 5. 升级版详细书籍偏好AI文本分析
    if (text1.trim() && text2.trim()) {
        result.textPreferenceAnalysis = await getAiTextPreferenceAnalysis(text1, text2);
    }

    // 计算传统维度分数
    result.matchingDimensions.traditional_similarity = 
        (hobbyResult.score + bookResult.score + 
         (result.commonBooks.filter(b => b.source === 'favorite').length * 1.2) +
         (result.readingCommitmentCompatibility?.score || 0) * 0.8 +
         (result.textPreferenceAnalysis?.similarity_score || 0) * 1.5);

    // ===== 阶段2: 深度AI人格分析 =====
    
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
        personality: personality1.confidence_score * personality2.confidence_score * 1.5 * dataCompletenessMultiplier,
        implicit: (implicit1.confidence_score + implicit2.confidence_score) / 2 * 1.2 * dataCompletenessMultiplier,
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

    // 2. AI 语义匹配 (权重: AI分数 * 0.8)
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

// ===== 新一代AI驱动匹配系统 =====

/**
 * 创建标准化的用户画像，用于AI匹配分析
 * @param {Object} user - 用户数据
 * @returns {Object} 标准化的用户画像
 */
function createUserProfile(user) {
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
    
    return {
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
            gender_preference: questionnaire.matchGenderPreference || ''
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
}

/**
 * 新一代AI驱动的用户匹配引擎
 * 使用单次AI调用完成全面的匹配分析，替代原有的多层次计算
 * @param {Object} user1 - 第一个用户
 * @param {Object} user2 - 第二个用户  
 * @returns {Object} 详细的匹配分析结果
 */
async function calculateAICompatibility(user1, user2) {
    // 首先检查性别偏好匹配
    if (!checkGenderPreferenceMatch(user1, user2)) {
        return {
            score: 0,
            reason: "性别偏好不匹配",
            gender_preference_compatible: false,
            analysis: null
        };
    }
    
    // 创建标准化用户画像
    const profile1 = createUserProfile(user1);
    const profile2 = createUserProfile(user2);
    
    // 数据质量检查 - 如果两个用户的数据都很少，返回低分
    const minCompleteness = Math.min(profile1.data_quality.completeness_score, profile2.data_quality.completeness_score);
    if (minCompleteness < 0.2) {
        return {
            score: minCompleteness * 2, // 最多0.4分
            reason: "用户数据不足，无法进行有效匹配",
            gender_preference_compatible: true,
            data_completeness_issue: true,
            analysis: {
                user1_completeness: profile1.data_quality.completeness_score,
                user2_completeness: profile2.data_quality.completeness_score
            }
        };
    }
    
    // 调用AI进行全面匹配分析
    try {
        const aiAnalysis = await getAIMatchingAnalysis(profile1, profile2);
        
        // 根据数据完整性调整最终分数
        const dataQualityMultiplier = (profile1.data_quality.completeness_score + profile2.data_quality.completeness_score) / 2;
        const adjustedScore = aiAnalysis.compatibility_score * Math.min(dataQualityMultiplier + 0.3, 1.0);
        
        return {
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
    } catch (error) {
        console.warn('AI匹配分析失败，返回低分:', error);
        return {
            score: 0.1,
            reason: "AI分析失败",
            gender_preference_compatible: true,
        };
    }
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

        if (!response.ok) {
            throw new Error(`AI API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            const analysis = JSON.parse(content);
            
            // 验证和标准化返回结果
            return {
                compatibility_score: Math.max(0, Math.min(10, analysis.compatibility_score || 0)),
                match_type: analysis.match_type || "未知类型",
                confidence_level: Math.max(0, Math.min(1, analysis.confidence_level || 0.5)),
                summary: analysis.summary || "AI分析完成",
                detailed_analysis: analysis.detailed_analysis || {},
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
        } catch (parseError) {
            console.warn('AI返回的JSON解析失败:', parseError, content);
            throw new Error('AI返回格式错误');
        }
    } catch (error) {
        console.error('AI匹配分析请求失败:', error);
        throw error;
    }
}

// 寻找相似搭档（仅管理员）- 升级版
async function findSimilarMatches() {
    if (!isAdmin) {
        alert('只有管理员可以进行匹配');
        return;
    }
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }

    document.getElementById('loadingIndicator').style.display = 'block';
    const matches = [];
    const promises = [];

    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            // 首先检查性别偏好匹配
            if (!checkGenderPreferenceMatch(members[i], members[j])) {
                continue; // 跳过不符合性别偏好的配对
            }
            
            promises.push(
                calculateAICompatibility(members[i], members[j]).then(result => {
                    if (result.score > 0) {
                        matches.push({
                            member1: members[i],
                            member2: members[j],
                            score: result.score,
                            reason: result.reason,
                            // 保持向后兼容的字段
                            commonHobbies: result.analysis?.commonHobbies || [],
                            commonBooks: result.analysis?.commonBooks || [],
                            detailLevel: result.analysis?.detailLevel || { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 },
                            // 新增AI分析数据
                            aiAnalysis: result.analysis?.ai_analysis,
                            matchType: result.analysis?.ai_analysis?.match_type,
                            confidenceLevel: result.analysis?.ai_analysis?.confidence_level,
                            type: 'similar'
                        });
                    }
                })
            );
        }
    }

    await Promise.all(promises);
    matches.sort((a, b) => b.score - a.score);
    document.getElementById('loadingIndicator').style.display = 'none';
    displayMatches(matches.slice(0, 10), '🎯 深度智能相似搭档推荐');
}

// 寻找互补搭档（仅管理员）- 升级版
async function findComplementaryMatches() {
    if (!isAdmin) {
        alert('只有管理员可以进行匹配');
        return;
    }
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }

    document.getElementById('loadingIndicator').style.display = 'block';
    const matches = [];
    const promises = [];

    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            // 首先检查性别偏好匹配
            if (!checkGenderPreferenceMatch(members[i], members[j])) {
                continue; // 跳过不符合性别偏好的配对
            }
            
            promises.push(
                calculateAICompatibility(members[i], members[j]).then(result => {
                    matches.push({
                        member1: members[i],
                        member2: members[j],
                        score: result.score,
                        reason: result.reason,
                        // 保持向后兼容的字段
                        commonHobbies: result.analysis?.commonHobbies || [],
                        commonBooks: result.analysis?.commonBooks || [],
                        detailLevel: result.analysis?.detailLevel || { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 },
                        // 新增AI分析数据
                        aiAnalysis: result.analysis?.ai_analysis,
                        matchType: result.analysis?.ai_analysis?.match_type,
                        confidenceLevel: result.analysis?.ai_analysis?.confidence_level,
                        type: 'complementary'
                    });
                })
            );
        }
    }

    await Promise.all(promises);
    
    // 互补匹配：寻找分数适中但具有高成长潜力的组合
    matches.sort((a, b) => {
        const aGrowthScore = a.matchingDimensions.growth_potential + 
                           (a.deepCompatibilityAnalysis?.compatibility_dimensions?.growth_potential || 0) * 2;
        const bGrowthScore = b.matchingDimensions.growth_potential + 
                           (b.deepCompatibilityAnalysis?.compatibility_dimensions?.growth_potential || 0) * 2;
        return bGrowthScore - aGrowthScore;
    });
    
    document.getElementById('loadingIndicator').style.display = 'none';
    displayMatches(matches.slice(0, 10), '🌱 深度智能互补搭档推荐');
}

// 显示匹配结果
function displayMatches(matches, title) {
    const resultsDiv = document.getElementById('matchResults');
    
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-data">没有找到合适的匹配</div>';
        return;
    }
    
    resultsDiv.innerHTML = `
        <div class="section">
            <h2>${title}</h2>
            <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
                <p>📊 管理员专用：智能匹配结果分析</p>
                <small>匹配类型：✅ 精确匹配 (1.0分) | 🔗 语义匹配 (0.8分) | 📂 类别匹配 (0.6分)</small>
            </div>
            ${matches.map((match, index) => `
                <div class="match-item">
                    <h3>匹配 ${index + 1} ${generateMatchIcon(match.score)}</h3>
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
    
    // 人格画像分析结果
    if (match.personalityProfiles && match.personalityProfiles.member1 && match.personalityProfiles.member2) {
        const p1 = match.personalityProfiles.member1;
        const p2 = match.personalityProfiles.member2;
        
        if (p1.confidence_score > 0.3 && p2.confidence_score > 0.3) {
            detailsHtml += `
                <div class="common-interests personality-analysis">
                    <h4>🧠 阅读人格画像分析</h4>
                    <div class="personality-comparison">
                        <div class="personality-dimensions">
                            ${generatePersonalityComparison(p1, p2)}
                        </div>
                        <div class="cognitive-styles">
                            <span class="match-type-label">认知风格：</span>
                            <span class="tag cognitive-tag">${p1.cognitive_style}</span>
                            <span class="vs-indicator">vs</span>
                            <span class="tag cognitive-tag">${p2.cognitive_style}</span>
                        </div>
                        ${generateCulturalOrientation(p1, p2)}
                    </div>
                </div>
            `;
        }
    }
    
    // 隐含偏好分析结果
    if (match.implicitAnalysis && match.implicitAnalysis.member1 && match.implicitAnalysis.member2) {
        const i1 = match.implicitAnalysis.member1;
        const i2 = match.implicitAnalysis.member2;
        
        if (i1.confidence_score > 0.3 && i2.confidence_score > 0.3) {
            detailsHtml += `
                <div class="common-interests implicit-analysis">
                    <h4>🔍 隐含偏好分析</h4>
                    ${generateImplicitComparison(i1, i2)}
                </div>
            `;
        }
    }
    
    // 深度兼容性分析结果
    if (match.deepCompatibilityAnalysis && match.deepCompatibilityAnalysis.compatibility_score > 0) {
        const compat = match.deepCompatibilityAnalysis;
        detailsHtml += `
            <div class="common-interests deep-compatibility">
                <h4>💫 深度兼容性分析</h4>
                <div class="compatibility-overview">
                    <div class="compatibility-type">
                        <span class="match-type-label">匹配类型：</span>
                        <span class="tag compatibility-type-tag ${compat.compatibility_type}">${getCompatibilityTypeLabel(compat.compatibility_type)}</span>
                        <span class="tag chemistry-tag">${getChemistryLabel(compat.reading_chemistry)}</span>
                    </div>
                    <div class="relationship-dynamics">
                        <span class="match-type-label">互动模式：</span>
                        <span class="tag dynamics-tag">${getRelationshipDynamicsLabel(compat.relationship_dynamics)}</span>
                    </div>
                </div>
                
                ${compat.compatibility_dimensions ? generateCompatibilityDimensions(compat.compatibility_dimensions) : ''}
                
                ${compat.synergy_potential && compat.synergy_potential.length > 0 ? `
                    <div class="synergy-section">
                        <span class="match-type-label">✨ 协同效应：</span>
                        <div class="synergy-list">
                            ${compat.synergy_potential.map(potential => `
                                <div class="synergy-item">• ${potential}</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${compat.growth_opportunities && compat.growth_opportunities.length > 0 ? `
                    <div class="growth-section">
                        <span class="match-type-label">🌱 成长机会：</span>
                        <div class="growth-list">
                            ${compat.growth_opportunities.map(opportunity => `
                                <div class="growth-item">• ${opportunity}</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 匹配维度得分展示
    if (match.matchingDimensions) {
        const dimensions = match.matchingDimensions;
        detailsHtml += `
            <div class="common-interests dimensions-breakdown">
                <h4>📊 匹配维度得分</h4>
                <div class="dimensions-grid">
                    <div class="dimension-item">
                        <span class="dimension-label">传统相似度</span>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${Math.min(dimensions.traditional_similarity * 10, 100)}%"></div>
                            <span class="score-value">${dimensions.traditional_similarity.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">人格兼容度</span>
                        <div class="score-bar">
                            <div class="score-fill personality" style="width: ${Math.min(dimensions.personality_compatibility * 10, 100)}%"></div>
                            <span class="score-value">${dimensions.personality_compatibility.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">隐含共鸣</span>
                        <div class="score-bar">
                            <div class="score-fill implicit" style="width: ${Math.min(dimensions.implicit_resonance * 10, 100)}%"></div>
                            <span class="score-value">${dimensions.implicit_resonance.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">成长潜力</span>
                        <div class="score-bar">
                            <div class="score-fill growth" style="width: ${Math.min(dimensions.growth_potential * 10, 100)}%"></div>
                            <span class="score-value">${dimensions.growth_potential.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="dimension-item">
                        <span class="dimension-label">整体化学反应</span>
                        <div class="score-bar">
                            <div class="score-fill chemistry" style="width: ${Math.min(dimensions.overall_chemistry * 10, 100)}%"></div>
                            <span class="score-value">${dimensions.overall_chemistry.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
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
