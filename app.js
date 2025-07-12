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

// AI文本偏好分析 - 分析详细书籍偏好的相似度
async function getAiTextPreferenceAnalysis(text1, text2) {
    if (!AI_BASE_URL || !AI_API_KEY || !text1.trim() || !text2.trim()) {
        return { similarity_score: 0, common_elements: [] };
    }

    const systemPrompt = `You are an expert in analyzing reading preferences and literary tastes. Analyze two users' detailed book preferences and determine their compatibility.

Your task:
1. Identify common elements (authors, genres, themes, literary movements, geographic preferences, etc.)
2. Calculate overall similarity score from 0.0 to 1.0
3. Respond ONLY with a JSON object containing:
   - "similarity_score": float (0.0-1.0)
   - "common_elements": array of strings describing shared preferences
   - "analysis_details": string explaining the reasoning

Example response:
{
  "similarity_score": 0.75,
  "common_elements": ["东野圭吾", "日本推理小说", "心理悬疑"],
  "analysis_details": "Both users prefer Japanese mystery novels, especially Keigo Higashino's works"
}`;

    const userPrompt = JSON.stringify({ 
        preference1: text1, 
        preference2: text2 
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
                common_elements: parsedAnalysis.common_elements || [],
                analysis_details: parsedAnalysis.analysis_details || ''
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

async function calculateSimilarity(member1, member2) {
    const result = {
        score: 0,
        commonHobbies: [],
        commonBooks: [],
        detailLevel: { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 },
        readingCommitmentCompatibility: null,
        textPreferenceAnalysis: null
    };

    // 确保用户数据已迁移到最新版本
    const migratedMember1 = migrateUserData(member1);
    const migratedMember2 = migrateUserData(member2);

    // 1. 传统兴趣爱好匹配
    const hobbyResult = await calculateSmartMatches(
        migratedMember1.questionnaire.hobbies || migratedMember1.hobbies || [], 
        migratedMember2.questionnaire.hobbies || migratedMember2.hobbies || [], 
        INTEREST_CATEGORIES
    );
    result.commonHobbies = hobbyResult.matches;
    result.score += hobbyResult.score;
    result.detailLevel.exactMatches += hobbyResult.exactMatches;
    result.detailLevel.semanticMatches += hobbyResult.semanticMatches;
    result.detailLevel.categoryMatches += hobbyResult.categoryMatches;

    // 2. 传统书籍匹配
    const bookResult = await calculateSmartMatches(
        migratedMember1.questionnaire.books || migratedMember1.books || [], 
        migratedMember2.questionnaire.books || migratedMember2.books || [], 
        BOOK_CATEGORIES
    );
    result.commonBooks = bookResult.matches;
    result.score += bookResult.score;
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
        result.score += favoriteBookResult.score * 1.2; // 最爱书籍权重更高
        result.detailLevel.exactMatches += favoriteBookResult.exactMatches;
        result.detailLevel.semanticMatches += favoriteBookResult.semanticMatches;
        result.detailLevel.categoryMatches += favoriteBookResult.categoryMatches;
    }

    // 4. 阅读承诺兼容性匹配
    result.readingCommitmentCompatibility = calculateReadingCommitmentCompatibility(
        migratedMember1.questionnaire.readingCommitment || migratedMember1.readingCommitment,
        migratedMember2.questionnaire.readingCommitment || migratedMember2.readingCommitment
    );
    result.score += result.readingCommitmentCompatibility.score * 0.8; // 阅读承诺权重

    // 5. 详细书籍偏好AI文本分析
    const text1 = migratedMember1.questionnaire.detailedBookPreferences || migratedMember1.detailedBookPreferences || '';
    const text2 = migratedMember2.questionnaire.detailedBookPreferences || migratedMember2.detailedBookPreferences || '';
    
    if (text1.trim() && text2.trim()) {
        result.textPreferenceAnalysis = await getAiTextPreferenceAnalysis(text1, text2);
        result.score += result.textPreferenceAnalysis.similarity_score * 1.5; // AI文本分析权重较高
    }

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

// 寻找相似搭档（仅管理员）
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
                calculateSimilarity(members[i], members[j]).then(similarity => {
                    if (similarity.score > 0) {
                        matches.push({
                            member1: members[i],
                            member2: members[j],
                            score: similarity.score,
                            commonHobbies: similarity.commonHobbies,
                            commonBooks: similarity.commonBooks,
                            detailLevel: similarity.detailLevel,
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
    displayMatches(matches.slice(0, 10), '相似搭档推荐');
}

// 寻找互补搭档（仅管理员）
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
                calculateSimilarity(members[i], members[j]).then(similarity => {
                    matches.push({
                        member1: members[i],
                        member2: members[j],
                        score: similarity.score,
                        commonHobbies: similarity.commonHobbies,
                        commonBooks: similarity.commonBooks,
                        detailLevel: similarity.detailLevel,
                        type: 'complementary'
                    });
                })
            );
        }
    }

    await Promise.all(promises);
    matches.sort((a, b) => a.score - b.score);
    document.getElementById('loadingIndicator').style.display = 'none';
    displayMatches(matches.slice(0, 10), '互补搭档推荐');
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

// 生成详细匹配信息
function generateMatchDetails(match) {
    let detailsHtml = '';
    
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
    
    // AI文本偏好分析详情
    if (match.textPreferenceAnalysis && match.textPreferenceAnalysis.similarity_score > 0) {
        const analysis = match.textPreferenceAnalysis;
        detailsHtml += `
            <div class="common-interests">
                <h4>🤖 AI文本偏好分析</h4>
                <div class="match-type-group">
                    <span class="match-type-label">AI相似度：</span>
                    <span class="tag ai-analysis-tag">${(analysis.similarity_score * 100).toFixed(0)}% 相似</span>
                    <span class="tag score-tag">加权分数: ${(analysis.similarity_score * 1.5).toFixed(1)}</span>
                </div>
                ${analysis.common_elements && analysis.common_elements.length > 0 ? `
                    <div class="match-type-group">
                        <span class="match-type-label">🔍 共同元素：</span>
                        ${analysis.common_elements.map(element => `
                            <span class="tag ai-element-tag">${element}</span>
                        `).join('')}
                    </div>
                ` : ''}
                ${analysis.analysis_details ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #666; font-style: italic;">
                        ${analysis.analysis_details}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    return detailsHtml;
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
