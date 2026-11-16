import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleCustomerApi } from './customer-api.js'
import { handleShopApi } from './shop-api.js'
import { handleStaffApi } from './staff-api.js'

export async function handleApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (!url.pathname.startsWith('/api/')) return false
  if (url.pathname.startsWith('/api/staff')) return handleStaffApi(request, response)
  if (url.pathname.startsWith('/api/account') || url.pathname.startsWith('/api/customers')) return handleCustomerApi(request, response)
  return handleShopApi(request, response)
}
