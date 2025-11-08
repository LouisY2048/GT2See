import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 获取API目标地址（开发环境使用，生产环境不需要代理）
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8001'
  
  // 检查是否是 GitHub Pages 或 GitCode Pages 部署（通过环境变量判断）
  const isGitHubPages = env.GITHUB_PAGES === 'true' || process.env.GITHUB_PAGES === 'true'
  const isGitCodePages = env.GITCODE_PAGES === 'true' || process.env.GITCODE_PAGES === 'true'
  
  // 确定 base 路径
  // GitHub Pages: /GT2See/
  // GitCode Pages: 通常也需要设置 base 路径，格式为 /仓库名/
  // 如果仓库名是 GT2See，则使用 /GT2See/，否则使用根路径
  let basePath = '/'
  if (isGitHubPages) {
    basePath = '/GT2See/'
  } else if (isGitCodePages) {
    // GitCode Pages 路径格式：https://用户名.gitcode.net/仓库名/
    // 这里假设仓库名是 GT2See，如果不同需要修改
    basePath = '/GT2See/'
  }
  
  return {
    // Pages 部署需要设置 base 路径
    base: basePath,
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0', // 允许外部访问
      // 允许的域名（通过 Nginx 反向代理访问时使用）
      allowedHosts: [
        'louisy.top',
        'www.louisy.top',
        'localhost',
        '127.0.0.1'
      ],
      // 仅在开发环境配置代理
      proxy: mode === 'development' ? {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // 可选：如果需要重写路径
          // rewrite: (path) => path.replace(/^\/api/, ''),
        }
      } : undefined
    },
    // 生产环境构建配置
    build: {
      outDir: 'dist',
      sourcemap: false,
      // 可以在这里配置生产环境的其他选项
    }
  }
})

