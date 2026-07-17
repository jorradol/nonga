import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'path';
import {defineConfig} from 'vite';
import { hostingOnlyFixtureIsolationPlugin } from './scripts/vite-hosting-only-fixture-plugin.mts';

function firebaseProductionConfigGuard() {
  return {
    name: 'firebase-production-config-guard',
    apply: 'build' as const,
    buildStart() {
      if (process.env.SKIP_FIREBASE_PRODUCTION_GUARD === 'true') return;
      if (process.env.VITE_NONGA_UI_FIXTURE === 'true') return;
      execSync('tsx scripts/verify-vite-production-firebase.mts', {
        stdio: 'inherit',
        env: process.env,
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      hostingOnlyFixtureIsolationPlugin(),
      firebaseProductionConfigGuard(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Prefer TypeScript sources over stale transpiled .js siblings.
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
