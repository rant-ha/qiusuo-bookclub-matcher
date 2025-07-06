const fs = require('fs');
const path = require('path');

// 读取环境变量
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

console.log('构建开始...');
console.log('Token配置:', GITHUB_TOKEN ? '已配置' : '未配置');
console.log('Gist ID配置:', GIST_ID ? '已配置' : '未配置');
console.log('管理员密码配置:', ADMIN_PASSWORD ? '已配置' : '未配置');

// 读取 app.js 文件
let appJsContent = fs.readFileSync('app.js', 'utf8');

// 替换占位符
if (GITHUB_TOKEN && GIST_ID && ADMIN_PASSWORD) {
    appJsContent = appJsContent.replace('BUILD_TIME_GITHUB_TOKEN', GITHUB_TOKEN);
    appJsContent = appJsContent.replace('BUILD_TIME_GIST_ID', GIST_ID);
    appJsContent = appJsContent.replace('BUILD_TIME_ADMIN_PASSWORD', ADMIN_PASSWORD);
    console.log('✅ 环境变量已注入到构建中');
} else {
    console.log('⚠️  环境变量未完整配置，将使用手动配置模式');
}

// 创建构建目录
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// 复制文件到构建目录
fs.copyFileSync('index.html', 'dist/index.html');
fs.writeFileSync('dist/app.js', appJsContent);
fs.copyFileSync('README.md', 'dist/README.md');

console.log('构建完成！');
console.log('构建文件位于 dist/ 目录');