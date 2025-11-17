import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    minify: 'esbuild', // Fast minification
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          konva: ['konva', 'react-konva'],
          supabase: ['@supabase/supabase-js'],
        },
      },
      onwarn(warning) {
        // Ignore warnings from node_modules (third-party dependencies)
        const isFromNodeModules = 
          (warning.id && warning.id.includes('node_modules')) ||
          (warning.message && warning.message.includes('node_modules'));
        
        // Ignore circular dependency warnings from node_modules
        if (isFromNodeModules || (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('node_modules'))) {
          return;
        }
        
        // Treat all other warnings as errors
        throw new Error(`Build warning: ${warning.message}`);
      },
    },
  },
})

