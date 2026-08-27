import { handler } from '../netlify/functions/payhero-webhook.mjs';
import { sendNetlifyResult, vercelToNetlifyEvent } from './_adapter.mjs';

export default async function payheroWebhookRoute(req, res) {
  const event = vercelToNetlifyEvent(req);
  const result = await handler(event);
  return sendNetlifyResult(res, result);
}
