import { handler } from '../netlify/functions/admin.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function adminRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  const result = await handler(event);
  return sendNetlifyResult(res, result);
}
