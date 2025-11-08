from typing import List
import os

try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator
except ImportError:
    from pydantic import BaseSettings, validator as field_validator

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
    # 默认允许本地开发环境和 GitHub Pages 部署
    # 生产环境可通过环境变量 CORS_ORIGINS 配置，多个域名用逗号分隔
    # 例如：CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    # 注意：环境变量是字符串，会自动解析为列表
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://louisy2048.github.io",  # GitHub Pages 部署地址
    ]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """将逗号分隔的字符串转换为列表"""
        if isinstance(v, str):
            # 如果是字符串，按逗号分割并去除空白
            origins = [origin.strip() for origin in v.split(',') if origin.strip()]
            return origins if origins else []
        # 如果已经是列表，直接返回
        if isinstance(v, list):
            return v
        # 其他情况返回空列表
        return []
    
    class Config:
        env_file = ".env"

# 创建settings实例
settings = Settings()

