import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Reads the "paths" alias from tsconfig, so it is defined in one place only.
    tsconfigPaths: true,
  },
})
