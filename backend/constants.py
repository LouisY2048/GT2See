"""
GT2See 常量定义
包括材料分类、配方类型等枚举映射
"""

# 动态映射缓存（从API获取后填充）
_MATERIAL_NAME_CACHE = {}  # {id: {'en': 'name', 'zh': 'name'}}
_BUILDING_NAME_CACHE = {}  # {id: {'en': 'name', 'zh': 'name'}}
_RECIPE_NAME_CACHE = {}    # {id: {'en': 'name', 'zh': 'name'}}

# 材料类型映射
MATERIAL_TYPES = {
    1: {
        'en': 'Metals',
        'zh': '金属'
    },
    2: {
        'en': 'Construction Materials',
        'zh': '建筑材料'
    },
    3: {
        'en': 'Agricultural Products',
        'zh': '农产品'
    },
    4: {
        'en': 'Minerals',
        'zh': '矿物'
    },
    5: {
        'en': 'Gases and Liquids',
        'zh': '气体和液体'
    },
    6: {
        'en': 'Materials',
        'zh': '材料'
    },
    7: {
        'en': 'Consumables',
        'zh': '消耗品'
    },
    8: {
        'en': 'Plastics',
        'zh': '塑料'
    },
    9: {
        'en': 'Chemicals',
        'zh': '化学品'
    },
    10: {
        'en': 'Machinery',
        'zh': '机械'
    },
    11: {
        'en': 'Electronics',
        'zh': '电子产品'
    },
    12: {
        'en': 'Science',
        'zh': '科研'
    },
    13: {
        'en': 'Ship Parts',
        'zh': '飞船部件'
    }
}

# 配方类型映射
RECIPE_TYPES = {
    1: {
        'en': 'Extraction',
        'zh': '提取'
    },
    2: {
        'en': 'Production',
        'zh': '生产'
    },
    3: {
        'en': 'Farming',
        'zh': '农业'
    }
}

# 材料来源映射
MATERIAL_SOURCES = {
    1: {
        'en': 'Extraction',
        'zh': '提取'
    },
    2: {
        'en': 'Crafting/Farming',
        'zh': '制造/农业'
    }
}

def get_material_type_name(type_id: int, lang: str = 'zh') -> str:
    """
    获取材料类型名称
    
    Args:
        type_id: 类型ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        类型名称
    """
    type_info = MATERIAL_TYPES.get(type_id, {})
    return type_info.get(lang, f'Unknown Type {type_id}')

def get_recipe_type_name(type_id: int, lang: str = 'zh') -> str:
    """
    获取配方类型名称
    
    Args:
        type_id: 类型ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        类型名称
    """
    type_info = RECIPE_TYPES.get(type_id, {})
    return type_info.get(lang, f'Unknown Type {type_id}')

def get_material_source_name(source_id: int, lang: str = 'zh') -> str:
    """
    获取材料来源名称
    
    Args:
        source_id: 来源ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        来源名称
    """
    source_info = MATERIAL_SOURCES.get(source_id, {})
    return source_info.get(lang, f'Unknown Source {source_id}')

# ==================== 动态映射管理 ====================

def update_material_cache(materials: list):
    """
    更新材料名称缓存
    
    Args:
        materials: 材料列表
    """
    global _MATERIAL_NAME_CACHE
    for material in materials:
        mat_id = material.get('id')
        if mat_id:
            # 优先使用 sName（短名称），其次 name
            en_name = material.get('sName') or material.get('name', f'Material {mat_id}')
            zh_name = material.get('name', en_name)  # 如果没有中文名就用英文名
            _MATERIAL_NAME_CACHE[mat_id] = {
                'en': en_name,
                'zh': zh_name
            }

def update_building_cache(buildings: list):
    """
    更新建筑名称缓存
    
    Args:
        buildings: 建筑列表
    """
    global _BUILDING_NAME_CACHE
    for building in buildings:
        building_id = building.get('id')
        if building_id:
            name = building.get('name', f'Building {building_id}')
            _BUILDING_NAME_CACHE[building_id] = {
                'en': name,
                'zh': name  # 游戏数据中建筑名称通常只有英文
            }

def update_recipe_cache(recipes: list):
    """
    更新配方名称缓存
    
    Args:
        recipes: 配方列表
    """
    global _RECIPE_NAME_CACHE
    for recipe in recipes:
        recipe_id = recipe.get('id')
        if recipe_id:
            name = recipe.get('name', f'Recipe {recipe_id}')
            _RECIPE_NAME_CACHE[recipe_id] = {
                'en': name,
                'zh': name  # 配方名称通常只有英文
            }

def get_material_name(material_id: int, lang: str = 'zh') -> str:
    """
    获取材料名称
    
    Args:
        material_id: 材料ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        材料名称
    """
    material_info = _MATERIAL_NAME_CACHE.get(material_id, {})
    return material_info.get(lang, f'Material {material_id}')

def get_building_name(building_id: int, lang: str = 'zh') -> str:
    """
    获取建筑名称
    
    Args:
        building_id: 建筑ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        建筑名称
    """
    building_info = _BUILDING_NAME_CACHE.get(building_id, {})
    return building_info.get(lang, f'Building {building_id}')

def get_recipe_name(recipe_id: int, lang: str = 'zh') -> str:
    """
    获取配方名称
    
    Args:
        recipe_id: 配方ID
        lang: 语言 ('zh' 或 'en')
    
    Returns:
        配方名称
    """
    recipe_info = _RECIPE_NAME_CACHE.get(recipe_id, {})
    return recipe_info.get(lang, f'Recipe {recipe_id}')

def get_all_material_names():
    """获取所有材料名称映射"""
    return _MATERIAL_NAME_CACHE.copy()

def get_all_building_names():
    """获取所有建筑名称映射"""
    return _BUILDING_NAME_CACHE.copy()

def get_all_recipe_names():
    """获取所有配方名称映射"""
    return _RECIPE_NAME_CACHE.copy()

