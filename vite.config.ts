import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './server/api.ts'

function attachStaffApi(middlewares: ViteDevServer['middlewares']) {
  middlewares.use(async (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => {
    if (!request.url?.startsWith('/api/')) return next()
    try {
      await handleApi(request, response)
    } catch {
      if (!response.headersSent) {
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Invalid request' }))
      }
    }
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'staff-api',
      configureServer(server) {
        attachStaffApi(server.middlewares)
      },
      configurePreviewServer(server) {
        attachStaffApi(server.middlewares)
      },
    },
  ],
})
