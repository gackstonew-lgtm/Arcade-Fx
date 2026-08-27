import { handler as apiHandler } from '../netlify/functions/api.mjs';
import { handler as adminHandler } from '../netlify/functions/admin.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function apiCatchAllRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  const isAdmin = event.path.startsWith('/api/admin');
  const handlerFn = isAdmin ? adminHandler : apiHandler;
  const result = await handlerFn(event);
  return sendNetlifyResult(res, result);
}
