import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Use /zenspace base path for deployment under dustyork.com/zenspace
      // Assets will be loaded from /zenspace/assets/... when proxied
      base: process.env.VERCEL ? '/zenspace/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase chunk warning limit since Gemini SDK is large
        chunkSizeWarningLimit: 650,
        rollupOptions: {
          output: {
            // Manual chunking for better caching
            manualChunks: {
              // Separate vendor chunks
              'vendor-react': ['react', 'react-dom'],
              'vendor-gemini': ['@google/genai'],
              'vendor-icons': ['lucide-react'],
            }
          }
        }
      }
    };
});
