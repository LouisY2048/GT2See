# 🚀 GT2See 部署指南

本指南将帮助你将 GT2See 项目部署到生产环境。

## 📋 部署架构

GT2See 是一个全栈应用，需要分别部署前端和后端：

- **前端**: React + Vite 静态应用 → 部署到 GitHub Pages
- **后端**: FastAPI Python 应用 → 部署到 Railway/Render 等平台

## 🌐 前端部署（GitHub Pages）

### 步骤 1: 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 部分，选择 **GitHub Actions**
4. 保存设置

### 步骤 2: 配置后端 API 地址

1. 进入仓库 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下 Secret：
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: 你的后端部署地址（例如：`https://gt2see-backend.railway.app`）

### 步骤 3: 触发部署

1. 推送代码到 `main` 分支
2. GitHub Actions 会自动运行部署工作流
3. 等待部署完成（约 2-5 分钟）
4. 访问：`https://你的用户名.github.io/GT2See/`

### 步骤 4: 自定义域名（可选）

1. 在仓库 Settings → Pages 中配置 Custom domain
2. 在你的域名 DNS 中添加 CNAME 记录指向 `你的用户名.github.io`

## 🔧 后端部署

### 方案一：Railway（推荐）

#### 优点
- ✅ 免费层可用（每月 $5 额度）
- ✅ 自动部署
- ✅ 简单易用
- ✅ 支持环境变量

#### 部署步骤

1. **注册账号**
   - 访问 [Railway](https://railway.app)
   - 使用 GitHub 账号登录

2. **创建项目**
   - 点击 **New Project**
   - 选择 **Deploy from GitHub repo**
   - 选择你的仓库

3. **配置服务**
   - Railway 会自动检测到 `backend/` 目录
   - 如果未自动检测，手动设置：
     - **Root Directory**: `backend`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **配置环境变量**（如需要）
   - 在服务设置中添加环境变量
   - 例如：`CORS_ORIGINS=https://你的用户名.github.io`

5. **部署**
   - Railway 会自动构建并部署
   - 部署完成后，复制生成的 URL

### 方案二：Render

#### 优点
- ✅ 免费层可用
- ✅ 自动部署
- ✅ 支持自定义域名

#### 部署步骤

1. **注册账号**
   - 访问 [Render](https://render.com)
   - 使用 GitHub 账号登录

2. **创建 Web Service**
   - 点击 **New** → **Web Service**
   - 连接你的 GitHub 仓库

3. **配置服务**
   - **Name**: `gt2see-backend`（或你喜欢的名字）
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     cd backend && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

4. **配置环境变量**
   - 在 Environment 部分添加：
     - `CORS_ORIGINS`: `https://你的用户名.github.io`

5. **部署**
   - 点击 **Create Web Service**
   - 等待部署完成（约 5-10 分钟）
   - 复制生成的 URL

### 方案三：Fly.io

#### 优点
- ✅ 免费层可用
- ✅ 全球边缘部署
- ✅ 支持 Docker

#### 部署步骤

1. **安装 Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **登录**
   ```bash
   fly auth login
   ```

3. **初始化应用**
   ```bash
   cd backend
   fly launch
   ```

4. **配置**
   - 按照提示完成配置
   - 设置环境变量（如需要）

5. **部署**
   ```bash
   fly deploy
   ```

## 🔗 连接前后端

### 方法一：通过环境变量（推荐）

1. **GitHub Pages**
   - 在仓库 Settings → Secrets 中设置 `VITE_API_BASE_URL`

2. **本地开发**
   - 创建 `frontend/.env.local`：
     ```env
     VITE_API_BASE_URL=https://your-backend-url.com
     ```

### 方法二：修改代码

如果环境变量不生效，可以直接修改 `frontend/src/services/api.ts`：

```typescript
const getApiBaseUrl = () => {
  // 生产环境使用完整URL
  if (import.meta.env.PROD) {
    return 'https://your-backend-url.com'
  }
  // 开发环境使用代理
  return '/api'
}
```

## ✅ 验证部署

### 检查后端

1. 访问后端健康检查：`https://your-backend-url.com/health`
2. 应该返回：`{"status":"ok"}`
3. 访问 API 文档：`https://your-backend-url.com/docs`

### 检查前端

1. 访问前端页面：`https://你的用户名.github.io/GT2See/`
2. 打开浏览器开发者工具（F12）
3. 检查 Network 标签，确认 API 请求是否成功

## 🔄 更新部署

### 前端更新

- 推送代码到 `main` 分支
- GitHub Actions 会自动重新部署

### 后端更新

- **Railway**: 自动检测并重新部署
- **Render**: 自动检测并重新部署
- **Fly.io**: 运行 `fly deploy`

## 🐛 常见问题

### 问题 1: CORS 错误

**症状**: 前端无法访问后端 API

**解决方案**:
1. 检查后端 `config.py` 中的 `CORS_ORIGINS` 设置
2. 确保包含前端部署地址：
   ```python
   CORS_ORIGINS = [
       "https://你的用户名.github.io",
       "http://localhost:5173",  # 本地开发
   ]
   ```

### 问题 2: API 请求失败

**症状**: 前端显示网络错误

**解决方案**:
1. 检查后端是否正常运行
2. 检查 `VITE_API_BASE_URL` 是否正确配置
3. 检查浏览器控制台的错误信息

### 问题 3: 构建失败

**症状**: GitHub Actions 部署失败

**解决方案**:
1. 检查 Actions 日志
2. 确保 `package.json` 中的依赖正确
3. 确保 Node.js 版本兼容（推荐 18+）

## 📝 部署检查清单

- [ ] 后端已部署并可以访问
- [ ] 后端健康检查返回正常
- [ ] 前端 GitHub Pages 已启用
- [ ] `VITE_API_BASE_URL` Secret 已配置
- [ ] GitHub Actions 部署成功
- [ ] 前端可以正常访问
- [ ] API 请求可以正常发送
- [ ] CORS 配置正确

## 🎉 完成！

部署完成后，你的应用应该可以通过以下地址访问：

- **前端**: `https://你的用户名.github.io/GT2See/`
- **后端 API**: `https://your-backend-url.com`
- **API 文档**: `https://your-backend-url.com/docs`

记得在 README.md 中更新在线访问链接！

