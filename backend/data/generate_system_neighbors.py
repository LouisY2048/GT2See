"""
生成星系相邻关系表
计算每个星系及其相邻4光年内的星系，并保存到 system_neighbors.json
"""
import json
import os
from pathlib import Path

# 计算两个星系之间的距离（光年）
def calculate_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    计算两点之间的欧几里得距离（光年）
    
    Args:
        x1, y1: 第一个点的坐标
        x2, y2: 第二个点的坐标
    
    Returns:
        距离（光年，欧几里得距离除以50）
    """
    euclidean_distance = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    return euclidean_distance / 50.0

def generate_system_neighbors():
    """生成星系相邻关系表"""
    # 获取当前脚本所在目录
    script_dir = Path(__file__).parent
    
    # 读取游戏数据
    game_data_path = script_dir / 'game_data_backup.json'
    if not game_data_path.exists():
        print(f"错误：找不到游戏数据文件 {game_data_path}")
        return
    
    print(f"正在读取游戏数据文件: {game_data_path}")
    with open(game_data_path, 'r', encoding='utf-8') as f:
        game_data = json.load(f)
    
    systems = game_data.get('systems', [])
    if not systems:
        print("错误：游戏数据中没有星系列表")
        return
    
    print(f"找到 {len(systems)} 个星系")
    
    # 相邻距离阈值（光年）
    NEIGHBOR_DISTANCE = 4.0
    
    # 构建相邻关系表
    # 格式：{systemId: [neighborSystemId1, neighborSystemId2, ...]}
    neighbor_map = {}
    
    print("正在计算相邻关系...")
    for i, center_system in enumerate(systems):
        center_id = center_system.get('id')
        center_x = center_system.get('x', 0.0)
        center_y = center_system.get('y', 0.0)
        
        if center_id is None:
            continue
        
        neighbors = []
        
        for neighbor_system in systems:
            neighbor_id = neighbor_system.get('id')
            
            # 跳过自己
            if neighbor_id == center_id:
                continue
            
            neighbor_x = neighbor_system.get('x', 0.0)
            neighbor_y = neighbor_system.get('y', 0.0)
            
            # 计算距离（光年）
            distance = calculate_distance(center_x, center_y, neighbor_x, neighbor_y)
            
            # 如果距离在4光年以内（对应欧几里得距离200），添加到相邻列表
            if distance <= NEIGHBOR_DISTANCE:
                neighbors.append({
                    'systemId': neighbor_id,
                    'systemName': neighbor_system.get('name', f'System {neighbor_id}'),
                    'distance': round(distance, 2)
                })
        
        neighbor_map[center_id] = {
            'systemId': center_id,
            'systemName': center_system.get('name', f'System {center_id}'),
            'x': center_x,
            'y': center_y,
            'neighbors': neighbors,
            'neighborCount': len(neighbors)
        }
        
        if (i + 1) % 100 == 0:
            print(f"已处理 {i + 1}/{len(systems)} 个星系")
    
    # 保存到文件
    output_path = script_dir / 'system_neighbors.json'
    print(f"\n正在保存相邻关系表到: {output_path}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(neighbor_map, f, ensure_ascii=False, indent=2)
    
    # 统计信息
    total_neighbors = sum(len(data['neighbors']) for data in neighbor_map.values())
    avg_neighbors = total_neighbors / len(neighbor_map) if neighbor_map else 0
    max_neighbors = max((data['neighborCount'] for data in neighbor_map.values()), default=0)
    
    print(f"\n完成！")
    print(f"总星系数: {len(neighbor_map)}")
    print(f"总相邻关系数: {total_neighbors}")
    print(f"平均相邻星系数: {avg_neighbors:.2f}")
    print(f"最大相邻星系数: {max_neighbors}")
    print(f"相邻关系表已保存到: {output_path}")

if __name__ == '__main__':
    generate_system_neighbors()

