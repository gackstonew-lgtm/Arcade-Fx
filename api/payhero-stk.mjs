import { handler } from '../netlify/functions/payhero-stk.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function payheroStkRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  const result = await handler(event);
  return sendNetlifyResult(res, result);
}
