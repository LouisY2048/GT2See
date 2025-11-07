import httpx
import json
import os
from typing import Optional, List, Dict, Any
from config import settings
from cache_manager import cache_manager

class ExchangeAPI:
    """交易所API客户端"""
    
    def __init__(self):
        self.base_url = settings.EXCHANGE_BASE_API
        self.timeout = 30.0
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.backup_prices = os.path.join(self.data_dir, 'exchange_prices_backup.json')
        self.backup_details_all = os.path.join(self.data_dir, 'exchange_details_all_backup.json')
        self.backup_details_jsonl = os.path.join(self.data_dir, 'exchange_details_backup.jsonl')

    def _read_json(self, path: str) -> Optional[Dict[str, Any]]:
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception:
            return None
        return None

    def _read_jsonl_find(self, path: str, mat_id: int) -> Optional[Dict[str, Any]]:
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            obj = json.loads(line)
                            if isinstance(obj, dict) and obj.get('matId') == mat_id:
                                return obj
                        except Exception:
                            continue
        except Exception:
            return None
        return None

    async def get_material_prices(self, mat_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取材料价格
        mat_id: None表示获取所有材料价格
        """
        # 确定请求类型和缓存键
        if mat_id is None:
            request_type = 'all_prices'
            cache_key = 'exchange:all_prices'
            url = f"{self.base_url}/mat-prices"
        else:
            request_type = 'single_price'
            cache_key = f'exchange:price:{mat_id}'
            url = f"{self.base_url}/mat-prices/{mat_id}"
        
        # 优先读取本地备份
        if mat_id is None:
            local = self._read_json(self.backup_prices)
            if local is not None:
                cache_manager.set(cache_key, local, settings.CACHE_PRICE_DATA_TTL)
                return local
        else:
            all_prices = self._read_json(self.backup_prices)
            if all_prices:
                arr = all_prices.get('prices') if isinstance(all_prices, dict) else all_prices
                if isinstance(arr, list):
                    found = next((p for p in arr if isinstance(p, dict) and p.get('matId') == mat_id), None)
                    if found is not None:
                        cache_manager.set(cache_key, found, settings.CACHE_PRICE_DATA_TTL)
                        return found

        # 尝试从缓存获取（仅缓存/本地，不再访问官方API）
        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        raise Exception("本地备份缺失：exchange prices 未找到所需数据")
    
    async def get_material_details(self, mat_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取材料详细信息（包括订单簿、历史数据）
        mat_id: None表示获取所有材料详情
        """
        # 确定请求类型和缓存键
        if mat_id is None:
            request_type = 'all_details'
            cache_key = 'exchange:all_details'
            url = f"{self.base_url}/mat-details"
        else:
            request_type = 'single_details'
            cache_key = f'exchange:details:{mat_id}'
            url = f"{self.base_url}/mat-details/{mat_id}"
        
        # 优先读取本地备份
        if mat_id is None:
            local = self._read_json(self.backup_details_all)
            if local is not None:
                cache_manager.set(cache_key, local, settings.CACHE_PRICE_DATA_TTL)
                return local
        else:
            # 先从全量备份中查找
            details_all = self._read_json(self.backup_details_all)
            if details_all and isinstance(details_all, dict):
                mats = details_all.get('materials')
                if isinstance(mats, list):
                    found = next((m for m in mats if isinstance(m, dict) and m.get('matId') == mat_id), None)
                    if found is not None:
                        cache_manager.set(cache_key, found, settings.CACHE_PRICE_DATA_TTL)
                        return found
            # 再从jsonl兜底
            found_line = self._read_jsonl_find(self.backup_details_jsonl, mat_id)
            if found_line is not None:
                cache_manager.set(cache_key, found_line, settings.CACHE_PRICE_DATA_TTL)
                return found_line

        # 尝试从缓存获取（仅缓存/本地，不再访问官方API）
        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            return cached_data

        raise Exception("本地备份缺失：exchange details 未找到所需数据")

# 全局API客户端实例
exchange_api = ExchangeAPI()

