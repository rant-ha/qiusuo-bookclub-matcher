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
       hobbies: [],
       books: [],
       status: 'pending', // 'pending', 'approved'
       joinDate: new Date().toLocaleDateString('zh-CN')
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
           
           // 数据迁移：为没有status的老数据自动添加 'approved' 状态
           members = members.map(member => {
               if (typeof member.status === 'undefined') {
                   needsSave = true;
                   return {
                       ...member,
                       studentId: member.studentId || 'N/A', // 如果没有学号，则添加占位符
                       status: 'approved'
                   };
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

   const hobbiesText = document.getElementById('hobbies').value.trim();
   const booksText = document.getElementById('books').value.trim();

   const userIndex = members.findIndex(m => m.id === currentUser.id);
   if (userIndex > -1) {
       members[userIndex].hobbies = hobbiesText ? hobbiesText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
       members[userIndex].books = booksText ? booksText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
       
       await saveMembersToGist();
       // 更新本地 currentUser
       currentUser = members[userIndex];
       sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
       
       alert('信息更新成功！');
       toggleProfileEdit(false); // 保存成功后切换回查看模式
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
   memberListDiv.innerHTML = approvedMembers.map(member => `
       <div class="member-item">
           <div class="member-info">
               <h3>${member.name} (学号: ${member.studentId})</h3>
               <div class="member-details">
                   <div>兴趣：${member.hobbies.join('、') || '未填写'}</div>
                   <div>读过：${member.books.join('、') || '未填写'}</div>
               </div>
           </div>
           <button class="delete-btn" onclick="deleteMember('${member.id}')">删除</button>
       </div>
   `).join('');
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
        
        // 填充查看模式的信息
        document.getElementById('viewName').textContent = currentUser.name;
        document.getElementById('viewStudentId').textContent = currentUser.studentId;
        document.getElementById('viewHobbies').textContent = currentUser.hobbies.join('、');
        document.getElementById('viewBooks').textContent = currentUser.books.join('、');
        
        // 同时填充编辑模式的表单（但默认隐藏）
        document.getElementById('name').value = currentUser.name;
        document.getElementById('studentId').value = currentUser.studentId;
        document.getElementById('hobbies').value = currentUser.hobbies.join('、');
        document.getElementById('books').value = currentUser.books.join('、');
        
        // 显示查看模式，隐藏编辑模式
        document.getElementById('profileView').style.display = 'block';
        document.getElementById('memberForm').style.display = 'none';
    }
}

// 切换个人资料的编辑/查看模式
function toggleProfileEdit(isEditing) {
    const profileView = document.getElementById('profileView');
    const memberForm = document.getElementById('memberForm');
    
    if (isEditing) {
        // 切换到编辑模式
        profileView.style.display = 'none';
        memberForm.style.display = 'block';
    } else {
        // 切换回查看模式，同时更新显示的信息
        profileView.style.display = 'block';
        memberForm.style.display = 'none';
        
        // 取消编辑时，重新显示当前保存的信息
        document.getElementById('viewName').textContent = currentUser.name;
        document.getElementById('viewStudentId').textContent = currentUser.studentId;
        document.getElementById('viewHobbies').textContent = currentUser.hobbies.join('、');
        document.getElementById('viewBooks').textContent = currentUser.books.join('、');
    }
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

async function calculateSimilarity(member1, member2) {
    const result = {
        score: 0,
        commonHobbies: [],
        commonBooks: [],
        detailLevel: { exactMatches: 0, semanticMatches: 0, categoryMatches: 0 }
    };

    const hobbyResult = await calculateSmartMatches(member1.hobbies, member2.hobbies, INTEREST_CATEGORIES);
    result.commonHobbies = hobbyResult.matches;
    result.score += hobbyResult.score;
    result.detailLevel.exactMatches += hobbyResult.exactMatches;
    result.detailLevel.semanticMatches += hobbyResult.semanticMatches;
    result.detailLevel.categoryMatches += hobbyResult.categoryMatches;

    const bookResult = await calculateSmartMatches(member1.books, member2.books, BOOK_CATEGORIES);
    result.commonBooks = bookResult.matches;
    result.score += bookResult.score;
    result.detailLevel.exactMatches += bookResult.exactMatches;
    result.detailLevel.semanticMatches += bookResult.semanticMatches;
    result.detailLevel.categoryMatches += bookResult.categoryMatches;

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
        return `
            <div class="match-score">
                智能相似度：${scoreText} 分
                <span class="match-breakdown">${breakdown}</span>
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