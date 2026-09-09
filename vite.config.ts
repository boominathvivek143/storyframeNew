import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Storyframe has no separate frontend dev process -- server.ts runs Vite in
// middleware mode itself (see the bottom of server.ts), so this config is
// only used for `vite build` and for type/plugin resolution in the editor.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    // data/ holds runtime state the server writes on nearly every request
    // (the SQLite file + its WAL, the API-consumption ledger) -- without
    // this, Vite's watcher treats every write as an unrecognized file
    // change and force-reloads the whole page, wiping out in-flight client
    // state (e.g. a multi-step language switch never finishes because the
    // page reloads mid-loop).
    watch: {
      ignored: ['**/data/**'],
    },
  },
});
