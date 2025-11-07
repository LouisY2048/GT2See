from typing import Dict, List, Any, Optional
from constants import get_material_type_name, get_material_name, get_building_name

class BuildingCalculator:
    """建筑成本计算器"""
    
    @staticmethod
    def calculate_building_cost(
        building: Dict[str, Any], 
        material_prices: Dict[int, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        计算建筑建造成本
        
        Args:
            building: 建筑数据
            material_prices: 材料价格字典 {material_id: price_data}
        
        Returns:
            成本详情
        """
        # 获取建造材料列表
        # 注意：'cost' 字段是整数（金钱成本），'constructionMaterials' 才是材料列表
        construction_materials = building.get('constructionMaterials', [])
        
        # 确保 construction_materials 是列表
        if not isinstance(construction_materials, list):
            construction_materials = []
        
        total_cost = 0
        material_costs = []
        unavailable_materials = []
        price_available = True
        
        for material in construction_materials:
            mat_id = material.get('id')
            # 字段可能是 'am' 或 'amount'（优先使用 'am'，这是官方API的标准字段）
            amount = material.get('am', material.get('amount', 0))
            
            # 获取材料当前价格
            price_data = material_prices.get(mat_id, {})
            current_price = price_data.get('currentPrice', 0)
            
            # 检查价格是否可用（-1表示无订单，0可能表示无数据，None也表示无数据）
            price_is_valid = current_price is not None and current_price > 0 and current_price != -1
            
            if not price_is_valid:
                price_available = False
                unavailable_materials.append({
                    'materialId': mat_id,
                    'materialName': get_material_name(mat_id, 'en'),
                    'materialNameZh': get_material_name(mat_id, 'zh'),
                })
                # 对于无效价格，使用0作为占位符
                current_price = 0
            
            material_cost = amount * current_price
            total_cost += material_cost
            
            material_costs.append({
                'materialId': mat_id,
                'materialName': get_material_name(mat_id, 'en'),
                'materialNameZh': get_material_name(mat_id, 'zh'),
                'amount': amount,
                'unitPrice': current_price,
                'priceAvailable': price_is_valid,
                'totalCost': material_cost,
                'costPercentage': 0  # 稍后计算
            })
        
        # 计算每种材料的成本占比（仅当价格可用时）
        if total_cost > 0 and price_available:
            for cost in material_costs:
                cost['costPercentage'] = (cost['totalCost'] / total_cost) * 100
        
        building_id = building.get('id')
        building_name_en = building.get('sName') or building.get('name') or get_building_name(building_id, 'en')
        building_name_zh = building.get('name') or get_building_name(building_id, 'zh')
        
        return {
            'buildingId': building_id,
            'buildingName': building_name_en,
            'buildingNameZh': building_name_zh,
            'totalCost': total_cost,
            'priceAvailable': price_available,
            'unavailableMaterials': unavailable_materials,
            'materialCosts': material_costs
        }


class RecipeCalculator:
    """配方收益计算器"""
    
    @staticmethod
    def calculate_recipe_profit(
        recipe: Dict[str, Any],
        material_prices: Dict[int, Dict[str, Any]],
        fertility_abundance_multiplier: float = 100.0
    ) -> Dict[str, Any]:
        """
        计算配方收益
        
        Args:
            recipe: 配方数据
            material_prices: 材料价格字典 {material_id: price_data}
            fertility_abundance_multiplier: 肥力/丰度值 (默认100，标准效率)
                影响生产时间：实际时间 = 原时间 / (multiplier / 100)
                例如：150表示1.5倍效率，生产时间为原来的67%
        
        Returns:
            收益详情
        """
        # 计算输入成本
        inputs = recipe.get('inputs', [])
        
        # 确保 inputs 是列表
        if not isinstance(inputs, list):
            inputs = []
        
        input_cost = 0
        input_details = []
        price_available = True
        unavailable_materials = []
        
        for input_item in inputs:
            mat_id = input_item.get('id')
            amount = input_item.get('am', 0)
            
            price_data = material_prices.get(mat_id, {})
            current_price = price_data.get('currentPrice', 0)
            
            # 检查价格是否可用
            price_is_valid = current_price is not None and current_price > 0 and current_price != -1
            
            if not price_is_valid:
                price_available = False
                unavailable_materials.append({
                    'materialId': mat_id,
                    'materialName': get_material_name(mat_id, 'en'),
                    'materialNameZh': get_material_name(mat_id, 'zh'),
                })
                current_price = 0
            
            cost = amount * current_price
            input_cost += cost
            
            input_details.append({
                'materialId': mat_id,
                'materialName': get_material_name(mat_id, 'en'),
                'materialNameZh': get_material_name(mat_id, 'zh'),
                'amount': amount,
                'unitPrice': current_price,
                'priceAvailable': price_is_valid,
                'totalCost': cost
            })
        
        # 计算输出价值
        output = recipe.get('output', {})
        
        # 确保 output 是字典
        if not isinstance(output, dict):
            output = {}
        
        output_mat_id = output.get('id')
        output_amount = output.get('am', 0)
        
        output_price_data = material_prices.get(output_mat_id, {})
        output_unit_price = output_price_data.get('currentPrice', 0)
        
        # 检查输出材料价格是否可用
        output_price_is_valid = output_unit_price is not None and output_unit_price > 0 and output_unit_price != -1
        
        if not output_price_is_valid:
            price_available = False
            unavailable_materials.append({
                'materialId': output_mat_id,
                'materialName': get_material_name(output_mat_id, 'en'),
                'materialNameZh': get_material_name(output_mat_id, 'zh'),
            })
            output_unit_price = 0
        
        output_value = output_amount * output_unit_price
        
        # 计算收益
        time_minutes = recipe.get('timeMinutes', 1)
        
        # 应用肥力/丰度乘数到生产时间（影响生产效率）
        # 乘数是百分比值，需要除以100（例如：150 表示 1.5倍效率，时间变为原来的 1/1.5）
        if fertility_abundance_multiplier > 0:
            adjusted_time_minutes = time_minutes / (fertility_abundance_multiplier / 100.0)
        else:
            adjusted_time_minutes = time_minutes
        
        adjusted_time_hours = adjusted_time_minutes / 60  # 转换为小时
        
        # 如果价格不可用，收益相关数据都设为None
        if not price_available:
            total_profit = None
            profit_per_hour = None
            roi = None
        else:
            total_profit = output_value - input_cost
            profit_per_hour = (total_profit / adjusted_time_hours) if adjusted_time_hours > 0 else 0
            
            # ROI计算：如果输入成本为0或负数，设为None（表示无法计算）
            if input_cost > 0:
                roi = (total_profit / input_cost * 100)
            else:
                roi = None
        
        recipe_id = recipe.get('id')
        building_id = recipe.get('producedIn')  # API文档中是producedIn
        
        return {
            'recipeId': recipe_id,
            'recipeName': recipe.get('name', f"Recipe {recipe_id}"),
            'buildingId': building_id,
            'buildingName': get_building_name(building_id, 'en'),
            'buildingNameZh': get_building_name(building_id, 'zh'),
            'inputCost': input_cost if price_available else None,
            'outputValue': output_value if price_available else None,
            'totalProfit': total_profit,
            'profitPerHour': profit_per_hour,
            'roi': roi,
            'timeMinutes': adjusted_time_minutes,
            'timeHours': adjusted_time_hours,
            'priceAvailable': price_available,
            'unavailableMaterials': unavailable_materials,
            'inputDetails': input_details,
            'outputDetails': {
                'materialId': output_mat_id,
                'materialName': get_material_name(output_mat_id, 'en'),
                'materialNameZh': get_material_name(output_mat_id, 'zh'),
                'amount': output_amount,
                'unitPrice': output_unit_price,
                'priceAvailable': output_price_is_valid,
                'totalValue': output_value if price_available else None
            }
        }
    
    @staticmethod
    def calculate_multiple_recipes(
        recipes: List[Dict[str, Any]],
        material_prices: Dict[int, Dict[str, Any]],
        sort_by: str = 'profitPerMinute',
        building_filter: Optional[int] = None,
        fertility_abundance_multiplier: float = 100.0
    ) -> List[Dict[str, Any]]:
        """
        批量计算配方收益并排序
        
        Args:
            recipes: 配方列表
            material_prices: 材料价格字典
            sort_by: 排序依据 ('totalProfit', 'profitPerMinute', 'roi')
            building_filter: 建筑ID筛选
            fertility_abundance_multiplier: 肥力/丰度乘数 (默认100)
        
        Returns:
            排序后的收益列表
        """
        results = []
        
        for recipe in recipes:
            # 建筑筛选
            if building_filter and recipe.get('producedIn') != building_filter:
                continue
            
            profit_data = RecipeCalculator.calculate_recipe_profit(
                recipe, 
                material_prices,
                fertility_abundance_multiplier
            )
            results.append(profit_data)
        
        # 排序（None值排在最后，有效值按降序排列）
        if sort_by == 'roi':
            # ROI排序：None值排最后，有效值降序
            results.sort(key=lambda x: (x['roi'] is None, -(x['roi'] if x['roi'] is not None else 0)))
        elif sort_by == 'profitPerHour':
            # 每小时收益排序：None值排最后，有效值降序
            results.sort(key=lambda x: (x['profitPerHour'] is None, -(x['profitPerHour'] if x['profitPerHour'] is not None else 0)))
        elif sort_by == 'totalProfit':
            # 总收益排序：None值排最后，有效值降序
            results.sort(key=lambda x: (x['totalProfit'] is None, -(x['totalProfit'] if x['totalProfit'] is not None else 0)))
        else:
            # 其他字段排序：None值排最后，有效值降序
            results.sort(key=lambda x: (x.get(sort_by) is None, -(x.get(sort_by) if x.get(sort_by) is not None else 0)))
        
        return results


class SystemAnalyzer:
    """星系资源分析器"""
    
    @staticmethod
    def analyze_system_resources(
        systems: List[Dict[str, Any]], 
        exchange_x: float = 3334.0, 
        exchange_y: float = 1425.0
    ) -> List[Dict[str, Any]]:
        """
        分析星系资源分布
        
        Args:
            systems: 星系数据列表
            exchange_x, exchange_y: 交易所坐标（默认3334.0, 1425.0）
        
        Returns:
            星系资源分析结果，包含到交易所的距离
        """
        results = []
        
        for system in systems:
            planets = system.get('planets', []) or []
            
            # 确保 planets 是列表
            if not isinstance(planets, list):
                planets = []
            
            # 计算到交易所的距离
            system_x = system.get('x', 0.0)
            system_y = system.get('y', 0.0)
            distance = SystemAnalyzer.calculate_distance(
                exchange_x, exchange_y, system_x, system_y
            )
            
            # 统计该星系的所有资源
            resource_summary = {}
            
            for planet in planets:
                # API文档中字段是mats而不是resources
                resources = planet.get('mats', [])
                
                # 确保 resources 是列表
                if not isinstance(resources, list):
                    resources = []
                for resource in resources:
                    mat_id = resource.get('id')
                    # API文档中字段是ab而不是abundance
                    abundance = resource.get('ab', 0)
                    
                    if mat_id not in resource_summary:
                        resource_summary[mat_id] = {
                            'materialId': mat_id,
                            'materialName': get_material_name(mat_id, 'en'),
                            'materialNameZh': get_material_name(mat_id, 'zh'),
                            'totalAbundance': 0,
                            'planetCount': 0
                        }
                    
                    resource_summary[mat_id]['totalAbundance'] += abundance
                    resource_summary[mat_id]['planetCount'] += 1
            
            results.append({
                'systemId': system.get('id'),
                'systemName': system.get('name'),
                'x': system_x,
                'y': system_y,
                'distanceToExchange': distance,
                'planetCount': len(planets),
                'resources': list(resource_summary.values())
            })
        
        return results
    
    @staticmethod
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
    
    @staticmethod
    def advanced_system_search(
        systems: List[Dict[str, Any]],
        exchange_x: float = 0.0,
        exchange_y: float = 0.0,
        max_distance: Optional[float] = None,
        material_filters: Optional[List[Dict[str, Any]]] = None,
        min_fertility: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        高级星系搜索
        
        Args:
            systems: 星系数据列表
            exchange_x, exchange_y: 交易所坐标（默认0,0）
            max_distance: 最大距离（光年），None表示不限制
            material_filters: 材料筛选条件列表，每个包含 materialId 和 minAbundance
            min_fertility: 最小肥力阈值，None表示不限制
        
        Returns:
            符合条件的星系列表，包含距离信息
        """
        results = []
        
        for system in systems:
            system_x = system.get('x', 0.0)
            system_y = system.get('y', 0.0)
            
            # 计算到交易所的距离
            distance = SystemAnalyzer.calculate_distance(
                exchange_x, exchange_y, system_x, system_y
            )
            
            # 距离筛选
            if max_distance is not None and distance > max_distance:
                continue
            
            planets = system.get('planets', []) or []
            if not isinstance(planets, list):
                planets = []
            
            # 如果没有行星，跳过
            if len(planets) == 0:
                continue
            
            # 材料筛选
            if material_filters:
                material_match = True
                for filter_item in material_filters:
                    material_id = filter_item.get('materialId')
                    min_abundance = filter_item.get('minAbundance', 0)
                    
                    # 检查该星系是否有该材料且丰度满足要求
                    found = False
                    for planet in planets:
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
                        material_match = False
                        break
                
                if not material_match:
                    continue
            
            # 肥力筛选
            if min_fertility is not None:
                has_fertile_planet = False
                for planet in planets:
                    fertility = planet.get('fert', 0)
                    if fertility >= min_fertility:
                        has_fertile_planet = True
                        break
                
                if not has_fertile_planet:
                    continue
            
            # 统计资源
            resource_summary = {}
            max_fertility = 0
            
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
                'systemId': system.get('id'),
                'systemName': system.get('name'),
                'x': system_x,
                'y': system_y,
                'distanceToExchange': distance,
                'planetCount': len(planets),
                'maxFertility': max_fertility,
                'resources': list(resource_summary.values())
            })
        
        # 按距离排序
        results.sort(key=lambda x: x['distanceToExchange'])
        
        return results
    
    @staticmethod
    def find_best_location_for_material(
        systems: List[Dict[str, Any]],
        material_id: int
    ) -> List[Dict[str, Any]]:
        """
        为特定材料找最佳生产位置
        
        Args:
            systems: 星系数据列表
            material_id: 材料ID
        
        Returns:
            按资源丰富度排序的星系列表
        """
        results = []
        
        for system in systems:
            planets = system.get('planets', []) or []
            
            # 确保 planets 是列表
            if not isinstance(planets, list):
                planets = []
            
            total_abundance = 0
            planet_count = 0
            
            for planet in planets:
                # API文档中字段是mats而不是resources
                resources = planet.get('mats', [])
                
                # 确保 resources 是列表
                if not isinstance(resources, list):
                    resources = []
                for resource in resources:
                    if resource.get('id') == material_id:
                        # API文档中字段是ab而不是abundance
                        total_abundance += resource.get('ab', 0)
                        planet_count += 1
            
            if total_abundance > 0:
                results.append({
                    'systemId': system.get('id'),
                    'systemName': system.get('name'),
                    'materialId': material_id,
                    'materialName': get_material_name(material_id, 'en'),
                    'materialNameZh': get_material_name(material_id, 'zh'),
                    'totalAbundance': total_abundance,
                    'planetCount': planet_count,
                    'avgAbundance': total_abundance / planet_count if planet_count > 0 else 0
                })
        
        # 按总丰富度排序
        results.sort(key=lambda x: x['totalAbundance'], reverse=True)
        
        return results


class ComprehensiveAnalyzer:
    """综合收益分析器（考虑劳动力成本）"""
    
    # 劳动力消耗品数据（根据API文档，按100人为单位）
    WORKFORCE_CONSUMABLES = {
        'Worker': {
            'unit': 100,
            'consumables': [
                {'name': 'Rations', 'amount': 24.0, 'essential': True},
                {'name': 'Drinking Water', 'amount': 32.0, 'essential': True},
                {'name': 'Tools', 'amount': 12.0, 'essential': True},
                {'name': 'Workwear', 'amount': 8.0, 'essential': False},
                {'name': 'Ale', 'amount': 7.2, 'essential': False},
                {'name': 'Pie', 'amount': 1.6, 'essential': False}
            ]
        },
        'Technician': {
            'unit': 100,
            'consumables': [
                {'name': 'Fine Rations', 'amount': 24.0, 'essential': True},
                {'name': 'Drinking Water', 'amount': 48.0, 'essential': True},
                {'name': 'Workwear', 'amount': 16.0, 'essential': True},
                {'name': 'Coffee', 'amount': 8.0, 'essential': False},
                {'name': 'Exosuit', 'amount': 2.4, 'essential': False},
                {'name': 'Pie', 'amount': 2.4, 'essential': False}
            ]
        },
        'Engineer': {
            'unit': 100,
            'consumables': [
                {'name': 'Fine Rations', 'amount': 28.0, 'essential': True},
                {'name': 'Vitaqua', 'amount': 44.0, 'essential': True},
                {'name': 'Advanced Tools', 'amount': 12.0, 'essential': True},
                {'name': 'Coffee', 'amount': 8.0, 'essential': False},
                {'name': 'Robot', 'amount': 0.8, 'essential': False},
                {'name': 'Rejuvaline', 'amount': 4.0, 'essential': False}
            ]
        },
        'Scientist': {
            'unit': 100,
            'consumables': [
                {'name': 'Gourmet Rations', 'amount': 28.0, 'essential': True},
                {'name': 'Vitaqua', 'amount': 44.0, 'essential': True},
                {'name': 'Spectra Modulator', 'amount': 6.0, 'essential': True},
                {'name': 'Laboratory Suit', 'amount': 4.0, 'essential': False},
                {'name': 'Nanites', 'amount': 4.0, 'essential': False},
                {'name': 'Rejuvaline', 'amount': 4.8, 'essential': False}
            ]
        }
    }
    
    @staticmethod
    def calculate_workforce_cost_per_cycle(
        building: Dict[str, Any],
        recipe: Dict[str, Any],
        material_prices: Dict[int, Dict[str, Any]],
        materials_by_name: Dict[str, Dict[str, Any]],
        total_population: int = 0
    ) -> Dict[str, Any]:
        """
        计算每轮生产的劳动力成本
        
        Args:
            building: 建筑数据
            recipe: 配方数据
            material_prices: 材料价格字典 {material_id: price_data}
            materials_by_name: 材料名称到数据的映射
            total_population: 所有基地的总人口（用于计算扩张惩罚）
        
        Returns:
            劳动力成本详情
        """
        # 获取建筑所需劳动力 [Worker, Technician, Engineer, Scientist]
        workers_needed = building.get('workersNeeded', [0, 0, 0, 0])
        if not isinstance(workers_needed, list) or len(workers_needed) < 4:
            workers_needed = [0, 0, 0, 0]
        
        # 根据API文档：workersNeeded数组顺序是 [Worker, Technician, Engineer, Scientist]
        workforce_types = {
            'Worker': workers_needed[0] if len(workers_needed) > 0 else 0,
            'Technician': workers_needed[1] if len(workers_needed) > 1 else 0,
            'Engineer': workers_needed[2] if len(workers_needed) > 2 else 0,
            'Scientist': workers_needed[3] if len(workers_needed) > 3 else 0
        }
        
        # 计算扩张惩罚系数
        expansion_penalty = 1.0
        if total_population > 2000:
            # 每超过2000人，每增加1000人增加0.1%
            extra_population = total_population - 2000
            penalty_factor = (extra_population // 1000) * 0.001  # 0.1% = 0.001
            expansion_penalty = 1.0 + penalty_factor
        
        # 计算生产时间（天）
        time_minutes = recipe.get('timeMinutes', 1)
        time_days = time_minutes / (60 * 24)  # 转换为天
        
        total_workforce_cost = 0
        workforce_details = []
        unavailable_materials = []
        workforce_cost_available = True
        
        for workforce_type, worker_count in workforce_types.items():
            if worker_count == 0:
                continue
            
            workforce_data = ComprehensiveAnalyzer.WORKFORCE_CONSUMABLES.get(workforce_type, {})
            consumables = workforce_data.get('consumables', [])
            
            workforce_type_cost = 0
            consumable_details = []
            type_cost_available = True
            
            for consumable in consumables:
                mat_name = consumable['name']
                daily_amount_per_100 = consumable['amount']
                is_essential = consumable['essential']
                
                # 查找材料ID
                material = materials_by_name.get(mat_name)
                if not material:
                    if is_essential:
                        type_cost_available = False
                        unavailable_materials.append({
                            'materialName': mat_name,
                            'workforceType': workforce_type
                        })
                    continue
                
                mat_id = material.get('id')
                
                # 获取价格
                price_data = material_prices.get(mat_id, {})
                current_price = price_data.get('currentPrice', 0)
                price_is_valid = current_price is not None and current_price > 0 and current_price != -1
                
                if not price_is_valid:
                    if is_essential:
                        type_cost_available = False
                        unavailable_materials.append({
                            'materialId': mat_id,
                            'materialName': mat_name,
                            'workforceType': workforce_type
                        })
                    continue
                
                # 计算该消耗品的每轮成本
                # daily_amount_per_100是每天每100人的消耗
                # 转换为每天每人的消耗
                daily_amount_per_worker = daily_amount_per_100 / 100.0
                # 计算这个生产周期内的消耗
                cycle_amount = daily_amount_per_worker * worker_count * time_days
                # 应用扩张惩罚
                adjusted_amount = cycle_amount * expansion_penalty
                # 计算成本
                consumable_cost = adjusted_amount * current_price
                
                workforce_type_cost += consumable_cost
                
                consumable_details.append({
                    'materialId': mat_id,
                    'materialName': mat_name,
                    'essential': is_essential,
                    'dailyAmountPer100': daily_amount_per_100,
                    'cycleAmount': adjusted_amount,
                    'unitPrice': current_price,
                    'totalCost': consumable_cost
                })
            
            if not type_cost_available:
                workforce_cost_available = False
            
            total_workforce_cost += workforce_type_cost
            
            workforce_details.append({
                'workforceType': workforce_type,
                'workerCount': worker_count,
                'costAvailable': type_cost_available,
                'totalCost': workforce_type_cost if type_cost_available else None,
                'consumables': consumable_details
            })
        
        return {
            'totalWorkforceCost': total_workforce_cost if workforce_cost_available else None,
            'costAvailable': workforce_cost_available,
            'expansionPenalty': expansion_penalty,
            'totalPopulation': total_population,
            'unavailableMaterials': unavailable_materials,
            'workforceDetails': workforce_details
        }
    
    @staticmethod
    def calculate_comprehensive_profit(
        recipe: Dict[str, Any],
        building: Dict[str, Any],
        material_prices: Dict[int, Dict[str, Any]],
        materials_by_name: Dict[str, Any],
        systems: List[Dict[str, Any]],
        fertility_abundance_multiplier: float = 100.0,
        total_population: int = 0
    ) -> List[Dict[str, Any]]:
        """
        计算每个配方在每个星系的综合收益
        
        Args:
            recipe: 配方数据
            building: 建筑数据
            material_prices: 材料价格字典
            materials_by_name: 材料名称映射
            systems: 星系列表
            fertility_abundance_multiplier: 肥力/丰度值
            total_population: 总人口
        
        Returns:
            每个星系的综合收益列表
        """
        # 首先计算基础配方收益
        base_profit = RecipeCalculator.calculate_recipe_profit(
            recipe, 
            material_prices, 
            fertility_abundance_multiplier
        )
        
        # 计算劳动力成本
        workforce_cost_data = ComprehensiveAnalyzer.calculate_workforce_cost_per_cycle(
            building,
            recipe,
            material_prices,
            materials_by_name,
            total_population
        )
        
        # 计算综合收益（每小时）
        if base_profit['priceAvailable'] and workforce_cost_data['costAvailable']:
            workforce_cost = workforce_cost_data['totalWorkforceCost']
            time_hours = base_profit['timeHours']
            
            # 劳动力成本是每个生产周期的，需要转换为每小时
            workforce_cost_per_hour = workforce_cost / time_hours if time_hours > 0 else 0
            
            # 综合收益 = 配方每小时收益 - 劳动力每小时成本
            comprehensive_profit_per_hour = (base_profit['profitPerHour'] or 0) - workforce_cost_per_hour
            
            # 综合总收益 = 配方总收益 - 劳动力成本
            comprehensive_total_profit = (base_profit['totalProfit'] or 0) - workforce_cost
        else:
            comprehensive_profit_per_hour = None
            comprehensive_total_profit = None
            workforce_cost_per_hour = None
        
        return {
            **base_profit,
            'workforceCost': workforce_cost_data['totalWorkforceCost'],
            'workforceCostPerHour': workforce_cost_per_hour,
            'workforceCostAvailable': workforce_cost_data['costAvailable'],
            'expansionPenalty': workforce_cost_data['expansionPenalty'],
            'comprehensiveProfitPerHour': comprehensive_profit_per_hour,
            'comprehensiveTotalProfit': comprehensive_total_profit,
            'workforceDetails': workforce_cost_data['workforceDetails'],
            'unavailableWorkforceMaterials': workforce_cost_data['unavailableMaterials']
        }

