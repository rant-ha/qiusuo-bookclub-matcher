// GitHub Gist 配置
let GITHUB_TOKEN = '';
let GIST_ID = '';
const GIST_FILENAME = 'bookclub_members.json';

// 存储所有成员数据
let members = [];

// 页面加载时初始化
window.onload = function() {
    // 检查是否已配置
    GITHUB_TOKEN = localStorage.getItem('github_token') || '';
    GIST_ID = localStorage.getItem('gist_id') || '';
    
    if (!GITHUB_TOKEN) {
        document.getElementById('configSection').style.display = 'block';
    } else {
        loadMembersFromGist();
    }
};

// 保存配置
async function saveConfig() {
    const token = document.getElementById('githubToken').value.trim();
    if (!token) {
        alert('请输入 GitHub Token');
        return;
    }
    
    GITHUB_TOKEN = token;
    localStorage.setItem('github_token', token);
    
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
                    description: '读书社团成员数据',
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
        alert('配置成功！');
        loadMembersFromGist();
    } catch (error) {
        alert('配置失败：' + error.message);
    }
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
        
        renderMemberList();
    } catch (error) {
        console.error('加载失败:', error);
        alert('加载数据失败，请检查网络连接');
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
    
    // 更新显示
    renderMemberList();
    
    alert('成员添加成功！');
});

// 清空表单
function clearForm() {
    document.getElementById('memberForm').reset();
}

// 渲染成员列表
function renderMemberList() {
    const memberListDiv = document.getElementById('memberList');
    
    if (!GITHUB_TOKEN) {
        memberListDiv.innerHTML = '<div class="no-data">请先完成配置</div>';
        return;
    }
    
    if (members.length === 0) {
        memberListDiv.innerHTML = '<div class="no-data">暂无成员，请添加成员信息</div>';
        return;
    }
    
    memberListDiv.innerHTML = members.map(member => `
        <div class="member-item">
            <div class="member-info">
                <h3>${member.name}</h3>
                <div class="member-details">
                    <div>兴趣：${member.hobbies.length > 0 ? member.hobbies.join('、') : '未填写'}</div>
                    <div>读过：${member.books.length > 0 ? member.books.slice(0, 3).join('、') + (member.books.length > 3 ? '...' : '') : '未填写'}</div>
                </div>
            </div>
            <button class="delete-btn" onclick="deleteMember('${member.id}')">删除</button>
        </div>
    `).join('');
}

// 删除成员
async function deleteMember(id) {
    if (confirm('确定要删除这个成员吗？')) {
        members = members.filter(m => m.id !== id);
        await saveMembersToGist();
        renderMemberList();
        // 清空匹配结果
        document.getElementById('matchResults').innerHTML = '';
    }
}

// 计算两个成员的相似度
function calculateSimilarity(member1, member2) {
    const hobbies1 = new Set(member1.hobbies);
    const hobbies2 = new Set(member2.hobbies);
    const books1 = new Set(member1.books);
    const books2 = new Set(member2.books);
    
    // 计算共同爱好和书籍
    const commonHobbies = [...hobbies1].filter(h => hobbies2.has(h));
    const commonBooks = [...books1].filter(b => books2.has(b));
    
    // 计算相似度分数（共同项目数量）
    const score = commonHobbies.length + commonBooks.length;
    
    return {
        score: score,
        commonHobbies: commonHobbies,
        commonBooks: commonBooks
    };
}

// 寻找相似搭档
function findSimilarMatches() {
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

// 寻找互补搭档
function findComplementaryMatches() {
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
            ${matches.map((match, index) => `
                <div class="match-item">
                    <h3>匹配 ${index + 1}</h3>
                    ${match.type === 'similar' ? 
                        `<div class="match-score">相似度：${match.score} 个共同点</div>` :
                        `<div class="match-score">差异度：仅 ${match.score} 个共同点</div>`
                    }
                    
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
                    
                    ${(match.commonHobbies.length > 0 || match.commonBooks.length > 0) ? `
                        <div class="common-interests">
                            <h4>共同点</h4>
                            ${match.commonHobbies.length > 0 ? 
                                `<div>共同兴趣：${match.commonHobbies.map(h => `<span class="tag">${h}</span>`).join('')}</div>` : ''
                            }
                            ${match.commonBooks.length > 0 ? 
                                `<div>都读过：${match.commonBooks.map(b => `<span class="tag">${b}</span>`).join('')}</div>` : ''
                            }
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    // 滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}