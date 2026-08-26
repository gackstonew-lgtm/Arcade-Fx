import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-kora-signature, content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

async function verifyKoraSignature(payloadText: string, signature: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret) return true; // If secret not set in environment, bypass for testing/sandbox
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payloadText)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedSignature === signature.toLowerCase();
  } catch (e) {
    console.error('[kora-webhook] Signature verification error:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
    const webhookSecret = Deno.env.get('KORA_WEBHOOK_SECRET');

    const signature = req.headers.get('x-kora-signature');
    const rawBody = await req.text();

    const isValidSignature = await verifyKoraSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.warn('[kora-webhook] Invalid Kora webhook signature header');
      return new Response(JSON.stringify({ success: false, error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const event = payload.event || payload.type;
    const data = payload.data || payload;
    const reference = data.reference || data.payment_reference;
    const koraRef = data.kora_reference || data.transaction_reference || data.id;
    const status = (data.status || '').toLowerCase();

    if (!reference) {
      return new Response(JSON.stringify({ success: false, error: 'Missing transaction reference in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If event is success or charge.success or status is success/successful
    if (status === 'success' || status === 'successful' || event === 'charge.success') {
      // Call atomic PostgreSQL function
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('credit_deposit_atomically', {
        p_reference: reference,
        p_kora_ref: String(koraRef || '')
      });

      if (rpcErr) {
        console.error('[kora-webhook] RPC credit_deposit_atomically error:', rpcErr);
        return new Response(JSON.stringify({ success: false, error: 'Database transaction error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('[kora-webhook] Successfully processed deposit:', rpcResult);
      return new Response(JSON.stringify({ success: true, message: 'Deposit processed and wallet credited', result: rpcResult }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (status === 'failed' || status === 'expired' || event === 'charge.failed') {
      // Update deposit status to failed
      await supabase
        .from('deposits')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('reference', reference)
        .eq('status', 'pending');

      return new Response(JSON.stringify({ success: true, message: 'Deposit failure recorded' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook event acknowledged' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[kora-webhook] Exception:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
