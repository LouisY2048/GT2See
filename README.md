# GT2See - Galactic Tycoons 市场分析工具

一个帮助 Galactic Tycoons 玩家进行商业决策的全栈 Web 应用。

## 项目简介

GT2See 是一个强大的市场分析工具，提供实时市场数据、建筑成本计算、配方收益分析和生产基地规划功能，帮助玩家做出最优的商业决策。

> 📢 **最新更新**: 查看 [UPDATES.md](UPDATES.md) 了解v1.1.0版本的重大改进！包括API全面对接、UI大幅升级等。

## 核心功能

### 1. 实时市场价格监控
- 📊 全材料价格看板
- 📈 价格历史趋势分析
- 🔔 价格预警系统（计划中）
- ⚡ 实时数据更新（带智能缓存）

### 2. 建筑成本计算器
- 🏗️ 精确的建筑材料清单
- 💰 实时成本估算
- 🔄 多建筑对比分析
- 📊 成本分解可视化

### 3. 配方收益分析系统
- 💎 收益率自动计算
- 🏭 按建筑筛选配方
- 📉 多维度排序（总收益/时均收益/ROI）
- 🎯 批量分析功能

### 4. 生产基地规划工具
- 🌍 星系资源分布分析
- 🎯 最优选址智能推荐
- 🔗 产业链模拟（计划中）

## 技术架构

### 后端
- **FastAPI** - 现代高性能Web框架
- **httpx** - 异步HTTP客户端
- **Python 3.8+**

**特性：**
- 智能速率限制管理
- 分层数据缓存策略
- RESTful API设计
- 完整的API文档（/docs）

### 前端
- **React 18** + **TypeScript**
- **Vite** - 快速构建工具
- **Ant Design** - 企业级UI组件
- **Recharts** - 数据可视化

**特性：**
- 现代化响应式设计
- 实时数据更新
- 丰富的数据可视化
- 直观的用户交互

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 快速安装（推荐）

**Windows:**
```bash
# 1. 安装后端依赖
cd backend
install.bat

# 2. 测试后端配置
python test_server.py

# 3. 安装前端依赖
cd ../frontend
install.bat
```

**Linux/Mac:**
```bash
# 1. 安装后端依赖
cd backend
chmod +x install.sh
./install.sh

# 2. 测试后端配置
python test_server.py

# 3. 安装前端依赖
cd ../frontend
chmod +x install.sh
./install.sh
```

### 启动服务

**方法一：分别启动（推荐调试时使用）**

终端1 - 后端：
```bash
cd backend
python main.py
```

终端2 - 前端：
```bash
cd frontend
npm run dev
```

**方法二：一键启动**
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

### 访问应用

- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:8001
- **API文档**: http://localhost:8001/docs

### 遇到问题？

如果遇到 404 错误或加载失败，请查看 [快速启动指南](QUICKSTART.md) 获取详细的问题排查步骤。

### 生产构建

**后端：**
```bash
cd backend
# 使用 gunicorn 或 uvicorn 部署
uvicorn main:app --host 0.0.0.0 --port 8001
```

**前端：**
```bash
cd frontend
npm run build
# 构建产物在 dist/ 目录
```

## API端点概览

### 游戏数据
- `GET /api/gamedata` - 获取完整游戏数据
- `GET /api/materials` - 获取材料列表
- `GET /api/buildings` - 获取建筑列表
- `GET /api/recipes` - 获取配方列表
- `GET /api/systems` - 获取星系列表

### 交易所数据
- `GET /api/exchange/prices` - 获取材料价格
- `GET /api/exchange/details` - 获取材料详细信息

### 计算器
- `GET /api/calculator/building-cost/{id}` - 计算建筑成本
- `GET /api/calculator/recipe-profit/{id}` - 计算配方收益
- `GET /api/calculator/recipe-profits` - 批量计算配方收益

### 分析器
- `GET /api/analyzer/systems` - 星系资源分析
- `GET /api/analyzer/best-location/{material_id}` - 最佳生产位置

### 系统
- `GET /api/health` - 健康检查
- `GET /api/rate-limit/status` - 速率限制状态
- `POST /api/cache/clear` - 清空缓存

## 数据源

- **游戏数据API**: `https://api.g2.galactictycoons.com/gamedata.json`  
  [📖 API文档](https://wiki.galactictycoons.com/api/game-data)
  
- **交易所API**: `https://api.g2.galactictycoons.com/public/exchange`  
  [📖 API文档](https://wiki.galactictycoons.com/api/exchange)

## 速率限制

API调用遵循以下限制：
- 总限制：每5分钟 100 单位
- 单材料价格：2 单位/请求
- 全材料价格：5 单位/请求
- 单材料详情：5 单位/请求
- 全材料详情：60 单位/请求

应用内置智能速率限制管理，自动处理频率控制。

## 缓存策略

- **静态数据**（gamedata.json）：24小时缓存
- **价格数据**（exchange API）：60秒缓存

## 项目结构

```
GT2See/
├── backend/                 # 后端服务
│   ├── main.py             # 主应用入口
│   ├── config.py           # 配置管理
│   ├── exchange_api.py     # 交易所API客户端
│   ├── game_data_api.py    # 游戏数据API客户端
│   ├── calculators.py      # 计算器逻辑
│   ├── cache_manager.py    # 缓存管理
│   ├── rate_limiter.py     # 速率限制
│   ├── requirements.txt    # Python依赖
│   └── README.md           # 后端文档
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # 公共组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── types/         # 类型定义
│   │   └── App.tsx        # 主应用
│   ├── package.json       # Node依赖
│   └── README.md          # 前端文档
│
└── README.md              # 项目主文档
```

## 开发计划

- [ ] 价格预警功能
- [ ] 产业链模拟器
- [ ] 物流成本计算
- [ ] 用户自定义看板
- [ ] 历史数据回溯
- [ ] 移动端适配

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 作者

GT2See Team

---

**祝你在 Galactic Tycoons 中赚得盆满钵满！** 🚀💰

