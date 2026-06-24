import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createApi } from './server/api.js'

// Mounts the Express router on the Vite dev server, so the SPA and the API
// share one origin and one port. No second process to manage.
function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use(createApi())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApi())
    },
  }
}

// HMR runs behind SpinUp's preview reverse-proxy: the browser reaches this dev
// server on a PUBLIC port (PREVIEW_HMR_PORT) that differs from Vite's internal
// port. Without this, Vite's HMR client dials the internal port and the
// websocket never connects — the page loads, but live edits don't show up.
// SpinUp injects PREVIEW_HMR_PORT / PREVIEW_HMR_PROTOCOL into the engine env;
// when they're unset (e.g. the standalone engine) HMR keeps Vite's defaults.
const hmrClientPort = process.env.PREVIEW_HMR_PORT
const hmr = hmrClientPort
  ? { protocol: process.env.PREVIEW_HMR_PROTOCOL || 'wss', clientPort: Number(hmrClientPort) }
  : undefined

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    // Required to accept requests from the container's preview proxy
    // (prv-<wsId>.localhost in local dev, <user>--<wsId>.dev.yalink.fr in prod).
    allowedHosts: ['.dev.yalink.fr', '.localhost'],
    hmr,
  },
  preview: {
    allowedHosts: ['.dev.yalink.fr', '.localhost'],
  },
})
