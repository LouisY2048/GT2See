/// <reference types="vite/client" />

declare module '*.json' {
  const value: Record<string, any>
  export default value
}

declare module './locales/zh-CN.json' {
  const value: Record<string, any>
  export default value
}

declare module './locales/en-US.json' {
  const value: Record<string, any>
  export default value
}
