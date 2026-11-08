import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.PORT || env.VITE_PORT || '8002', 10)

  return {
    server: {
      port: port,
      strictPort: true,
    },
    preview: {
      port: port,
    },
    plugins: [react(), tailwindcss()],
  }
})