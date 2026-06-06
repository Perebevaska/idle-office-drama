import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // слушать 0.0.0.0 (доступ по публичному IP)
    port: 5173,
    strictPort: true,
    // dev-сервер открыт наружу — разрешаем доступ по IP/любому хосту
    allowedHosts: true,
    hmr: {
      // WebSocket HMR через публичный IP
      host: '91.197.0.63',
      port: 5173,
    },
  },
})
