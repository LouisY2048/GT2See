import json
import time
from typing import Optional, Any, Dict

class CacheManager:
    """简单的内存缓存管理器"""
    
    def __init__(self):
        self.cache: Dict[str, tuple[Any, float]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存数据"""
        if key not in self.cache:
            return None
        
        data, expire_time = self.cache[key]
        
        # 检查是否过期
        if time.time() > expire_time:
            del self.cache[key]
            return None
        
        return data
    
    def set(self, key: str, value: Any, ttl: int):
        """设置缓存数据"""
        expire_time = time.time() + ttl
        self.cache[key] = (value, expire_time)
    
    def delete(self, key: str):
        """删除缓存数据"""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        """清空所有缓存"""
        self.cache.clear()
    
    def get_stats(self) -> dict:
        """获取缓存统计信息"""
        current_time = time.time()
        valid_items = sum(1 for _, expire_time in self.cache.values() if current_time <= expire_time)
        
        return {
            "total_items": len(self.cache),
            "valid_items": valid_items,
            "expired_items": len(self.cache) - valid_items
        }

# 全局缓存管理器实例
cache_manager = CacheManager()

