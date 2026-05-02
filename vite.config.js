import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/fire-shield-combo/', 
  plugins: [react()],
})