"""
GT2See 诊断工具
检查环境配置和常见问题
"""
import sys
import subprocess
import socket

def check_python_version():
    """检查Python版本"""
    print("检查Python版本...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"  ✓ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"  ✗ Python版本过低: {version.major}.{version.minor}.{version.micro}")
        print(f"    需要 Python 3.8+")
        return False

def check_port(port, name):
    """检查端口是否被占用"""
    print(f"检查端口 {port} ({name})...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    
    if result == 0:
        print(f"  ⚠ 端口 {port} 已被占用")
        return False
    else:
        print(f"  ✓ 端口 {port} 可用")
        return True

def check_package(package_name):
    """检查Python包是否安装"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False

def check_backend_dependencies():
    """检查后端依赖"""
    print("\n检查后端Python包...")
    packages = {
        'fastapi': 'FastAPI',
        'uvicorn': 'Uvicorn',
        'httpx': 'HTTPX',
        'pydantic': 'Pydantic',
    }
    
    all_installed = True
    for package, name in packages.items():
        if check_package(package):
            print(f"  ✓ {name}")
        else:
            print(f"  ✗ {name} 未安装")
            all_installed = False
    
    return all_installed

def check_node():
    """检查Node.js"""
    print("\n检查Node.js...")
    try:
        result = subprocess.run(['node', '--version'], 
                              capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"  ✓ Node.js {version}")
        return True
    except FileNotFoundError:
        print(f"  ✗ Node.js 未安装")
        return False

def check_npm():
    """检查npm"""
    print("\n检查npm...")
    try:
        result = subprocess.run(['npm', '--version'], 
                              capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"  ✓ npm {version}")
        return True
    except FileNotFoundError:
        print(f"  ✗ npm 未安装")
        return False

def check_backend_files():
    """检查后端文件"""
    print("\n检查后端文件...")
    import os
    
    files = [
        'backend/main.py',
        'backend/config.py',
        'backend/requirements.txt',
        'backend/exchange_api.py',
        'backend/game_data_api.py',
    ]
    
    all_exist = True
    for file in files:
        if os.path.exists(file):
            print(f"  ✓ {file}")
        else:
            print(f"  ✗ {file} 缺失")
            all_exist = False
    
    return all_exist

def check_frontend_files():
    """检查前端文件"""
    print("\n检查前端文件...")
    import os
    
    files = [
        'frontend/package.json',
        'frontend/vite.config.ts',
        'frontend/src/App.tsx',
        'frontend/src/main.tsx',
    ]
    
    all_exist = True
    for file in files:
        if os.path.exists(file):
            print(f"  ✓ {file}")
        else:
            print(f"  ✗ {file} 缺失")
            all_exist = False
    
    return all_exist

def main():
    print("=" * 60)
    print("GT2See 环境诊断工具")
    print("=" * 60)
    
    results = []
    
    # 检查Python
    results.append(("Python版本", check_python_version()))
    
    # 检查端口
    results.append(("后端端口(8001)", check_port(8001, "后端")))
    results.append(("前端端口(5173)", check_port(5173, "前端")))
    
    # 检查后端
    results.append(("后端文件", check_backend_files()))
    results.append(("后端依赖", check_backend_dependencies()))
    
    # 检查前端
    results.append(("Node.js", check_node()))
    results.append(("npm", check_npm()))
    results.append(("前端文件", check_frontend_files()))
    
    # 总结
    print("\n" + "=" * 60)
    print("诊断结果总结")
    print("=" * 60)
    
    all_passed = all(result for _, result in results)
    
    for name, result in results:
        status = "✓" if result else "✗"
        print(f"{status} {name}")
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✓ 所有检查通过！可以启动应用。")
        print("\n下一步:")
        print("  1. 启动后端: cd backend && python main.py")
        print("  2. 启动前端: cd frontend && npm run dev")
    else:
        print("✗ 发现问题，请根据上述提示修复。")
        print("\n建议:")
        print("  1. 如果缺少Python包，运行: cd backend && pip install -r requirements.txt")
        print("  2. 如果缺少Node.js，访问: https://nodejs.org/")
        print("  3. 如果端口被占用，关闭占用端口的程序")
        print("  4. 查看 QUICKSTART.md 获取详细帮助")
    
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n诊断已取消")
    except Exception as e:
        print(f"\n诊断过程中出错: {e}")
        import traceback
        traceback.print_exc()

