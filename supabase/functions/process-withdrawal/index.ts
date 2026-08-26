import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-kora-signature, content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Missing reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isSuccess = (status === 'success' || status === 'successful' || event === 'transfer.success');
    const isFailed = (status === 'failed' || status === 'reversed' || event === 'transfer.failed');

    if (isSuccess) {
      const { data: result, error } = await supabase.rpc('finalize_withdrawal', {
        p_reference: reference,
        p_kora_ref: String(koraRef || ''),
        p_success: true,
        p_failure_reason: null
      });

      if (error) {
        console.error('[process-withdrawal] Finalize error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Database transaction failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Withdrawal completed', result }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (isFailed) {
      const reason = data.reason || data.message || 'M-Pesa payout failed';
      const { data: result, error } = await supabase.rpc('finalize_withdrawal', {
        p_reference: reference,
        p_kora_ref: String(koraRef || ''),
        p_success: false,
        p_failure_reason: reason
      });

      return new Response(JSON.stringify({ success: true, message: 'Withdrawal failed and funds refunded', result }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Event acknowledged' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[process-withdrawal] Exception:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
