# 快速配置指南

## 需要创建的配置文件

由于 `.env` 文件通常被 `.gitignore` 忽略，你需要手动创建以下配置文件。

### 前端配置文件

#### 1. `frontend/.env.development`（开发环境）

创建文件 `frontend/.env.development`，内容如下：

```env
# 开发环境配置
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:8001
```

#### 2. `frontend/.env.production`（生产环境）

创建文件 `frontend/.env.production`，根据你的部署方式选择：

**同域名部署**（推荐）：
```env
# 生产环境配置（同域名部署）
VITE_API_BASE_URL=/api
```

**分离部署**：
```env
# 生产环境配置（分离部署）
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 后端配置文件

#### 3. `backend/.env`（开发/生产环境）

创建文件 `backend/.env`，根据环境选择：

**开发环境**（可选，默认已足够）：
```env
# 开发环境配置（可选）
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**生产环境**（必须配置）：
```env
# 生产环境配置
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 快速命令

### 创建前端配置文件（Windows PowerShell）

```powershell
# 开发环境
@"
# 开发环境配置
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:8001
"@ | Out-File -FilePath "frontend\.env.development" -Encoding utf8

# 生产环境（同域名部署）
@"
# 生产环境配置（同域名部署）
VITE_API_BASE_URL=/api
"@ | Out-File -FilePath "frontend\.env.production" -Encoding utf8
```

### 创建前端配置文件（Linux/Mac）

```bash
# 开发环境
cat > frontend/.env.development << 'EOF'
# 开发环境配置
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:8001
EOF

# 生产环境（同域名部署）
cat > frontend/.env.production << 'EOF'
# 生产环境配置（同域名部署）
VITE_API_BASE_URL=/api
EOF
```

### 创建后端配置文件（Windows PowerShell）

```powershell
# 开发环境（可选）
@"
# 开发环境配置（可选）
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
```

### 创建后端配置文件（Linux/Mac）

```bash
# 开发环境（可选）
cat > backend/.env << 'EOF'
# 开发环境配置（可选）
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
```

## 使用说明

### 本地开发

1. 创建 `frontend/.env.development` 和 `backend/.env`（可选）
2. 启动后端：`cd backend && python main.py`
3. 启动前端：`cd frontend && npm run dev`
4. 访问 `http://localhost:5173`

### 生产部署

1. 创建 `frontend/.env.production` 和 `backend/.env`（必须）
2. 构建前端：`cd frontend && npm run build`
3. 部署前端静态文件到服务器
4. 部署后端代码到服务器
5. 配置Nginx（参考 `DEPLOYMENT.md`）
6. 启动后端服务（使用 systemd 或 PM2）

## 详细文档

更多详细信息请参考 `DEPLOYMENT.md`。

