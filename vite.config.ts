import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      deny: [
        '.env',
        '.env.*',
        '**/.git/**',
        '**/data/**',
        '**/private/**',
        '**/backups/**',
        '**/uploads/**',
        '**/*.env',
        '**/.idea/**',
        '**/.venv/**',
        '**/*.sqlite*',
        '**/*.pem',
      ],
    },
  },
})
