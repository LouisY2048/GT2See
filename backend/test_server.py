"""测试后端服务是否能正常启动"""
import sys

try:
    print("正在检查依赖...")
    
    # 检查必要的包
    packages = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('httpx', 'HTTPX'),
        ('pydantic', 'Pydantic'),
    ]
    
    missing = []
    for package, name in packages:
        try:
            __import__(package)
            print(f"✓ {name} 已安装")
        except ImportError:
            print(f"✗ {name} 未安装")
            missing.append(package)
    
    if missing:
        print(f"\n缺少的包: {', '.join(missing)}")
        print("请运行: pip install -r requirements.txt")
        sys.exit(1)
    
    print("\n正在导入配置...")
    from config import settings
    print(f"✓ 配置加载成功")
    print(f"  CORS Origins: {settings.CORS_ORIGINS}")
    
    print("\n正在导入主应用...")
    from main import app
    print(f"✓ 应用创建成功")
    print(f"  Title: {app.title}")
    print(f"  Version: {app.version}")
    
    print("\n正在检查路由...")
    routes = [route.path for route in app.routes]
    print(f"✓ 找到 {len(routes)} 个路由")
    
    # 显示主要的API路由
    api_routes = [r for r in routes if r.startswith('/api/')]
    print(f"\nAPI路由预览 (前10个):")
    for route in api_routes[:10]:
        print(f"  - {route}")
    
    print("\n" + "="*50)
    print("✓ 所有检查通过！")
    print("="*50)
    print("\n可以运行以下命令启动服务:")
    print("  python main.py")
    print("\n服务将在以下地址启动:")
    print("  - API: http://localhost:8000")
    print("  - 文档: http://localhost:8000/docs")
    print("  - ReDoc: http://localhost:8000/redoc")
    
except Exception as e:
    print(f"\n✗ 错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

