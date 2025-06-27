import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

// vite.config.js

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true, // <-- Important to bind to 0.0.0.0 in containers
//     port: 5173, // explicitly set port
//     strictPort: true // if 5173 is not available, fail instead of auto-pick
//   }
// });