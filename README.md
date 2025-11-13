# GT2See - Galactic Tycoons 市场分析工具

一个帮助 Galactic Tycoons 玩家进行商业决策的全栈 Web 应用。

## 项目简介

GT2See 是一个强大的市场分析工具，提供实时市场数据、建筑成本计算、配方收益分析和生产基地规划功能，帮助玩家做出最优的商业决策。

## 🚀 游戏入口
Galactic Tycoons（译名：银河大亨）：https://galactictycoons.com/

## 🌐 在线访问

**前端应用（GitHub Pages）**: [https://louisy2048.github.io/GT2See/](https://louisy2048.github.io/GT2See/)

## 核心功能

### 1. 实时市场价格监控
- 📊 全材料价格看板
- 📈 价格历史趋势分析
- ⚡ 实时数据更新（带缓存）
- 🔔 价格预警系统（计划中）


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
- 🔗 产业链模拟（计划中）

## 技术架构

### 后端
- **FastAPI** - 现代高性能Web框架
- **httpx** - 异步HTTP客户端
- **Python 3.11+**

**特性：**
- 分层数据缓存策略
- RESTful API设计

### 前端
- **React 18** + **TypeScript**
- **Vite**
- **Ant Design**
- **Recharts**

**特性：**
- 现代化响应式设计
- 实时数据更新
- 丰富的数据可视化

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

## 数据源

- **游戏数据API**: `https://api.g2.galactictycoons.com/gamedata.json`  
  [📖 API文档](https://wiki.galactictycoons.com/api/game-data)
  
- **交易所API**: `https://api.g2.galactictycoons.com/public/exchange`  
  [📖 API文档](https://wiki.galactictycoons.com/api/exchange)

## 贡献

欢迎任何建议与意见。

## 作者

Louis YANG

---

**祝你在 Galactic Tycoons 中赚得盆满钵满！** 🚀💰

