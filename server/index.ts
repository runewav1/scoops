import { createServer } from 'node:http'
import { handleApi } from './api.js'

const port = Number(process.env.PORT ?? 8787)
const server = createServer(async (request, response) => {
  try {
    const handled = await handleApi(request, response)
    if (!handled) {
      response.writeHead(404, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch {
    if (!response.headersSent) {
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Invalid request' }))
    }
  }
})

server.listen(port, () => {
  console.log(`Staff auth API listening on http://localhost:${port}`)
})
