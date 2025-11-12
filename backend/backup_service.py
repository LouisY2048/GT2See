import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, List

import httpx

from config import settings


DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

GAME_DATA_URL = settings.GAME_DATA_API
EXCHANGE_BASE = settings.EXCHANGE_BASE_API.rstrip('/')
EXCHANGE_PRICES_URL = f"{EXCHANGE_BASE}/mat-prices"
EXCHANGE_DETAILS_URL = f"{EXCHANGE_BASE}/mat-details"
EXCHANGE_DETAILS_ALL_URL = f"{EXCHANGE_BASE}/mat-details"


class BackupService:
    """Periodically backs up official API payloads to local files (overwrites)."""

    def __init__(self, interval_seconds: int = 300) -> None:
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._stopping: bool = False

    async def _fetch_json(self, client: httpx.AsyncClient, url: str) -> Any:
        resp = await client.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _atomic_write(self, target_path: str, content: str) -> None:
        tmp_path = f"{target_path}.tmp"
        with open(tmp_path, 'w', encoding='utf-8') as f:
            f.write(content)
        os.replace(tmp_path, target_path)

    def _ensure_data_dir(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)

    async def _backup_once(self) -> Dict[str, Any]:
        self._ensure_data_dir()
        result: Dict[str, Any] = {"timestamp": datetime.utcnow().isoformat() + "Z"}

        async with httpx.AsyncClient() as client:
            # 1) Game Data backup
            try:
                game_data = await self._fetch_json(client, GAME_DATA_URL)
                
                self._atomic_write(
                    os.path.join(DATA_DIR, 'game_data_backup.json'),
                    json.dumps(game_data, ensure_ascii=False, indent=2)
                )
                result['game_data'] = 'ok'
            except Exception as e:  # noqa: BLE001
                result['game_data'] = f"error: {e}"

            # 2) Exchange prices backup (all materials)
            try:
                prices = await self._fetch_json(client, EXCHANGE_PRICES_URL)
                self._atomic_write(
                    os.path.join(DATA_DIR, 'exchange_prices_backup.json'),
                    json.dumps(prices, ensure_ascii=False, separators=(',', ':'))
                )
                result['exchange_prices'] = 'ok'
            except Exception as e:  # noqa: BLE001
                result['exchange_prices'] = f"error: {e}"

            # 3) Exchange material details backup（使用全量详情接口即可）
            try:
                # Prefer single-shot all materials details (7-day history)
                try:
                    details_all = await self._fetch_json(client, EXCHANGE_DETAILS_ALL_URL)
                    self._atomic_write(
                        os.path.join(DATA_DIR, 'exchange_details_all_backup.json'),
                        json.dumps(details_all, ensure_ascii=False, separators=(',', ':'))
                    )
                    result['exchange_details_all'] = 'ok'
                except Exception as e_all:  # noqa: BLE001
                    result['exchange_details_all'] = f"error: {e_all}"
            except Exception as e:  # noqa: BLE001
                result['exchange_details_all'] = f"error: {e}"

        return result

    async def _runner(self) -> None:
        while not self._stopping:
            try:
                await self._backup_once()
            except Exception:
                # swallow to keep the loop alive
                pass
            await asyncio.sleep(self.interval_seconds)

    def start(self) -> None:
        if self._task is None:
            self._stopping = False
            self._task = asyncio.create_task(self._runner(), name='backup_service_runner')

    async def stop(self) -> None:
        self._stopping = True
        if self._task is not None:
            try:
                await asyncio.wait_for(self._task, timeout=1)
            except Exception:
                pass
            self._task = None

    async def run_once(self) -> Dict[str, Any]:
        return await self._backup_once()


# Singleton instance used by app lifecycle
backup_service = BackupService(interval_seconds=300)


