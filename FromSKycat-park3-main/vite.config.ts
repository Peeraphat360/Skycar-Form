import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,        // listen on 0.0.0.0 so the container is reachable from the host
    watch: {
      usePolling: true, // required for HMR under Docker on Windows (no native FS events)
    },
  },
})
