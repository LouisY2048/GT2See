#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从备份文件中提取材料和建筑名称并生成中英文对照表
"""

import json
import os
from typing import Dict, Set

def load_existing_translations(translation_file: str) -> Dict[str, str]:
    """加载现有的翻译文件"""
    if os.path.exists(translation_file):
        with open(translation_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def extract_building_names(backup_file: str) -> Set[str]:
    """
    从备份文件中提取所有独特的建筑英文名称
    
    Args:
        backup_file: 备份文件路径
        
    Returns:
        建筑名称集合
    """
    building_names = set()
    
    with open(backup_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
        if 'buildings' in data:
            for building in data['buildings']:
                # 尝试多个可能的字段名
                name = building.get('name') or building.get('sName') or building.get('buildingName')
                if name:
                    building_names.add(name)
    
    return building_names

def translate_building_name(en_name: str) -> str:
    """
    翻译建筑名称（英文 -> 中文）
    这里使用常见的游戏术语翻译
    
    Args:
        en_name: 英文名称
        
    Returns:
        中文名称
    """
    # 基础翻译字典
    translations = {
        # 基础建筑
        'Mine': '矿场',
        'Pump': '泵站',
        'Farm': '农场',
        'Rig': '钻井平台',
        'Well': '井',
        'Extractor': '提取器',
        'Harvester': '收割机',
        'Collector': '收集器',
        'Gatherer': '采集器',
        
        # 生产建筑
        'Factory': '工厂',
        'Workshop': '工坊',
        'Plant': '工厂',
        'Mill': '磨坊',
        'Refinery': '精炼厂',
        'Forge': '锻造厂',
        'Foundry': '铸造厂',
        'Smelter': '冶炼厂',
        'Assembler': '装配厂',
        'Manufacturer': '制造商',
        'Producer': '生产商',
        'Processor': '处理器',
        
        # 研究建筑
        'Lab': '实验室',
        'Laboratory': '实验室',
        'Research': '研究所',
        'Research Center': '研究中心',
        'Research Facility': '研究设施',
        
        # 存储建筑
        'Storage': '仓库',
        'Warehouse': '仓库',
        'Silo': '筒仓',
        'Tank': '储罐',
        'Depot': '仓库',
        
        # 能源建筑
        'Generator': '发电机',
        'Power Plant': '发电厂',
        'Reactor': '反应堆',
        'Solar Panel': '太阳能板',
        'Wind Turbine': '风力发电机',
        
        # 其他建筑
        'Habitat': '居住区',
        'Residence': '住宅',
        'Dormitory': '宿舍',
        'Barracks': '兵营',
        'Market': '市场',
        'Exchange': '交易所',
        'Trading Post': '贸易站',
        'Port': '港口',
        'Spaceport': '太空港',
    }
    
    # 直接匹配
    if en_name in translations:
        return translations[en_name]
    
    # 后缀匹配
    for suffix, zh_suffix in [
        (' Mine', '矿场'),
        (' Pump', '泵站'),
        (' Farm', '农场'),
        (' Rig', '钻井平台'),
        (' Well', '井'),
        (' Factory', '工厂'),
        (' Workshop', '工坊'),
        (' Plant', '工厂'),
        (' Mill', '磨坊'),
        (' Refinery', '精炼厂'),
        (' Forge', '锻造厂'),
        (' Foundry', '铸造厂'),
        (' Smelter', '冶炼厂'),
        (' Assembler', '装配厂'),
        (' Lab', '实验室'),
        (' Laboratory', '实验室'),
        (' Research', '研究所'),
        (' Storage', '仓库'),
        (' Warehouse', '仓库'),
        (' Generator', '发电机'),
        (' Reactor', '反应堆'),
    ]:
        if en_name.endswith(suffix):
            base = en_name[:-len(suffix)]
            return f"{base}{zh_suffix}"
    
    # 前缀匹配
    for prefix, zh_prefix in [
        ('Iron ', '铁'),
        ('Copper ', '铜'),
        ('Aluminium ', '铝'),
        ('Titanium ', '钛'),
        ('Platinum ', '铂'),
        ('Uranium ', '铀'),
        ('Coal ', '煤'),
        ('Oil ', '油'),
        ('Gas ', '气'),
        ('Water ', '水'),
        ('Food ', '食物'),
        ('Advanced ', '高级'),
        ('Basic ', '基础'),
        ('Modern ', '现代'),
        ('Quantum ', '量子'),
        ('Apex ', '顶点'),
    ]:
        if en_name.startswith(prefix):
            base = en_name[len(prefix):]
            translated_base = translate_building_name(base)
            return f"{zh_prefix}{translated_base}"
    
    # 如果无法翻译，返回原名称
    return en_name

def generate_word_translation(backup_file: str, material_translation_file: str, output_file: str):
    """
    生成包含材料和建筑的中英文对照表
    
    Args:
        backup_file: 备份文件路径
        material_translation_file: 现有材料翻译文件路径
        output_file: 输出文件路径
    """
    print(f"正在从 {backup_file} 提取建筑名称...")
    building_names = extract_building_names(backup_file)
    
    print(f"找到 {len(building_names)} 个独特的建筑名称")
    
    # 加载现有的材料翻译
    print(f"正在加载现有材料翻译...")
    material_translations = load_existing_translations(material_translation_file)
    print(f"加载了 {len(material_translations)} 个材料翻译")
    
    # 合并翻译表
    translation_table = material_translations.copy()
    
    # 生成建筑翻译
    untranslated_buildings = []
    
    for en_name in sorted(building_names):
        if en_name not in translation_table:
            zh_name = translate_building_name(en_name)
            translation_table[en_name] = zh_name
            
            # 如果翻译结果和原文相同，说明需要手动翻译
            if zh_name == en_name:
                untranslated_buildings.append(en_name)
    
    # 保存对照表
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translation_table, f, ensure_ascii=False, indent=2)
    
    print(f"对照表已保存到 {output_file}")
    print(f"共 {len(translation_table)} 个词条（{len(material_translations)} 个材料 + {len(building_names)} 个建筑）")
    
    if untranslated_buildings:
        print(f"\n以下 {len(untranslated_buildings)} 个建筑需要手动翻译:")
        for name in untranslated_buildings[:20]:  # 只显示前20个
            print(f"  - {name}")
        if len(untranslated_buildings) > 20:
            print(f"  ... 还有 {len(untranslated_buildings) - 20} 个")
    else:
        print("\n所有建筑都已翻译完成！")

if __name__ == '__main__':
    # 文件路径
    backup_file = os.path.join(os.path.dirname(__file__), 'game_data_backup.json')
    # 优先使用 word_translation.json，如果不存在则使用 material_translation.json
    material_translation_file = os.path.join(os.path.dirname(__file__), 'word_translation.json')
    if not os.path.exists(material_translation_file):
        material_translation_file = os.path.join(os.path.dirname(__file__), 'material_translation.json')
    output_file = os.path.join(os.path.dirname(__file__), 'word_translation.json')
    
    if not os.path.exists(backup_file):
        print(f"错误: 找不到备份文件 {backup_file}")
        exit(1)
    
    if not os.path.exists(material_translation_file):
        print(f"警告: 找不到翻译文件 {material_translation_file}，将只生成建筑翻译")
    
    generate_word_translation(backup_file, material_translation_file, output_file)

