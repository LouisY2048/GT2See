import time
from collections import deque
from typing import Dict

class RateLimiter:
    """API速率限制管理器"""
    
    def __init__(self, total_units: int = 100, window_seconds: int = 300):
        self.total_units = total_units
        self.window_seconds = window_seconds
        self.requests: deque = deque()
        
        # API成本配置
        self.costs = {
            'single_price': 2,
            'all_prices': 5,
            'single_details': 5,
            'all_details': 60
        }
    
    def _clean_old_requests(self):
        """清理超出时间窗口的请求"""
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        
        while self.requests and self.requests[0] < cutoff_time:
            self.requests.popleft()
    
    def get_current_usage(self) -> int:
        """获取当前时间窗口内的使用量"""
        self._clean_old_requests()
        return len(self.requests)
    
    def can_make_request(self, request_type: str) -> bool:
        """检查是否可以发起请求"""
        cost = self.costs.get(request_type, 1)
        current_usage = self.get_current_usage()
        return (current_usage + cost) <= self.total_units
    
    def record_request(self, request_type: str):
        """记录请求"""
        cost = self.costs.get(request_type, 1)
        current_time = time.time()
        
        for _ in range(cost):
            self.requests.append(current_time)
    
    def get_wait_time(self, request_type: str) -> float:
        """获取需要等待的时间（秒）"""
        if self.can_make_request(request_type):
            return 0.0
        
        # 如果不能立即请求，返回需要等待的时间
        if not self.requests:
            return 0.0
        
        oldest_request = self.requests[0]
        wait_time = (oldest_request + self.window_seconds) - time.time()
        return max(0.0, wait_time)

# 全局速率限制器实例
rate_limiter = RateLimiter()

