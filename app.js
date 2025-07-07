// GitHub Gist 配置 - 构建时替换
let GITHUB_TOKEN = 'BUILD_TIME_GITHUB_TOKEN';
let GIST_ID = 'BUILD_TIME_GIST_ID';
let ADMIN_PASSWORD = 'BUILD_TIME_ADMIN_PASSWORD';
const GIST_FILENAME = 'bookclub_members.json';

// 存储所有成员数据
let members = [];
let isAdmin = false;

// 页面加载时初始化
window.onload = function() {
    // 检查是否是构建时配置（包含占位符说明未配置）
    const isBuiltWithEnv = GITHUB_TOKEN !== 'BUILD_TIME_GITHUB_TOKEN' 
                          && ADMIN_PASSWORD !== 'BUILD_TIME_ADMIN_PASSWORD' 
                          && GIST_ID !== 'BUILD_TIME_GIST_ID';
    
    if (isBuiltWithEnv) {
        // 使用构建时配置，直接进入身份选择
        document.getElementById('loginSection').style.display = 'block';
        loadMembersFromGist();
    } else {
        // 降级到手动配置
        GITHUB_TOKEN = localStorage.getItem('github_token') || '';
        GIST_ID = localStorage.getItem('gist_id') || '';
        ADMIN_PASSWORD = localStorage.getItem('admin_password') || '';
        
        if (!GITHUB_TOKEN || !ADMIN_PASSWORD) {
            document.getElementById('configSection').style.display = 'block';
        } else {
            document.getElementById('loginSection').style.display = 'block';
            loadMembersFromGist();
        }
    }
};

// 保存配置
async function saveConfig() {
    const token = document.getElementById('githubToken').value.trim();
    const adminPwd = document.getElementById('adminPassword').value.trim();
    
    if (!token) {
        alert('请输入 GitHub Token');
        return;
    }
    
    if (!adminPwd) {
        alert('请设置管理员密码');
        return;
    }
    
    GITHUB_TOKEN = token;
    ADMIN_PASSWORD = adminPwd;
    localStorage.setItem('github_token', token);
    localStorage.setItem('admin_password', adminPwd);
    
    // 创建或获取 Gist
    try {
        if (!GIST_ID) {
            // 创建新的 Gist
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: '求索书社成员数据',
                    public: false,
                    files: {
                        [GIST_FILENAME]: {
                            content: JSON.stringify([])
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('创建 Gist 失败');
            }
            
            const gist = await response.json();
            GIST_ID = gist.id;
            localStorage.setItem('gist_id', GIST_ID);
        }
        
        document.getElementById('configSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        alert('配置成功！');
        loadMembersFromGist();
    } catch (error) {
        alert('配置失败：' + error.message);
    }
}

// 显示成员表单
function showMemberForm() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('memberSection').style.display = 'block';
}

// 显示管理员登录
function showAdminLogin() {
    document.getElementById('adminLoginForm').style.display = 'block';
}

// 管理员登录
function adminLogin() {
    const password = document.getElementById('loginPassword').value.trim();
    
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'block';
        renderMemberList();
        alert('管理员登录成功！');
    } else {
        alert('密码错误！');
    }
}

// 管理员退出登录
function adminLogout() {
    isAdmin = false;
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminLoginForm').style.display = 'none';
    document.getElementById('loginPassword').value = '';
    // 清空匹配结果
    document.getElementById('matchResults').innerHTML = '';
}

// 从 Gist 加载成员数据
async function loadMembersFromGist() {
    if (!GITHUB_TOKEN || !GIST_ID) {
        renderMemberList();
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
            }
        });
        
        if (!response.ok) {
            throw new Error('加载数据失败');
        }
        
        const gist = await response.json();
        const content = gist.files[GIST_FILENAME]?.content;
        
        if (content) {
            members = JSON.parse(content);
        } else {
            members = [];
        }
        
        if (isAdmin) {
            renderMemberList();
        }
    } catch (error) {
        console.error('加载失败:', error);
        if (isAdmin) {
            alert('加载数据失败，请检查网络连接');
        }
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

// 处理表单提交
document.getElementById('memberForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const hobbiesText = document.getElementById('hobbies').value.trim();
    const booksText = document.getElementById('books').value.trim();
    
    if (!name) {
        alert('请输入昵称');
        return;
    }
    
    // 先加载最新数据
    await loadMembersFromGist();
    
    // 检查是否已存在同名成员
    if (members.some(m => m.name === name)) {
        alert('该昵称已存在，请使用其他昵称');
        return;
    }
    
    // 将输入的文本转换为数组
    const hobbies = hobbiesText ? hobbiesText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
    const books = booksText ? booksText.split(/[，,]/).map(item => item.trim()).filter(item => item) : [];
    
    // 创建新成员
    const newMember = {
        id: Date.now().toString(),
        name: name,
        hobbies: hobbies,
        books: books,
        joinDate: new Date().toLocaleDateString('zh-CN')
    };
    
    // 添加到成员列表
    members.push(newMember);
    
    // 保存到 Gist
    await saveMembersToGist();
    
    // 清空表单
    clearForm();
    
    alert('信息提交成功！管理员会进行匹配分析。');
    
    // 返回登录选择界面
    document.getElementById('memberSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
});

// 清空表单
function clearForm() {
    document.getElementById('memberForm').reset();
}

// 渲染成员列表（仅管理员可见）
function renderMemberList() {
    if (!isAdmin) return;
    
    const memberListDiv = document.getElementById('memberList');
    const memberCountSpan = document.getElementById('memberCount');
    
    if (!GITHUB_TOKEN) {
        memberListDiv.innerHTML = '<div class="no-data">请先完成配置</div>';
        return;
    }
    
    if (members.length === 0) {
        memberListDiv.innerHTML = '<div class="no-data">暂无成员，等待成员提交信息</div>';
        memberCountSpan.textContent = '';
        return;
    }
    
    memberCountSpan.textContent = `(共 ${members.length} 人)`;
    
    memberListDiv.innerHTML = members.map(member => `
        <div class="member-item">
            <div class="member-info">
                <h3>${member.name}</h3>
                <div class="member-details">
                    <div>兴趣：${member.hobbies.length > 0 ? member.hobbies.join('、') : '未填写'}</div>
                    <div>读过：${member.books.length > 0 ? member.books.slice(0, 3).join('、') + (member.books.length > 3 ? '...' : '') : '未填写'}</div>
                    <div style="color: #888; font-size: 12px;">加入时间：${member.joinDate}</div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteMember('${member.id}')">删除</button>
        </div>
    `).join('');
}

// 删除成员（仅管理员）
async function deleteMember(id) {
    if (!isAdmin) {
        alert('只有管理员可以删除成员');
        return;
    }
    
    if (confirm('确定要删除这个成员吗？')) {
        members = members.filter(m => m.id !== id);
        await saveMembersToGist();
        renderMemberList();
        // 清空匹配结果
        document.getElementById('matchResults').innerHTML = '';
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

// 智能匹配算法
function calculateSimilarity(member1, member2) {
    const result = {
        score: 0,
        commonHobbies: [],
        commonBooks: [],
        semanticMatches: [],
        detailLevel: {
            exactMatches: 0,
            semanticMatches: 0,
            categoryMatches: 0
        }
    };
    
    // 计算兴趣爱好相似度
    const hobbyResult = calculateSmartMatches(member1.hobbies, member2.hobbies, INTEREST_CATEGORIES);
    result.commonHobbies = hobbyResult.matches;
    result.score += hobbyResult.score;
    result.detailLevel.exactMatches += hobbyResult.exactMatches;
    result.detailLevel.semanticMatches += hobbyResult.semanticMatches;
    result.detailLevel.categoryMatches += hobbyResult.categoryMatches;
    
    // 计算书籍相似度
    const bookResult = calculateSmartMatches(member1.books, member2.books, BOOK_CATEGORIES);
    result.commonBooks = bookResult.matches;
    result.score += bookResult.score;
    result.detailLevel.exactMatches += bookResult.exactMatches;
    result.detailLevel.semanticMatches += bookResult.semanticMatches;
    result.detailLevel.categoryMatches += bookResult.categoryMatches;
    
    return result;
}

// 智能匹配函数
function calculateSmartMatches(list1, list2, categories) {
    const matches = [];
    let score = 0;
    let exactMatches = 0;
    let semanticMatches = 0;
    let categoryMatches = 0;
    
    // 精确匹配（权重：1.0）
    for (const item1 of list1) {
        for (const item2 of list2) {
            if (item1 === item2) {
                matches.push({ item: item1, type: 'exact', weight: 1.0 });
                score += 1.0;
                exactMatches++;
            }
        }
    }
    
    // 包含关系匹配（权重：0.8）
    for (const item1 of list1) {
        for (const item2 of list2) {
            if (item1 !== item2) {
                if (item1.includes(item2) || item2.includes(item1)) {
                    const existing = matches.find(m => m.item === item1 || m.item === item2);
                    if (!existing) {
                        matches.push({ 
                            item: `${item1} ≈ ${item2}`, 
                            type: 'contains', 
                            weight: 0.8 
                        });
                        score += 0.8;
                        semanticMatches++;
                    }
                }
            }
        }
    }
    
    // 同类别匹配（权重：0.6）
    for (const [category, keywords] of Object.entries(categories)) {
        const matches1 = list1.filter(item => keywords.some(keyword => 
            item.includes(keyword) || keyword.includes(item)
        ));
        const matches2 = list2.filter(item => keywords.some(keyword => 
            item.includes(keyword) || keyword.includes(item)
        ));
        
        if (matches1.length > 0 && matches2.length > 0) {
            const existingExact = matches.find(m => 
                m.type === 'exact' && (matches1.includes(m.item) || matches2.includes(m.item))
            );
            const existingContains = matches.find(m => 
                m.type === 'contains' && (
                    matches1.some(item => m.item.includes(item)) || 
                    matches2.some(item => m.item.includes(item))
                )
            );
            
            if (!existingExact && !existingContains) {
                matches.push({ 
                    item: `${category}类兴趣`, 
                    type: 'category', 
                    weight: 0.6,
                    details: `${matches1.join('、')} ⟷ ${matches2.join('、')}`
                });
                score += 0.6;
                categoryMatches++;
            }
        }
    }
    
    return {
        matches: matches,
        score: score,
        exactMatches,
        semanticMatches,
        categoryMatches
    };
}

// 寻找相似搭档（仅管理员）
function findSimilarMatches() {
    if (!isAdmin) {
        alert('只有管理员可以进行匹配');
        return;
    }
    
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }
    
    const matches = [];
    
    // 计算所有成员两两之间的相似度
    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            const similarity = calculateSimilarity(members[i], members[j]);
            if (similarity.score > 0) {
                matches.push({
                    member1: members[i],
                    member2: members[j],
                    score: similarity.score,
                    commonHobbies: similarity.commonHobbies,
                    commonBooks: similarity.commonBooks,
                    detailLevel: similarity.detailLevel, // 传递 detailLevel
                    type: 'similar'
                });
            }
        }
    }
    
    // 按相似度排序
    matches.sort((a, b) => b.score - a.score);
    
    // 显示前10个匹配
    displayMatches(matches.slice(0, 10), '相似搭档推荐');
}

// 寻找互补搭档（仅管理员）
function findComplementaryMatches() {
    if (!isAdmin) {
        alert('只有管理员可以进行匹配');
        return;
    }
    
    if (members.length < 2) {
        alert('需要至少2个成员才能进行匹配');
        return;
    }
    
    const matches = [];
    
    // 计算所有成员两两之间的相似度
    for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
            const similarity = calculateSimilarity(members[i], members[j]);
            matches.push({
                member1: members[i],
                member2: members[j],
                score: similarity.score,
                commonHobbies: similarity.commonHobbies,
                commonBooks: similarity.commonBooks,
                detailLevel: similarity.detailLevel, // 传递 detailLevel
                type: 'complementary'
            });
        }
    }
    
    // 按相似度从低到高排序（互补就是相似度低）
    matches.sort((a, b) => a.score - b.score);
    
    // 显示前10个匹配
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
            <span class="match-type-label">🔗 语义相关：</span>
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
