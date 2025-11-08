import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 获取API目标地址（开发环境使用，生产环境不需要代理）
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8001'
  
  return {
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

