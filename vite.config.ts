/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devApiPlugin } from './vite/devApiPlugin';

export default defineConfig({
  // devApiPlugin serves functions/api/* on the dev server, so `npm run dev`
  // needs a single port and runs the same handler code Cloudflare will. Admin
  // credentials are read there, server-side, from .dev.vars — never injected
  // into the bundle.
  plugins: [react(), devApiPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
