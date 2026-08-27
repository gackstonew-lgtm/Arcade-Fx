import { handler } from '../netlify/functions/api.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function healthRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  event.queryStringParameters = event.queryStringParameters || {};
  event.queryStringParameters.route = 'health';
  const result = await handler(event);
  return sendNetlifyResult(res, result);
}
