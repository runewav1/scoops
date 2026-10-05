import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleShopApi } from './shop-api.js'
import { handleStaffApi } from './staff-api.js'

export async function handleApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (!url.pathname.startsWith('/api/')) return false
  if (url.pathname.startsWith('/api/staff')) return handleStaffApi(request, response)
  return handleShopApi(request, response)
}
