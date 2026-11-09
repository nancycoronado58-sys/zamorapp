import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function createSpaRouteEntries(routes: string[]): Plugin {
  return {
    name: 'create-spa-route-entries',
    closeBundle() {
      const distIndex = fileURLToPath(new URL('./dist/index.html', import.meta.url));
      for (const route of routes) {
        const routeDirectory = fileURLToPath(new URL(`./dist/${route}`, import.meta.url));
        mkdirSync(routeDirectory, { recursive: true });
        copyFileSync(distIndex, `${routeDirectory}/index.html`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), createSpaRouteEntries(['admin', 'superadmin', 'signin', 'signup', 'reset-password'])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
