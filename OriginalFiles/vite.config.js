import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

const getBuildVersion = () => {
  if (process.env.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION
  }

  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }

  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return process.env.npm_package_version || 'dev'
  }
}

const buildVersion = getBuildVersion()

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
