# 部署配置指南

本项目支持两种部署方式：
1. **本地开发部署**：在本地运行，方便开发和调试
2. **云服务器部署**：部署到云服务器并配置域名，供用户访问

## 快速开始

### 1. 创建环境变量配置文件

由于 `.env` 文件通常被 `.gitignore` 忽略，你需要手动创建这些文件。

#### 前端环境变量配置

在 `frontend/` 目录下创建以下文件：

**`frontend/.env.development`**（开发环境）：
```env
# 开发环境配置
# 本地开发时使用，API会通过Vite代理转发到本地后端

# API基础URL（开发环境使用相对路径，通过Vite代理）
VITE_API_BASE_URL=/api

# 后端服务器地址（用于Vite代理配置）
VITE_API_TARGET=http://localhost:8001
```

**`frontend/.env.production`**（生产环境）：
```env
# 生产环境配置
# 部署到云服务器时使用，请根据实际情况修改

# API基础URL（生产环境使用完整域名，例如：https://gt2see.onrender.com）
# 如果前后端部署在同一域名下，可以使用相对路径：/api
VITE_API_BASE_URL=https://gt2see.onrender.com

# 后端服务器地址（生产环境，如果前后端分离部署，填写后端API的完整URL）
# 如果前后端部署在同一域名下，可以留空或使用相对路径
# VITE_API_TARGET=https://gt2see.onrender.com
```

#### 后端环境变量配置

在 `backend/` 目录下创建以下文件：

**`backend/.env`**（开发/生产环境通用）：
```env
# 后端环境变量配置

# CORS配置（生产环境需要配置）
# 多个域名用逗号分隔，例如：
# CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# 开发环境可以不配置，默认允许 localhost:3000 和 localhost:5173
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**生产环境示例**：
```env
# 生产环境配置示例
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 部署方式

### 方式1：前后端部署在同一域名下（推荐）

这种方式的优点是配置简单，不需要处理CORS问题。

#### 架构说明

- 前端：`https://yourdomain.com/`（或 `https://www.yourdomain.com/`）
- 后端：`https://yourdomain.com/api`（通过Nginx反向代理）

#### 配置步骤

1. **前端配置**：
   - 确保 `frontend/.env.production` 中 `VITE_API_BASE_URL=/api`

2. **后端配置**：
   - 确保后端运行在 `http://localhost:8001`（或你选择的其他端口）
   - 在 `backend/.env` 中配置 `CORS_ORIGINS`（可选，因为同域名不需要CORS）

3. **Nginx配置**：

创建或编辑 `/etc/nginx/sites-available/yourdomain.com`：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL证书配置（使用Let's Encrypt或其他证书）
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

4. **启用Nginx配置**：
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重新加载配置
```

### 方式2：前后端分离部署

这种方式的优点是前后端可以独立扩展和部署。

#### 架构说明

- 前端：`https://yourdomain.com/`
- 后端：`https://api.yourdomain.com/`

#### 配置步骤

1. **前端配置**：
   - 在 `frontend/.env.production` 中设置：
     ```env
     VITE_API_BASE_URL=https://gt2see.onrender.com
     ```

2. **后端配置**：
   - 在 `backend/.env` 中配置CORS：
     ```env
     CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
     ```

3. **前端Nginx配置**：

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
```

4. **后端Nginx配置**：

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 构建和部署步骤

### 1. 本地开发

#### 前端开发

1. 确保 `frontend/.env.development` 已创建并配置正确
2. 安装依赖并启动开发服务器：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. 访问 `http://localhost:5173`

#### 后端开发

1. 确保 `backend/.env` 已创建（可选，默认配置已足够）
2. 安装依赖并启动后端服务：
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   # 或使用 uvicorn
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

### 2. 生产环境构建

#### 前端构建

1. 确保 `frontend/.env.production` 已创建并配置正确
2. 构建前端：
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. 构建产物在 `frontend/dist/` 目录

#### 后端部署

1. 确保 `backend/.env` 已创建并配置了生产环境的CORS
2. 将后端代码上传到服务器
3. 安装依赖：
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. 使用进程管理器运行后端（推荐使用 systemd、supervisor 或 PM2）

**使用 systemd 示例**：

创建 `/etc/systemd/system/gt2see-backend.service`：

```ini
[Unit]
Description=GT2See Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

启用并启动服务：
```bash
sudo systemctl enable gt2see-backend
sudo systemctl start gt2see-backend
sudo systemctl status gt2see-backend
```

**使用 PM2 示例**：

```bash
cd backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8001" --name gt2see-backend
pm2 save
pm2 startup
```

### 3. 部署到云服务器

#### 完整部署流程

1. **准备服务器**：
   - 安装 Nginx
   - 安装 Python 3.8+ 和 pip
   - 安装 Node.js 16+ 和 npm（用于构建前端）

2. **部署前端**：
   ```bash
   # 在本地构建
   cd frontend
   npm install
   npm run build
   
   # 上传 dist 目录到服务器
   scp -r dist/* user@server:/path/to/frontend/dist/
   ```

3. **部署后端**：
   ```bash
   # 上传后端代码到服务器
   scp -r backend/* user@server:/path/to/backend/
   
   # 在服务器上安装依赖
   ssh user@server
   cd /path/to/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **配置Nginx**：
   - 按照上面的Nginx配置示例创建配置文件
   - 测试并重新加载Nginx

5. **配置SSL证书**（推荐使用Let's Encrypt）：
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

6. **启动后端服务**：
   - 使用 systemd 或 PM2 启动后端服务

## 环境变量说明

### 前端环境变量

- `VITE_API_BASE_URL`：API基础URL
  - 开发环境：`/api`（相对路径，通过Vite代理）
  - 生产环境（同域名）：`/api`（相对路径）
  - 生产环境（分离部署）：`https://gt2see.onrender.com`（完整URL）

- `VITE_API_TARGET`：后端服务器地址（仅开发环境使用，用于Vite代理配置）
  - 开发环境：`http://localhost:8001`
  - 生产环境：不需要配置

### 后端环境变量

- `CORS_ORIGINS`：允许的CORS来源（多个域名用逗号分隔）
  - 开发环境：可以不配置，默认允许 `localhost:3000` 和 `localhost:5173`
  - 生产环境：`https://yourdomain.com,https://www.yourdomain.com`

## 注意事项

1. **环境变量命名**：
   - Vite要求环境变量必须以 `VITE_` 开头才能在前端代码中访问
   - 后端环境变量直接使用变量名（如 `CORS_ORIGINS`）

2. **构建时替换**：
   - 前端环境变量在构建时会被替换，构建后无法修改
   - 如果需要修改，需要重新构建

3. **安全性**：
   - 不要在前端代码中暴露敏感信息（如API密钥）
   - `.env` 文件不要提交到版本控制系统

4. **CORS配置**：
   - 如果前后端分离部署，确保后端配置了正确的CORS策略
   - 如果前后端同域名部署，通常不需要配置CORS

5. **SSL证书**：
   - 生产环境强烈建议使用HTTPS
   - 可以使用Let's Encrypt免费SSL证书

## 故障排查

### 前端问题

1. **API请求失败**：
   - 检查 `VITE_API_BASE_URL` 配置是否正确
   - 检查浏览器控制台的网络请求，查看实际请求的URL
   - 检查Nginx配置是否正确代理了 `/api` 路径

2. **开发环境代理不工作**：
   - 检查后端是否运行在 `VITE_API_TARGET` 指定的地址
   - 检查 `vite.config.ts` 中的代理配置

3. **生产环境404**：
   - 检查Nginx配置，确保前端路由正确配置（`try_files $uri $uri/ /index.html;`）
   - 检查静态文件路径是否正确

### 后端问题

1. **CORS错误**：
   - 检查 `backend/.env` 中的 `CORS_ORIGINS` 配置
   - 确保前端域名在CORS允许列表中
   - 检查后端日志，查看CORS相关错误

2. **API无法访问**：
   - 检查后端服务是否正在运行
   - 检查防火墙配置，确保端口8001（或你使用的端口）已开放
   - 检查Nginx配置，确保代理配置正确

3. **环境变量未生效**：
   - 确保 `.env` 文件在 `backend/` 目录下
   - 重启后端服务以使环境变量生效

## 快速切换

- **本地开发**：
  - 前端：使用 `.env.development`，运行 `npm run dev`
  - 后端：使用默认配置或 `.env`，运行 `python main.py` 或 `uvicorn main:app --reload`

- **生产构建**：
  - 前端：使用 `.env.production`，运行 `npm run build`
  - 后端：配置 `.env` 中的 `CORS_ORIGINS`，使用进程管理器运行

## 示例配置文件

### 前端 `.env.development`
```env
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://localhost:8001
```

### 前端 `.env.production`（同域名部署）
```env
VITE_API_BASE_URL=/api
```

### 前端 `.env.production`（分离部署）
```env
VITE_API_BASE_URL=https://gt2see.onrender.com
```

### 后端 `.env`（开发环境）
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 后端 `.env`（生产环境）
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

