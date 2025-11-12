from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional, List, Dict, Any
import uvicorn
import json
import os

from config import settings
from exchange_api import exchange_api
from game_data_api import game_data_api
from calculators import BuildingCalculator, RecipeCalculator, SystemAnalyzer, ComprehensiveAnalyzer
from backup_service import backup_service
from rate_limiter import rate_limiter
from cache_manager import cache_manager
from constants import (
    MATERIAL_TYPES, RECIPE_TYPES, 
    get_material_type_name, get_recipe_type_name,
    get_material_name, get_building_name, get_recipe_name,
    get_all_material_names, get_all_building_names, get_all_recipe_names
)

app = FastAPI(
    title="GT2See API",
    description="Galactic Tycoons 市场分析工具 API",
    version="1.0.0"
)
# ==================== 应用生命周期：启动定时备份 ====================
@app.on_event("startup")
async def _startup() -> None:
    # 启动后台备份任务（每5分钟覆写备份文件）
    backup_service.start()


@app.on_event("shutdown")
async def _shutdown() -> None:
    await backup_service.stop()


# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 健康检查 ====================

@app.get("/")
async def root():
    return {
        "message": "GT2See API Server",
        "version": "1.0.0",
        "status": "running"
    }
@app.post("/api/admin/backup/run-once")
async def run_backup_once():
    """手动触发一次官方数据备份（覆写备份文件）。"""
    result = await backup_service.run_once()
    return {"ok": True, "result": result}


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "rate_limit": {
            "current_usage": rate_limiter.get_current_usage(),
            "total_limit": rate_limiter.total_units
        },
        "cache_stats": cache_manager.get_stats()
    }

# ==================== 游戏数据API ====================

@app.get("/api/gamedata")
async def get_game_data():
    """获取完整的游戏数据"""
    try:
        data = await game_data_api.get_game_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials")
async def get_materials():
    """获取材料列表（增强版，包含类型名称）"""
    try:
        materials = await game_data_api.get_materials()
        
        # 为每个材料添加类型名称
        for material in materials:
            material_type = material.get('type')
            if material_type:
                material['typeName'] = get_material_type_name(material_type, 'zh')
                material['typeNameEn'] = get_material_type_name(material_type, 'en')
        
        return {"materials": materials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/{material_id}")
async def get_material(material_id: int):
    """获取单个材料信息"""
    try:
        material = await game_data_api.get_material_by_id(material_id)
        if material is None:
            raise HTTPException(status_code=404, detail="Material not found")
        return material
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/buildings")
async def get_buildings():
    """获取建筑列表（增强版，包含材料名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        buildings = await game_data_api.get_buildings()
        
        # 为每个建筑的 constructionMaterials 添加名称
        for building in buildings:
            construction_materials = building.get('constructionMaterials', [])
            
            # 确保 construction_materials 是列表
            if isinstance(construction_materials, list):
                for material in construction_materials:
                    mat_id = material.get('id')
                    if mat_id:
                        material['name'] = get_material_name(mat_id, 'zh')
                        material['nameEn'] = get_material_name(mat_id, 'en')
        
        return {"buildings": buildings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/buildings/{building_id}")
async def get_building(building_id: int):
    """获取单个建筑信息（增强版，包含材料名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        building = await game_data_api.get_building_by_id(building_id)
        if building is None:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # 为 constructionMaterials 添加名称
        construction_materials = building.get('constructionMaterials', [])
        
        # 确保 construction_materials 是列表
        if isinstance(construction_materials, list):
            for material in construction_materials:
                mat_id = material.get('id')
                if mat_id:
                    material['name'] = get_material_name(mat_id, 'zh')
                    material['nameEn'] = get_material_name(mat_id, 'en')
        
        return building
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/buildings")
async def debug_buildings():
    """调试端点：显示所有建筑的原始数据（包括字段信息）"""
    try:
        buildings = await game_data_api.get_buildings()
        
        # 查找所有可能的劳动力相关字段
        workforce_fields = set()
        for building in buildings:
            for key in building.keys():
                key_lower = key.lower()
                if any(keyword in key_lower for keyword in ['worker', 'workforce', 'labor', 'labour', 'employee', 'staff']):
                    workforce_fields.add(key)
        
        debug_info = {
            "total_buildings": len(buildings),
            "possible_workforce_fields": list(workforce_fields),
            "buildings_summary": [],
            "sample_building": buildings[0] if buildings else None,  # 显示第一个建筑的完整数据
            "sample_with_workforce": None
        }
        
        # 找一个有劳动力数据的建筑作为示例
        for building in buildings:
            if building.get('workersNeeded') or building.get('workforce') or building.get('workers'):
                debug_info["sample_with_workforce"] = building
                break
        
        for building in buildings:
            building_info = {
                "id": building.get('id'),
                "name": building.get('name'),
                "sName": building.get('sName'),
                "fields": list(building.keys()),
                "has_cost": 'cost' in building,
                "has_constructionMaterials": 'constructionMaterials' in building,
                "has_workersNeeded": 'workersNeeded' in building,
                "has_workforce": 'workforce' in building,
                "has_workers": 'workers' in building,
                "workersNeeded_value": building.get('workersNeeded'),
                "workforce_value": building.get('workforce'),
                "workers_value": building.get('workers'),
                "cost_type": type(building.get('cost')).__name__ if 'cost' in building else None,
                "cost_length": len(building.get('cost')) if isinstance(building.get('cost'), list) else None,
                "cm_type": type(building.get('constructionMaterials')).__name__ if 'constructionMaterials' in building else None,
                "cm_length": len(building.get('constructionMaterials')) if isinstance(building.get('constructionMaterials'), list) else None,
            }
            
            # 只显示部分建筑名称中包含特定关键词的详细信息
            name_lower = (building.get('name') or '').lower() + (building.get('sName') or '').lower()
            if any(keyword in name_lower for keyword in ['mine', 'pump', 'farm', 'rig', 'well']):
                building_info['full_data'] = building
            
            debug_info["buildings_summary"].append(building_info)
        
        return debug_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recipes")
async def get_recipes():
    """获取配方列表（增强版，包含类型和材料名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        recipes = await game_data_api.get_recipes()
        
        # 为每个配方添加类型名称和材料名称
        for recipe in recipes:
            recipe_type = recipe.get('type')
            if recipe_type:
                recipe['typeName'] = get_recipe_type_name(recipe_type, 'zh')
                recipe['typeNameEn'] = get_recipe_type_name(recipe_type, 'en')
            
            # 为 inputs 添加材料名称
            inputs = recipe.get('inputs', [])
            for input_item in inputs:
                mat_id = input_item.get('id')
                if mat_id:
                    input_item['name'] = get_material_name(mat_id, 'zh')
                    input_item['nameEn'] = get_material_name(mat_id, 'en')
            
            # 为 output 添加材料名称
            output = recipe.get('output', {})
            if output:
                mat_id = output.get('id')
                if mat_id:
                    output['name'] = get_material_name(mat_id, 'zh')
                    output['nameEn'] = get_material_name(mat_id, 'en')
        
        return {"recipes": recipes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/systems")
async def get_systems():
    """获取星系列表（增强版，包含材料名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        systems = await game_data_api.get_systems()
        
        # 为每个星系的行星资源添加材料名称
        for system in systems:
            planets = system.get('planets', []) or []
            for planet in planets:
                mats = planet.get('mats', [])
                for mat in mats:
                    mat_id = mat.get('id')
                    if mat_id:
                        mat['name'] = get_material_name(mat_id, 'zh')
                        mat['nameEn'] = get_material_name(mat_id, 'en')
        
        return {"systems": systems}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 交易所数据API ====================

@app.get("/api/exchange/prices")
async def get_material_prices(mat_id: Optional[int] = None):
    """获取材料价格（增强版，包含中英文名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        prices = await exchange_api.get_material_prices(mat_id)
        
        # 为价格数据添加中英文名称
        if isinstance(prices, dict) and 'prices' in prices:
            for price in prices['prices']:
                mat_id_val = price.get('matId')
                if mat_id_val:
                    price['matNameZh'] = get_material_name(mat_id_val, 'zh')
                    price['matNameEn'] = get_material_name(mat_id_val, 'en')
        elif isinstance(prices, list):
            for price in prices:
                mat_id_val = price.get('matId')
                if mat_id_val:
                    price['matNameZh'] = get_material_name(mat_id_val, 'zh')
                    price['matNameEn'] = get_material_name(mat_id_val, 'en')
        elif isinstance(prices, dict) and 'matId' in prices:
            # 单个材料价格
            mat_id_val = prices.get('matId')
            if mat_id_val:
                prices['matNameZh'] = get_material_name(mat_id_val, 'zh')
                prices['matNameEn'] = get_material_name(mat_id_val, 'en')
        
        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/exchange/details")
async def get_material_details(mat_id: Optional[int] = None):
    """获取材料详细信息（增强版，包含中英文名称）"""
    try:
        # 确保名称缓存已初始化
        await game_data_api.get_game_data()
        
        details = await exchange_api.get_material_details(mat_id)
        
        # 为详情数据添加中英文名称
        if isinstance(details, dict) and 'materials' in details:
            # 全材料详情
            for detail in details['materials']:
                mat_id_val = detail.get('matId')
                if mat_id_val:
                    detail['matNameZh'] = get_material_name(mat_id_val, 'zh')
                    detail['matNameEn'] = get_material_name(mat_id_val, 'en')
        elif isinstance(details, dict) and 'matId' in details:
            # 单个材料详情
            mat_id_val = details.get('matId')
            if mat_id_val:
                details['matNameZh'] = get_material_name(mat_id_val, 'zh')
                details['matNameEn'] = get_material_name(mat_id_val, 'en')
        
        return details
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 建筑成本计算API ====================

@app.get("/api/calculator/building-cost/{building_id}")
async def calculate_building_cost(building_id: int):
    """计算单个建筑的建造成本"""
    try:
        # 获取建筑数据
        building = await game_data_api.get_building_by_id(building_id)
        if building is None:
            raise HTTPException(status_code=404, detail="Building not found")
        
        # 获取价格数据
        prices_response = await exchange_api.get_material_prices()
        
        # 转换价格数据为字典格式
        material_prices = {}
        if isinstance(prices_response, list):
            for price in prices_response:
                material_prices[price.get('matId')] = price
        elif isinstance(prices_response, dict) and 'prices' in prices_response:
            for price in prices_response['prices']:
                material_prices[price.get('matId')] = price
        
        # 计算成本
        cost_data = BuildingCalculator.calculate_building_cost(building, material_prices)
        return cost_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calculator/building-costs")
async def calculate_multiple_building_costs(building_ids: Optional[str] = Query(None)):
    """计算多个建筑的建造成本"""
    try:
        # 获取建筑列表
        if building_ids:
            ids = [int(id.strip()) for id in building_ids.split(',')]
            buildings = []
            for bid in ids:
                building = await game_data_api.get_building_by_id(bid)
                if building:
                    buildings.append(building)
        else:
            buildings = await game_data_api.get_buildings()
        
        # 获取价格数据
        prices_response = await exchange_api.get_material_prices()
        
        # 转换价格数据
        material_prices = {}
        if isinstance(prices_response, list):
            for price in prices_response:
                material_prices[price.get('matId')] = price
        elif isinstance(prices_response, dict) and 'prices' in prices_response:
            for price in prices_response['prices']:
                material_prices[price.get('matId')] = price
        
        # 计算成本（包括所有建筑，即使没有建造材料）
        results = []
        for building in buildings:
            cost_data = BuildingCalculator.calculate_building_cost(building, material_prices)
            # 即使没有材料成本，也要包含该建筑
            results.append(cost_data)
        
        # 按总成本排序（价格不可用的排在最后）
        results.sort(key=lambda x: (not x['priceAvailable'], -x['totalCost']))
        
        return {"buildingCosts": results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 配方收益计算API ====================

@app.get("/api/calculator/recipe-profit/{recipe_id}")
async def calculate_recipe_profit(recipe_id: int):
    """计算单个配方的收益"""
    try:
        # 获取配方数据
        recipe = await game_data_api.get_recipe_by_id(recipe_id)
        if recipe is None:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # 获取价格数据
        prices_response = await exchange_api.get_material_prices()
        
        # 转换价格数据
        material_prices = {}
        if isinstance(prices_response, list):
            for price in prices_response:
                material_prices[price.get('matId')] = price
        elif isinstance(prices_response, dict) and 'prices' in prices_response:
            for price in prices_response['prices']:
                material_prices[price.get('matId')] = price
        
        # 计算收益
        profit_data = RecipeCalculator.calculate_recipe_profit(recipe, material_prices)
        return profit_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calculator/recipe-profits")
async def calculate_recipe_profits(
    sort_by: str = Query('profitPerHour', pattern='^(totalProfit|profitPerHour|roi)$'),
    building_id: Optional[int] = None,
    limit: Optional[int] = None,
    fertility_abundance: Optional[float] = Query(100.0, ge=0, le=1000)
):
    """
    批量计算配方收益
    
    sort_by: 排序依据 (totalProfit, profitPerHour, roi)
    building_id: 筛选特定建筑的配方
    limit: 限制返回数量
    fertility_abundance: 肥力/丰度值 (默认100，表示标准，范围0-1000)
    """
    try:
        # 获取配方数据
        recipes = await game_data_api.get_recipes()
        
        # 获取价格数据
        prices_response = await exchange_api.get_material_prices()
        
        # 转换价格数据
        material_prices = {}
        if isinstance(prices_response, list):
            for price in prices_response:
                material_prices[price.get('matId')] = price
        elif isinstance(prices_response, dict) and 'prices' in prices_response:
            for price in prices_response['prices']:
                material_prices[price.get('matId')] = price
        
        # 计算收益
        results = RecipeCalculator.calculate_multiple_recipes(
            recipes, 
            material_prices, 
            sort_by=sort_by,
            building_filter=building_id,
            fertility_abundance_multiplier=fertility_abundance
        )
        
        # 限制返回数量（仅在明确指定时）
        total_count = len(results)
        if limit and limit > 0:
            results = results[:limit]
        
        return {"recipeProfits": results, "total": total_count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 星系资源分析API ====================

@app.get("/api/analyzer/systems")
async def analyze_systems(
    exchange_x: float = Query(3334.0, description="交易所X坐标"),
    exchange_y: float = Query(1425.0, description="交易所Y坐标")
):
    """分析所有星系的资源分布"""
    try:
        systems = await game_data_api.get_systems()
        analysis = SystemAnalyzer.analyze_system_resources(systems, exchange_x, exchange_y)
        return {"systemAnalysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyzer/best-location/{material_id}")
async def find_best_location(material_id: int):
    """为特定材料找最佳生产位置"""
    try:
        systems = await game_data_api.get_systems()
        locations = SystemAnalyzer.find_best_location_for_material(systems, material_id)
        return {"materialId": material_id, "bestLocations": locations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyzer/advanced-search")
async def advanced_system_search(
    max_distance: Optional[float] = Query(None, ge=0, description="最大距离（光年）"),
    material_filters: Optional[str] = Query(None, description="材料筛选条件，JSON格式：[{\"materialId\": 1, \"minAbundance\": 100}]"),
    min_fertility: Optional[float] = Query(None, ge=0, le=1000, description="最小肥力阈值"),
    exchange_x: float = Query(0.0, description="交易所X坐标"),
    exchange_y: float = Query(0.0, description="交易所Y坐标")
):
    """
    高级星系搜索
    
    max_distance: 最大距离（光年），None表示不限制
    material_filters: 材料筛选条件，JSON字符串格式
    min_fertility: 最小肥力阈值，None表示不限制
    exchange_x, exchange_y: 交易所坐标
    """
    try:
        systems = await game_data_api.get_systems()
        
        # 解析材料筛选条件
        parsed_material_filters = None
        if material_filters:
            try:
                parsed_material_filters = json.loads(material_filters)
                if not isinstance(parsed_material_filters, list):
                    raise ValueError("material_filters must be a list")
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON format for material_filters")
        
        results = SystemAnalyzer.advanced_system_search(
            systems,
            exchange_x=exchange_x,
            exchange_y=exchange_y,
            max_distance=max_distance,
            material_filters=parsed_material_filters,
            min_fertility=min_fertility
        )
        
        return {
            "results": results,
            "total": len(results),
            "filters": {
                "maxDistance": max_distance,
                "materialFilters": parsed_material_filters,
                "minFertility": min_fertility,
                "exchangeLocation": {"x": exchange_x, "y": exchange_y}
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analyzer/system-group-search")
async def system_group_search(
    material_filters: str = Query(..., description="材料筛选条件，JSON格式：[{\"materialId\": 1, \"minAbundance\": 100}]"),
    excluded_planet_tiers: Optional[str] = Query(None, description="排除的行星等级，JSON格式：[3, 4]"),
    exchange_x: float = Query(3334.0, description="交易所X坐标"),
    exchange_y: float = Query(1425.0, description="交易所Y坐标")
):
    """
    星系群搜索（使用预计算的相邻关系表，4光年）
    
    material_filters: 材料筛选条件，JSON字符串格式（必需）
    exchange_x, exchange_y: 交易所坐标
    """
    try:
        systems = await game_data_api.get_systems()
        systems_by_id = {system.get('id'): system for system in systems}
        
        # 解析材料筛选条件
        try:
            parsed_material_filters = json.loads(material_filters)
            if not isinstance(parsed_material_filters, list) or len(parsed_material_filters) == 0:
                raise ValueError("material_filters must be a non-empty list")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for material_filters")
        
        # 解析排除的行星等级
        excluded_tiers_set = set()
        if excluded_planet_tiers:
            try:
                parsed_excluded_tiers = json.loads(excluded_planet_tiers)
                if isinstance(parsed_excluded_tiers, list):
                    excluded_tiers_set = set(parsed_excluded_tiers)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON format for excluded_planet_tiers")
        
        # 获取相邻关系表
        neighbors_map = game_data_api.get_system_neighbors()
        if not neighbors_map:
            raise HTTPException(status_code=500, detail="无法加载星系相邻关系表")
        
        # 检查单个星系是否满足材料筛选条件（基于单个星球的丰度）
        def check_system_meets_filters(system: Dict[str, Any]) -> bool:
            planets = system.get('planets', []) or []
            if not isinstance(planets, list) or len(planets) == 0:
                return False
            
            # 过滤掉被排除的行星等级
            filtered_planets = []
            for planet in planets:
                planet_tier = planet.get('tier')
                if planet_tier is None or planet_tier not in excluded_tiers_set:
                    filtered_planets.append(planet)
            
            # 如果没有符合条件的行星，返回False
            if len(filtered_planets) == 0:
                return False
            
            # 检查每个材料筛选条件
            for filter_item in parsed_material_filters:
                material_id = filter_item.get('materialId')
                min_abundance = filter_item.get('minAbundance', 0)
                
                # 检查是否有至少一个符合条件的行星满足该材料的丰度要求
                found = False
                for planet in filtered_planets:
                    resources = planet.get('mats', [])
                    if not isinstance(resources, list):
                        resources = []
                    for resource in resources:
                        if resource.get('id') == material_id:
                            abundance = resource.get('ab', 0)
                            if abundance >= min_abundance:
                                found = True
                                break
                    if found:
                        break
                
                if not found:
                    return False
            
            return True
        
        results = []
        
        # 遍历所有星系作为潜在的中心星系
        for center_system in systems:
            center_id = center_system.get('id')
            if center_id is None:
                continue
            
            # 检查中心星系是否满足材料筛选条件
            if not check_system_meets_filters(center_system):
                continue
            
            # 从相邻关系表获取相邻星系ID
            system_key = str(center_id)
            if system_key not in neighbors_map:
                continue
            
            neighbor_data = neighbors_map[system_key]
            neighbor_list = neighbor_data.get('neighbors', [])
            
            if len(neighbor_list) == 0:
                continue
            
            # 获取相邻星系的完整数据
            neighbor_systems = []
            for neighbor_info in neighbor_list:
                neighbor_id = neighbor_info.get('systemId')
                if neighbor_id and neighbor_id in systems_by_id:
                    neighbor_systems.append(systems_by_id[neighbor_id])
            
            if len(neighbor_systems) == 0:
                continue
            
            # 计算中心星系到交易所的距离
            center_x = center_system.get('x', 0.0)
            center_y = center_system.get('y', 0.0)
            distance_to_exchange = SystemAnalyzer.calculate_distance(
                exchange_x, exchange_y, center_x, center_y
            )
            
            # 聚合资源（中心星系 + 相邻星系）
            all_systems = [center_system] + neighbor_systems
            resource_summary = {}
            total_planets = 0
            max_fertility = 0
            
            for system in all_systems:
                planets = system.get('planets', []) or []
                if not isinstance(planets, list):
                    planets = []
                total_planets += len(planets)
                
                for planet in planets:
                    resources = planet.get('mats', [])
                    if not isinstance(resources, list):
                        resources = []
                    
                    fertility = planet.get('fert', 0)
                    if fertility > max_fertility:
                        max_fertility = fertility
                    
                    for resource in resources:
                        mat_id = resource.get('id')
                        abundance = resource.get('ab', 0)
                        
                        if mat_id not in resource_summary:
                            resource_summary[mat_id] = {
                                'materialId': mat_id,
                                'totalAbundance': 0,
                                'planetCount': 0,
                                'maxAbundance': 0
                            }
                        
                        resource_summary[mat_id]['totalAbundance'] += abundance
                        resource_summary[mat_id]['planetCount'] += 1
                        if abundance > resource_summary[mat_id]['maxAbundance']:
                            resource_summary[mat_id]['maxAbundance'] = abundance
            
            results.append({
                'systemId': center_id,
                'systemName': center_system.get('name', f'System {center_id}'),
                'x': center_x,
                'y': center_y,
                'distanceToExchange': distance_to_exchange,
                'planetCount': total_planets,
                'maxFertility': max_fertility,
                'resources': list(resource_summary.values()),
                'neighborSystemIds': [s.get('id') for s in neighbor_systems],
                'neighborCount': len(neighbor_systems)
            })
        
        # 按距离排序
        results.sort(key=lambda x: x['distanceToExchange'])
        
        return {
            "results": results,
            "total": len(results),
            "filters": {
                "materialFilters": parsed_material_filters,
                "exchangeLocation": {"x": exchange_x, "y": exchange_y},
                "neighborDistance": 4.0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 缓存管理API ====================

@app.post("/api/cache/clear")
async def clear_cache():
    """清空所有缓存"""
    cache_manager.clear()
    return {"message": "Cache cleared successfully"}

@app.get("/api/cache/stats")
async def get_cache_stats():
    """获取缓存统计信息"""
    return cache_manager.get_stats()

# ==================== 速率限制API ====================

@app.get("/api/rate-limit/status")
async def get_rate_limit_status():
    """获取速率限制状态"""
    return {
        "current_usage": rate_limiter.get_current_usage(),
        "total_limit": rate_limiter.total_units,
        "window_seconds": rate_limiter.window_seconds,
        "remaining": rate_limiter.total_units - rate_limiter.get_current_usage()
    }

# ==================== 常量查询API ====================

@app.get("/api/constants/material-types")
async def get_material_types():
    """获取材料类型映射表"""
    return {
        "materialTypes": MATERIAL_TYPES,
        "description": "材料类型枚举映射（中英文）"
    }

@app.get("/api/constants/recipe-types")
async def get_recipe_types():
    """获取配方类型映射表"""
    return {
        "recipeTypes": RECIPE_TYPES,
        "description": "配方类型枚举映射（中英文）"
    }

@app.get("/api/constants/material-names")
async def get_material_names():
    """获取所有材料名称映射"""
    # 确保缓存已初始化
    await game_data_api.get_game_data()
    return {
        "materialNames": get_all_material_names(),
        "description": "材料ID到名称的映射（中英文）"
    }

@app.get("/api/constants/building-names")
async def get_building_names():
    """获取所有建筑名称映射"""
    # 确保缓存已初始化
    await game_data_api.get_game_data()
    return {
        "buildingNames": get_all_building_names(),
        "description": "建筑ID到名称的映射（中英文）"
    }

@app.get("/api/constants/recipe-names")
async def get_recipe_names():
    """获取所有配方名称映射"""
    # 确保缓存已初始化
    await game_data_api.get_game_data()
    return {
        "recipeNames": get_all_recipe_names(),
        "description": "配方ID到名称的映射（中英文）"
    }

@app.get("/api/word-translation")
async def get_word_translation():
    """获取材料和建筑的中英文对照表"""
    try:
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        translation_file = os.path.join(data_dir, 'word_translation.json')
        
        if not os.path.exists(translation_file):
            raise HTTPException(status_code=404, detail="Translation file not found")
        
        with open(translation_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 综合收益分析API ====================

@app.get("/api/comprehensive/recipe-analysis")
async def analyze_comprehensive_recipe_profits(
    building_id: Optional[int] = None,
    sort_by: str = Query('comprehensiveProfitPerHour', pattern='^(comprehensiveProfitPerHour|comprehensiveTotalProfit|profitPerHour)$'),
    total_population: int = Query(0, ge=0, le=100000),
    fertility_abundance: Optional[float] = Query(100.0, ge=0, le=1000),
    debug: bool = Query(False, description="开启调试模式")
):
    """
    综合收益分析：计算考虑劳动力成本后的配方收益
    
    building_id: 筛选特定建筑的配方
    sort_by: 排序依据
    total_population: 所有基地总人口（用于计算扩张惩罚）
    fertility_abundance: 肥力/丰度值
    debug: 开启调试模式，显示详细信息
    """
    try:
        # 获取游戏数据
        recipes = await game_data_api.get_recipes()
        buildings = await game_data_api.get_buildings()
        materials = await game_data_api.get_materials()
        
        # 获取价格数据
        prices_response = await exchange_api.get_material_prices()
        
        # 转换价格数据
        material_prices = {}
        if isinstance(prices_response, list):
            for price in prices_response:
                material_prices[price.get('matId')] = price
        elif isinstance(prices_response, dict) and 'prices' in prices_response:
            for price in prices_response['prices']:
                material_prices[price.get('matId')] = price
        
        # 创建材料名称映射
        materials_by_name = {}
        for material in materials:
            name = material.get('sName') or material.get('name')
            if name:
                materials_by_name[name] = material
        
        # 创建建筑ID映射
        buildings_by_id = {b.get('id'): b for b in buildings}
        
        # 调试信息
        debug_info = {
            "zero_workforce_cost_recipes": [],
            "missing_building_recipes": [],
            "buildings_with_zero_workers": []
        } if debug else None
        
        # 计算综合收益
        results = []
        
        for recipe in recipes:
            recipe_building_id = recipe.get('producedIn')
            
            # 建筑筛选
            if building_id and recipe_building_id != building_id:
                continue
            
            # 获取对应建筑
            building = buildings_by_id.get(recipe_building_id)
            if not building:
                if debug:
                    debug_info["missing_building_recipes"].append({
                        "recipeId": recipe.get('id'),
                        "recipeName": recipe.get('sName') or recipe.get('name'),
                        "buildingId": recipe_building_id
                    })
                continue
            
            # 调试：检查建筑的劳动力需求
            if debug:
                workers_needed = building.get('workersNeeded', [0, 0, 0, 0])
                if not workers_needed or all(w == 0 for w in (workers_needed if isinstance(workers_needed, list) else [])):
                    debug_info["buildings_with_zero_workers"].append({
                        "buildingId": building.get('id'),
                        "buildingName": building.get('name'),
                        "workersNeeded": workers_needed
                    })
            
            # 计算综合收益
            comprehensive_data = ComprehensiveAnalyzer.calculate_comprehensive_profit(
                recipe,
                building,
                material_prices,
                materials_by_name,
                [],  # systems参数暂不使用
                fertility_abundance,
                total_population
            )
            
            # 调试：记录劳动力成本为0的配方
            if debug and comprehensive_data.get('workforceCost') == 0:
                debug_info["zero_workforce_cost_recipes"].append({
                    "recipeId": comprehensive_data.get('recipeId'),
                    "recipeName": comprehensive_data.get('recipeName'),
                    "buildingName": comprehensive_data.get('buildingName'),
                    "workersNeeded": building.get('workersNeeded'),
                    "workforceDetails": comprehensive_data.get('workforceDetails')
                })
            
            results.append(comprehensive_data)
        
        # 排序
        if sort_by == 'comprehensiveProfitPerHour':
            results.sort(key=lambda x: (x.get('comprehensiveProfitPerHour') is None, -(x.get('comprehensiveProfitPerHour') if x.get('comprehensiveProfitPerHour') is not None else 0)))
        elif sort_by == 'comprehensiveTotalProfit':
            results.sort(key=lambda x: (x.get('comprehensiveTotalProfit') is None, -(x.get('comprehensiveTotalProfit') if x.get('comprehensiveTotalProfit') is not None else 0)))
        elif sort_by == 'profitPerHour':
            results.sort(key=lambda x: (x.get('profitPerHour') is None, -(x.get('profitPerHour') if x.get('profitPerHour') is not None else 0)))
        
        response = {
            "comprehensiveAnalysis": results,
            "total": len(results),
            "totalPopulation": total_population,
            "expansionPenaltyApplied": total_population > 2000
        }
        
        if debug and debug_info:
            response["debug"] = debug_info
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

