from typing import List
import os

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

class Settings(BaseSettings):
    # API配置
    GAME_DATA_API: str = "https://api.g2.galactictycoons.com/gamedata.json"
    EXCHANGE_BASE_API: str = "https://api.g2.galactictycoons.com/public/exchange"
    
    # 速率限制配置（每5分钟100单位）
    RATE_LIMIT_TOTAL: int = 100
    RATE_LIMIT_WINDOW: int = 300  # 5分钟
    
    # 缓存配置
    CACHE_STATIC_DATA_TTL: int = 3600 * 24  # 静态数据缓存24小时
    CACHE_PRICE_DATA_TTL: int = 60  # 价格数据缓存60秒
    
    # CORS配置
    # 默认允许本地开发环境
    # 生产环境可通过环境变量 CORS_ORIGINS 配置，多个域名用逗号分隔
    # 例如：CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"

# 创建settings实例
settings = Settings()

# 从环境变量读取CORS_ORIGINS（如果存在）
# 如果环境变量是逗号分隔的字符串，转换为列表并覆盖默认值
_cors_origins_env = os.getenv('CORS_ORIGINS')
if _cors_origins_env:
    _cors_origins_list = [origin.strip() for origin in _cors_origins_env.split(',') if origin.strip()]
    if _cors_origins_list:
        settings.CORS_ORIGINS = _cors_origins_list

