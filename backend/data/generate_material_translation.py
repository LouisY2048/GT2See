#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从备份文件中提取材料名称并生成中英文对照表
"""

import json
import os
from typing import Dict, Set

def extract_unique_material_names(backup_file: str) -> Set[str]:
    """
    从备份文件中提取所有独特的材料英文名称
    
    Args:
        backup_file: 备份文件路径
        
    Returns:
        材料名称集合
    """
    material_names = set()
    
    with open(backup_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
        if 'materials' in data:
            for material in data['materials']:
                mat_name = material.get('matName')
                if mat_name:
                    material_names.add(mat_name)
    
    return material_names

def translate_material_name(en_name: str) -> str:
    """
    翻译材料名称（英文 -> 中文）
    这里使用常见的游戏术语翻译
    
    Args:
        en_name: 英文名称
        
    Returns:
        中文名称
    """
    # 基础翻译字典
    translations = {
        # 基础材料
        'Iron Ore': '铁矿石',
        'Iron': '铁',
        'Copper Ore': '铜矿石',
        'Copper': '铜',
        'Aluminium Ore': '铝矿石',
        'Aluminium': '铝',
        'Titanium Ore': '钛矿石',
        'Titanium': '钛',
        'Uranium Ore': '铀矿石',
        'Platinum Ore': '铂矿石',
        'Platinum': '铂',
        'Aeridium Ore': '气态矿石',
        'Aeridium': '气态矿',
        
        # 建筑材料
        'Concrete': '混凝土',
        'Silica': '硅石',
        'Glass': '玻璃',
        'Limestone': '石灰石',
        'Steel': '钢',
        'Wood': '木材',
        'Rubber': '橡胶',
        'Neoplast': '新塑料',
        'Neoplast Sheet': '新塑料板',
        'Polyethylene': '聚乙烯',
        'Carbon': '碳',
        'Nitrogen': '氮',
        'Hydrogen': '氢',
        'Oxygen': '氧',
        'Argon': '氩',
        
        # 农产品
        'Grain': '谷物',
        'Milk': '牛奶',
        'Meat': '肉类',
        'Eggs': '鸡蛋',
        'Fruits': '水果',
        'Vegetables': '蔬菜',
        'Cotton': '棉花',
        'Cows': '奶牛',
        'Chickens': '鸡',
        'Fertilizer': '肥料',
        'Sugar': '糖',
        'Herbs': '草药',
        'Honeycaps': '蜜帽',
        'Lobster': '龙虾',
        
        # 消耗品
        'Water': '水',
        'Drinking Water': '饮用水',
        'Rations': '口粮',
        'Fine Rations': '精制口粮',
        'Gourmet Rations': '美食口粮',
        'Ale': '麦酒',
        'Coffee': '咖啡',
        'Coffee Beans': '咖啡豆',
        'Pie': '派',
        'Exotic Spices': '异域香料',
        
        # 工具和设备
        'Tools': '工具',
        'Advanced Tools': '高级工具',
        'Workwear': '工作服',
        'Exosuit': '外骨骼',
        'Laboratory Suit': '实验室服',
        'Robot': '机器人',
        'Drone': '无人机',
        
        # 化学品
        'Ethanol': '乙醇',
        'Lubricant': '润滑剂',
        'Coolant': '冷却剂',
        'Sulfuric Acid': '硫酸',
        'Epoxy': '环氧树脂',
        'Color Compound': '颜色化合物',
        'Bioxene': '生物烯',
        'Tesserite': '特塞石',
        'Kryon': '氪离子',
        'Rejuvaline': '再生液',
        'Vitaqua': '维他水',
        'Nanites': '纳米机器人',
        
        # 电子和机械
        'Electronic Circuit': '电子电路',
        'Advanced Circuit Board': '高级电路板',
        'Transistor': '晶体管',
        'Chip': '芯片',
        'Silicon Wafer': '硅片',
        'Copper Wire': '铜线',
        'Consumer Electronics': '消费电子产品',
        'Electric Motor': '电动机',
        'Combustion Engine': '内燃机',
        'Battery': '电池',
        'Lithium': '锂',
        
        # 建筑和结构
        'Construction Kit': '建筑套件',
        'Construction Tools': '建筑工具',
        'Construction Vehicle': '建筑车辆',
        'Prefab Kit': '预制套件',
        'Modern Prefab Kit': '现代预制套件',
        'Advanced Prefab Kit': '高级预制套件',
        'Apex Prefab Kit': '顶点预制套件',
        'Advanced Construction Kit': '高级建筑套件',
        'Structural Elements': '结构元件',
        'Apex Structural Elements': '顶点结构元件',
        'Starlifter Structural Elements': '星际运输机结构元件',
        'Truss': '桁架',
        'Composite Truss': '复合桁架',
        'Insulation Panels': '隔热板',
        'Pressure Sealant Kit': '压力密封套件',
        'Amenities': '便利设施',
        'Advanced Amenities': '高级便利设施',
        'Office Supplies': '办公用品',
        'Furniture': '家具',
        
        # 飞船部件
        'Hull Plate': '船体板',
        'Starglass Hull Plate': '星玻璃船体板',
        'Tiridium Hull Plate': '钛铱船体板',
        'Cargo Bay Segment': '货舱段',
        'Fuel Tank Segment': '燃料箱段',
        'Ship Interior Kit': '飞船内部套件',
        'Ship Repair Kit': '飞船维修套件',
        'Heat Shielding': '热屏蔽',
        'Radiation Shielding': '辐射屏蔽',
        'Composite Shielding': '复合屏蔽',
        'Nanoweave Shielding': '纳米编织屏蔽',
        'Life Support System': '生命支持系统',
        'Cooling System': '冷却系统',
        'Field Cooling System': '场冷却系统',
        'Filtration System': '过滤系统',
        'Control Console': '控制台',
        'Hydrogen Generator': '氢气发生器',
        'Linear FTL Emitter': '线性FTL发射器',
        'Quantum FTL Emitter': '量子FTL发射器',
        'Extra-dimensional FTL Emitter': '超维度FTL发射器',
        'FTL Field Controller': 'FTL场控制器',
        'Sensor Array': '传感器阵列',
        'Shuttle Bridge': '穿梭机桥',
        'Hauler Bridge': '运输机桥',
        'Freighter Bridge': '货船桥',
        
        # 高级材料
        'Graphene': '石墨烯',
        'Graphenium': '石墨烯合金',
        'Graphenium Wire': '石墨烯合金线',
        'Carbon Nanotubes': '碳纳米管',
        'Aerogel': '气凝胶',
        'Kevlar': '凯夫拉',
        'Durablend': '耐久混合材料',
        'Titanium Carbide Drill': '碳化钛钻头',
        'Reinforced Glass': '强化玻璃',
        'Starglass': '星玻璃',
        'Tiridium Alloy': '钛铱合金',
        'Quadranium': '四元合金',
        'Cohesilite': '凝聚石',
        'Nanopolyne': '纳米聚合物',
        'Nanoweave': '纳米编织',
        'Biopolyne': '生物聚合物',
        
        # 科研材料
        'Research Data': '研究数据',
        'Advanced Research Data': '高级研究数据',
        'Apex Research Data': '顶点研究数据',
        'Quantum Research Data': '量子研究数据',
        'Spectra Modulator': '光谱调制器',
        'Molecular Fusion Kit': '分子融合套件',
        'Fission Fuel': '裂变燃料',
        'Fission Reactor': '裂变反应堆',
        'Antimatter': '反物质',
        'Antimatter Reactor': '反物质反应堆',
        'Antimatter Containment': '反物质容器',
        'Superconducting Coil': '超导线圈',
        
        # 高级设备
        'Mining Vehicle': '采矿车辆',
        'Drill': '钻头',
        'Pump': '泵',
        'Welding Kit': '焊接套件',
        'Industrial Machinery': '工业机械',
        'Advanced Processing Unit': '高级处理单元',
        'Operating System': '操作系统',
        'Mainframe': '大型机',
        'Quantum Mainframe': '量子大型机',
        'AICore': 'AI核心',
        'Artificial Intelligence': '人工智能',
        'AI Training Data': 'AI训练数据',
        'Neural Interface': '神经接口',
        'VR Headset': 'VR头显',
        
        # 其他
        'Fabric': '织物',
        'Leather': '皮革',
        'Flux': '助焊剂',
        'TEMP': '临时',
    }
    
    # 如果字典中有翻译，直接返回
    if en_name in translations:
        return translations[en_name]
    
    # 如果没有，尝试智能翻译
    # 处理常见后缀
    if en_name.endswith(' Ore'):
        base = en_name[:-4]
        return translate_material_name(base) + '矿石'
    elif en_name.endswith(' Kit'):
        base = en_name[:-4]
        return translate_material_name(base) + '套件'
    elif en_name.endswith(' Segment'):
        base = en_name[:-8]
        return translate_material_name(base) + '段'
    elif en_name.endswith(' Plate'):
        base = en_name[:-6]
        return translate_material_name(base) + '板'
    elif en_name.endswith(' System'):
        base = en_name[:-7]
        return translate_material_name(base) + '系统'
    elif en_name.endswith(' Reactor'):
        base = en_name[:-8]
        return translate_material_name(base) + '反应堆'
    elif en_name.endswith(' Emitter'):
        base = en_name[:-8]
        return translate_material_name(base) + '发射器'
    elif en_name.endswith(' Shielding'):
        base = en_name[:-10]
        return translate_material_name(base) + '屏蔽'
    elif en_name.endswith(' Bridge'):
        base = en_name[:-7]
        return translate_material_name(base) + '桥'
    elif en_name.endswith(' Tools'):
        base = en_name[:-6]
        return translate_material_name(base) + '工具'
    elif en_name.endswith(' Vehicle'):
        base = en_name[:-8]
        return translate_material_name(base) + '车辆'
    elif en_name.endswith(' Data'):
        base = en_name[:-5]
        return translate_material_name(base) + '数据'
    elif en_name.startswith('Advanced '):
        base = en_name[9:]
        return '高级' + translate_material_name(base)
    elif en_name.startswith('Apex '):
        base = en_name[5:]
        return '顶点' + translate_material_name(base)
    elif en_name.startswith('Quantum '):
        base = en_name[8:]
        return '量子' + translate_material_name(base)
    
    # 如果都没有匹配，返回原名称（可能需要手动翻译）
    return en_name

def generate_translation_table(backup_file: str, output_file: str):
    """
    生成中英文对照表
    
    Args:
        backup_file: 备份文件路径
        output_file: 输出文件路径
    """
    print(f"正在从 {backup_file} 提取材料名称...")
    material_names = extract_unique_material_names(backup_file)
    
    print(f"找到 {len(material_names)} 个独特的材料名称")
    
    # 生成对照表
    translation_table = {}
    untranslated = []
    
    for en_name in sorted(material_names):
        zh_name = translate_material_name(en_name)
        translation_table[en_name] = zh_name
        
        # 如果翻译结果和原文相同，说明需要手动翻译
        if zh_name == en_name:
            untranslated.append(en_name)
    
    # 保存对照表
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translation_table, f, ensure_ascii=False, indent=2)
    
    print(f"对照表已保存到 {output_file}")
    print(f"共 {len(translation_table)} 个材料")
    
    if untranslated:
        print(f"\n以下 {len(untranslated)} 个材料需要手动翻译:")
        for name in untranslated:
            print(f"  - {name}")
    else:
        print("\n所有材料都已翻译完成！")

if __name__ == '__main__':
    # 文件路径
    backup_file = os.path.join(os.path.dirname(__file__), 'exchange_details_all_backup.json')
    output_file = os.path.join(os.path.dirname(__file__), 'material_translation.json')
    
    if not os.path.exists(backup_file):
        print(f"错误: 找不到备份文件 {backup_file}")
        exit(1)
    
    generate_translation_table(backup_file, output_file)

