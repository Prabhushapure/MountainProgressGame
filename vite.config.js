import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const themeBasePaths = {
  'fire-shield-combo': '/fire-shield-combo/',
  'fire-shield-combo-5': '/fire-shield-combo-5/',
  Factory_safety_combo: '/Factory_safety_combo/',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const comboTheme = env.VITE_COMBO_THEME || 'fire-shield-combo'
  const base = themeBasePaths[comboTheme] || '/fire-shield-combo/'

  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:3001',
      },
    },
  }
})