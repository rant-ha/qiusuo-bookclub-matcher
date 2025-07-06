# 📚 读书社团匹配工具 - 部署说明

这是一个基于 GitHub Pages 和 GitHub Gist 的在线版读书社团匹配工具。

## 功能特点

- 多人在线填写信息
- 实时数据同步
- 相似/互补搭档匹配
- 完全免费，无需服务器

## 部署步骤

### 1. 创建 GitHub 仓库

1. 登录你的 GitHub 账号
2. 创建一个新仓库（例如：`bookclub-matcher`）
3. 将仓库设为 Public（公开）

### 2. 上传文件

将以下文件上传到仓库：
- `index.html`
- `app.js`
- `README.md`（本文件）

### 3. 启用 GitHub Pages

1. 进入仓库的 Settings（设置）
2. 找到 Pages 部分
3. Source 选择 "Deploy from a branch"
4. Branch 选择 "main"，文件夹选择 "/ (root)"
5. 点击 Save

等待几分钟后，你的网站就会发布在：
`https://[你的用户名].github.io/[仓库名]/`

### 4. 创建 GitHub Token

1. 访问 https://github.com/settings/tokens/new
2. 填写 Note（如：读书社团工具）
3. 设置过期时间（建议选择较长时间）
4. 勾选权限：只需要勾选 **gist** 权限
5. 点击 "Generate token"
6. **重要**：复制生成的 token（只显示一次）

### 5. 使用说明

1. 第一次访问网站时，会提示配置 GitHub Token
2. 输入刚才创建的 Token，点击保存
3. 系统会自动创建一个 Gist 来存储数据
4. 之后所有人都可以：
   - 添加自己的信息
   - 查看所有成员
   - 进行搭档匹配

## 注意事项

- Token 只保存在使用者的浏览器中，不会泄露
- 建议由社团管理员统一创建和配置 Token
- 数据存储在 Gist 中，可以随时导出备份
- 如果需要重置数据，删除对应的 Gist 即可

## 分享给社团成员

配置完成后，直接分享网站链接即可。成员无需 GitHub 账号就能使用。

## 故障排查

如果遇到问题：

1. 确认 Token 有 gist 权限
2. 检查网络连接
3. 尝试刷新页面
4. 清除浏览器缓存后重试

## 数据备份

数据自动保存在你的 GitHub Gist 中：
1. 访问 https://gist.github.com
2. 找到名为 "读书社团成员数据" 的 Gist
3. 可以下载 `bookclub_members.json` 文件进行备份

## 使用自定义域名（可选）

### 方法一：使用子域名（推荐）
1. 在 CNAME 文件中填写：`bookclub.yourdomain.com`
2. 在域名 DNS 设置中添加 CNAME 记录：
   - 主机记录：`bookclub`
   - 记录值：`[你的用户名].github.io`
   - TTL：默认即可

### 方法二：使用根域名
1. 在 CNAME 文件中填写：`yourdomain.com`
2. 在域名 DNS 设置中添加 A 记录，指向以下 IP：
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

### 配置步骤
1. 修改 CNAME 文件内容为你的域名
2. 将 CNAME 文件上传到仓库根目录
3. 在域名服务商处配置 DNS
4. 在 GitHub 仓库 Settings > Pages 中可以看到自定义域名状态
5. 建议开启 "Enforce HTTPS"

DNS 生效需要几分钟到几小时不等。