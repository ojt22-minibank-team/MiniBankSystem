import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.PORT || env.VITE_PORT || '8001', 10)

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: port,
      host: true,
    },
    preview: {
      port: port,
    },
  }
})
