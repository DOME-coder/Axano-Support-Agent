import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';

// Two build modes:
//   - default (vite dev):    classic dev server with index.html as entry.
//   - production (vite build): library/IIFE bundle that tenants load via
//     <script src="cdn/widget.js"></script>. The bundle exposes
//     window.AvatarDesk.{ init }.
//
// CSS is inlined into the bundle so a tenant only needs one tag.
export default defineConfig(({ command }) => ({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'AvatarDesk',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // CSS -> inline via <style> injection in main.ts (see styles.ts).
        assetFileNames: 'widget.[ext]',
      },
    },
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: command === 'serve' ? '/index.html' : false,
  },
}));
