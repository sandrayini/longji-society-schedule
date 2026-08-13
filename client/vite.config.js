import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { copyFileSync, mkdirSync } from 'fs';
import path from 'path';

function copyShared() {
  return {
    name: 'copy-shared',
    buildStart() {
      const src = path.resolve(__dirname, '../shared/intervals.esm.js');
      const destDir = path.resolve(__dirname, 'src/shared');
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, path.join(destDir, 'intervals.js'));
    }
  };
}

export default defineConfig({
  plugins: [vue(), copyShared()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
