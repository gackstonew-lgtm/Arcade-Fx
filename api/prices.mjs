import { handler } from '../netlify/functions/api.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function pricesRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  event.queryStringParameters = event.queryStringParameters || {};
  event.queryStringParameters.route = 'prices';
  const result = await handler(event);
  return sendNetlifyResult(res, result);
}
