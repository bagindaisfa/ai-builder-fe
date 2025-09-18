import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import inject from '@rollup/plugin-inject';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Custom plugin to handle SPA fallback in development
function spaFallback() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (
          !req.url.startsWith('/api') &&
          !req.url.includes('.') &&
          req.url !== '/' &&
          !req.url.startsWith('/@') &&
          !req.url.startsWith('/node_modules/')
        ) {
          req.url = '/';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    // Only use SPA fallback in development
    ...(process.env.NODE_ENV !== 'production' ? [spaFallback()] : []),
    // Add Node.js polyfills
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [NodeModulesPolyfillPlugin()],
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['*', 'gpu01'],
    strictPort: true,
    open: true,
    proxy: {
      // Proxy API requests to avoid CORS issues
      '/api': {
        target: 'http://localhost:5010', // Your backend server URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // This ensures the SPA handles all routes
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      plugins: [
        inject({
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
