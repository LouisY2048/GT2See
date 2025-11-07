import httpx
import os
import json
from typing import Dict, Any, List, Optional
from config import settings
from cache_manager import cache_manager
from constants import update_material_cache, update_building_cache, update_recipe_cache

class GameDataAPI:
    """游戏数据API客户端"""
    
    def __init__(self):
        self.api_url = settings.GAME_DATA_API
        self.timeout = 30.0
        self._cache_initialized = False
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.backup_game_data = os.path.join(self.data_dir, 'game_data_backup.json')
    
    async def get_game_data(self) -> Dict[str, Any]:
        """获取完整的游戏数据"""
        cache_key = 'gamedata:full'

        # 优先读取本地备份
        try:
            if os.path.exists(self.backup_game_data):
                with open(self.backup_game_data, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                cache_manager.set(cache_key, data, settings.CACHE_STATIC_DATA_TTL)
                if not self._cache_initialized:
                    self._initialize_name_caches(data)
                return data
        except Exception:
            pass

        # 尝试从缓存获取
        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            # 如果还没初始化名称缓存，现在初始化
            if not self._cache_initialized:
                self._initialize_name_caches(cached_data)
            return cached_data
        
        # 不再访问官方API：仅允许从本地备份或已有缓存获取
        raise Exception("本地备份缺失：game data 未找到所需数据")
    
    def _initialize_name_caches(self, game_data: Dict[str, Any]):
        """初始化名称缓存"""
        if not self._cache_initialized:
            materials = game_data.get('materials', [])
            buildings = game_data.get('buildings', [])
            recipes = game_data.get('recipes', [])
            
            update_material_cache(materials)
            update_building_cache(buildings)
            update_recipe_cache(recipes)
            
            self._cache_initialized = True
    
    async def get_materials(self) -> List[Dict[str, Any]]:
        """获取材料列表"""
        game_data = await self.get_game_data()
        return game_data.get('materials', [])
    
    async def get_buildings(self) -> List[Dict[str, Any]]:
        """获取建筑列表"""
        game_data = await self.get_game_data()
        return game_data.get('buildings', [])
    
    async def get_recipes(self) -> List[Dict[str, Any]]:
        """获取配方列表"""
        game_data = await self.get_game_data()
        return game_data.get('recipes', [])
    
    async def get_systems(self) -> List[Dict[str, Any]]:
        """获取星系列表"""
        game_data = await self.get_game_data()
        return game_data.get('systems', [])
    
    async def get_material_by_id(self, material_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取材料"""
        materials = await self.get_materials()
        return next((m for m in materials if m.get('id') == material_id), None)
    
    async def get_building_by_id(self, building_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取建筑"""
        buildings = await self.get_buildings()
        return next((b for b in buildings if b.get('id') == building_id), None)
    
    async def get_recipe_by_id(self, recipe_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取配方"""
        recipes = await self.get_recipes()
        return next((r for r in recipes if r.get('id') == recipe_id), None)

# 全局游戏数据API客户端实例
game_data_api = GameDataAPI()

