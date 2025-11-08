# 部署配置说明

本项目支持两种部署方式：
1. **本地开发部署**：在本地运行，方便开发和调试
2. **云服务器部署**：部署到云服务器并配置域名，供用户访问

## 环境变量配置

项目使用环境变量来区分开发和生产环境。配置文件位于 `frontend/` 目录下：

- `.env.development` - 开发环境配置（本地开发时使用）
- `.env.production` - 生产环境配置（部署到云服务器时使用）
- `.env.example` - 配置示例文件

### 开发环境配置（.env.development）

```env
# API基础URL（开发环境使用相对路径，通过Vite代理）
VITE_API_BASE_URL=/api

# 后端服务器地址（用于Vite代理配置）
VITE_API_TARGET=http://localhost:8001
```

**使用场景**：本地开发时，前端运行在 `http://localhost:5173`，后端运行在 `http://localhost:8001`。

### 生产环境配置（.env.production）

根据你的部署方式选择配置：

#### 方式1：前后端部署在同一域名下（推荐）

```env
# API基础URL使用相对路径
VITE_API_BASE_URL=/api

# 后端服务器地址（不需要配置，因为使用相对路径）
# VITE_API_TARGET=
```

**部署架构**：
- 前端：`https://yourdomain.com/`（或 `https://www.yourdomain.com/`）
- 后端：`https://yourdomain.com/api`（通过Nginx反向代理）

**Nginx配置示例**：
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 方式2：前后端分离部署

```env
# API基础URL使用完整域名
VITE_API_BASE_URL=https://gt2see.onrender.com

# 后端服务器地址（不需要配置，因为使用完整URL）
# VITE_API_TARGET=
```

**部署架构**：
- 前端：`https://yourdomain.com/`
- 后端：`https://gt2see.onrender.com`

## 构建和部署步骤

### 1. 本地开发

1. 确保后端服务运行在 `http://localhost:8001`
2. 前端会自动使用 `.env.development` 配置
3. 运行前端开发服务器：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. 访问 `http://localhost:5173`

### 2. 生产环境构建

1. 配置 `.env.production` 文件（根据你的部署方式选择配置）
2. 构建前端：
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. 构建产物在 `frontend/dist/` 目录

### 3. 部署到云服务器

#### 选项A：前后端同域名部署（推荐）

1. **部署前端**：
   - 将 `frontend/dist/` 目录的内容上传到服务器
   - 配置Nginx指向该目录

2. **部署后端**：
   - 将后端代码上传到服务器
   - 运行后端服务（例如使用 systemd、supervisor 或 PM2）
   - 确保后端运行在 `http://localhost:8001`

3. **配置Nginx**：
   - 使用上面提供的Nginx配置示例
   - 重启Nginx服务

#### 选项B：前后端分离部署

1. **部署前端**：
   - 将 `frontend/dist/` 目录的内容上传到服务器
   - 配置Nginx指向该目录
   - 确保 `.env.production` 中配置了正确的后端API地址

2. **部署后端**：
   - 将后端代码上传到服务器
   - 配置HTTPS和域名（例如 `api.yourdomain.com`）
   - 运行后端服务

3. **配置CORS**（如果前后端不同域名）：
   - 在后端 `main.py` 中配置CORS允许前端域名访问

## 环境变量说明

- `VITE_API_BASE_URL`：API基础URL
  - 开发环境：`/api`（相对路径，通过Vite代理）
  - 生产环境（同域名）：`/api`（相对路径）
  - 生产环境（分离部署）：`https://gt2see.onrender.com`（完整URL）

- `VITE_API_TARGET`：后端服务器地址（仅开发环境使用，用于Vite代理配置）
  - 开发环境：`http://localhost:8001`
  - 生产环境：不需要配置

## 注意事项

1. **环境变量命名**：Vite要求环境变量必须以 `VITE_` 开头才能在前端代码中访问
2. **构建时替换**：环境变量在构建时会被替换，构建后无法修改
3. **安全性**：不要在前端代码中暴露敏感信息（如API密钥）
4. **CORS配置**：如果前后端分离部署，确保后端配置了正确的CORS策略

## 快速切换

- **本地开发**：使用 `.env.development`，运行 `npm run dev`
- **生产构建**：使用 `.env.production`，运行 `npm run build`

## 故障排查

1. **API请求失败**：检查 `VITE_API_BASE_URL` 配置是否正确
2. **开发环境代理不工作**：检查后端是否运行在 `VITE_API_TARGET` 指定的地址
3. **生产环境404**：检查Nginx配置，确保前端路由正确配置

