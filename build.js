const fs = require('fs');
const path = require('path');

// 读取环境变量
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '';
const REGULAR_ADMIN_PASSWORD = process.env.REGULAR_ADMIN_PASSWORD || '';
const AI_BASE_URL = process.env.AI_BASE_URL || '';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gpt-4.1-mini'; // 默认为 gpt-4.1-mini

console.log('构建开始...');
console.log('Token配置:', GITHUB_TOKEN ? '已配置' : '未配置');
console.log('Gist ID配置:', GIST_ID ? '已配置' : '未配置');
console.log('管理员密码配置:', ADMIN_PASSWORD ? '已配置' : '未配置');
console.log('超级管理员密码配置:', SUPER_ADMIN_PASSWORD ? '已配置' : '未配置');
console.log('普通管理员密码配置:', REGULAR_ADMIN_PASSWORD ? '已配置' : '未配置');
console.log('AI Base URL配置:', AI_BASE_URL ? '已配置' : '未配置');
console.log('AI API Key配置:', AI_API_KEY ? '已配置' : '部分配置'); // Key不完全显示
console.log('AI Model配置:', AI_MODEL_NAME);

// 读取 app.js 文件
let appJsContent = fs.readFileSync('app.js', 'utf8');

// 替换 Gist 相关占位符
appJsContent = appJsContent.replace('BUILD_TIME_GITHUB_TOKEN', GITHUB_TOKEN);
appJsContent = appJsContent.replace('BUILD_TIME_GIST_ID', GIST_ID);
appJsContent = appJsContent.replace('BUILD_TIME_ADMIN_PASSWORD', ADMIN_PASSWORD);
appJsContent = appJsContent.replace('BUILD_TIME_SUPER_ADMIN_PASSWORD', SUPER_ADMIN_PASSWORD);
appJsContent = appJsContent.replace('BUILD_TIME_REGULAR_ADMIN_PASSWORD', REGULAR_ADMIN_PASSWORD);

// 替换 AI 相关占位符
appJsContent = appJsContent.replace('BUILD_TIME_AI_BASE_URL', AI_BASE_URL);
appJsContent = appJsContent.replace('BUILD_TIME_AI_API_KEY', AI_API_KEY);
appJsContent = appJsContent.replace('BUILD_TIME_AI_MODEL_NAME', AI_MODEL_NAME);

if (GITHUB_TOKEN && GIST_ID && (ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD)) {
    console.log('✅ Gist 和认证环境变量已注入');
} else {
    console.log('⚠️  Gist 或认证环境变量未完整配置，将使用手动配置模式');
}

if (AI_BASE_URL && AI_API_KEY) {
    console.log('✅ AI 环境变量已注入');
} else {
    console.log('⚠️  AI 环境变量未配置，语义匹配将不可用');
}

// 创建构建目录
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// 复制文件到构建目录
fs.copyFileSync('index.html', 'dist/index.html');
fs.copyFileSync('register.html', 'dist/register.html');
fs.writeFileSync('dist/app.js', appJsContent);
fs.copyFileSync('README.md', 'dist/README.md');

console.log('构建完成！');
console.log('构建文件位于 dist/ 目录');
