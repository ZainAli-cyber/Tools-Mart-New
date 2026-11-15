import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Hostinger/CI inject VITE_* into process.env (no .env file on the server).
  const viteSupabaseUrl =
    env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const viteSupabaseAnon =
    env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    plugins: [react(), tailwindcss()],
    // db.ts reads process.env.VITE_* (no import.meta — safe for Node API bundles).
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(viteSupabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(viteSupabaseAnon),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // firebase-admin is server-only (FCM). Never bundle it into the browser build.
    optimizeDeps: {
      exclude: ['firebase-admin'],
    },
    build: {
      rollupOptions: {
        external: [
          'firebase-admin',
          'firebase-admin/app',
          'firebase-admin/messaging',
        ],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
