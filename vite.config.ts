import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import compression from "vite-plugin-compression";
import purgecss from "vite-plugin-purgecss";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the current mode
  const env = loadEnv(mode, process.cwd(), '');

  // Check if we're in analyze mode
  const isAnalyze = mode === 'analyze';

  // Try to load critical CSS if it exists
  let criticalCss = '';
  try {
    const criticalCssPath = path.resolve(__dirname, './public/critical-home.css');
    if (fs.existsSync(criticalCssPath)) {
      criticalCss = fs.readFileSync(criticalCssPath, 'utf8');
      console.log('Loaded critical CSS');
    }
  } catch (error) {
    console.warn('Failed to load critical CSS:', error);
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react({
        jsxRuntime: 'automatic',
      }),
      // Add PurgeCSS in production mode
      mode === 'production' && purgecss({
        content: ['./src/**/*.{jsx,tsx,js,ts,html}'],
        safelist: {
          standard: [
            // Add classes that might be added dynamically
            /^bg-/, /^text-/, /^border-/, /^hover:/, /^dark:/, /^focus:/, /^active:/,
            // Shadcn classes
            /^\[cmdk/, /^data-\[/, /^aria-\[/
          ],
        },
      }),
      // Add compression in production mode
      mode === 'production' && compression({
        algorithm: 'brotli',
        ext: '.br',
      }),
      // Add gzip compression as well
      mode === 'production' && compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Add bundle analyzer in analyze mode
      isAnalyze && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Production optimizations
    build: {
      // Generate source maps for production build
      sourcemap: mode !== 'production',
      // Use esbuild for minification instead of terser to avoid circular dependency issues
      minify: 'esbuild',
      // Configure esbuild options
      esbuildOptions: {
        legalComments: 'none',
        target: ['es2020'],
        // Keep console logs during development
        drop: mode === 'production' ? ['debugger'] : ['debugger'],
      },
      // Increase the warning limit for chunk size
      chunkSizeWarningLimit: 1000, // 1000 kB
      // Basic rollup options
      rollupOptions: {
        // Configure output options
        output: {
          // Ensure assets are in separate directories
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
          // Disable manual chunks to avoid loading order issues
          manualChunks: undefined
        }
      }
    },
    // Define global constants for the app
    define: {
      // Make sure these values are available at build time
      // Supabase keys removed as we're using localStorage instead
      'import.meta.env.VITE_TWITCH_CLIENT_ID': JSON.stringify("vujwln85ho3n32bitmn68rspe75prp"),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    }
  };
});
