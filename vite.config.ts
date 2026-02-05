import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'child_process'

function getBuildInfo() {
  const buildDate = new Date().toISOString().slice(0, 10)
  let gitCommit = ''
  let changelog = 'No git history available.'
  try {
    // Use execFileSync (no shell) so format placeholders (%h, %ad, %s, %x09) are not
    // expanded by cmd.exe on Windows
    gitCommit = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf-8' }).trim()
    const raw = execFileSync('git', [
      'log', '-80', '--pretty=format:%h%x09%ad%x09%s', '--date=short',
    ], { encoding: 'utf-8' }).trim()
    changelog = raw ? raw.split('\n').map((line) => line.replace(/\t/g, ' ')).join('\n') : changelog
  } catch {
    // Not in git or git unavailable
  }
  return { buildDate, gitCommit, changelog }
}

const { buildDate, gitCommit, changelog } = getBuildInfo()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __CHANGELOG__: JSON.stringify(changelog),
  },
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

