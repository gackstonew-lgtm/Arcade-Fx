import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const EXCHANGE_RATE = 129.00; // 1 USD = 129.00 KES
const MIN_WITHDRAWAL_USD = 5.00;
const MAX_WITHDRAWAL_USD = 10000.00;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
    const koraSecretKey = Deno.env.get('KORA_SECRET_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { amount_usd, phone_number } = body;

    const parsedAmountUsd = Number(amount_usd);
    if (!Number.isFinite(parsedAmountUsd) || parsedAmountUsd < MIN_WITHDRAWAL_USD) {
      return new Response(JSON.stringify({ success: false, error: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_USD.toFixed(2)} USD` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (parsedAmountUsd > MAX_WITHDRAWAL_USD) {
      return new Response(JSON.stringify({ success: false, error: `Maximum single withdrawal amount is $${MAX_WITHDRAWAL_USD.toFixed(2)} USD` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let cleanPhone = String(phone_number || '').trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    }
    if (!/^254(7|1)\d{8}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ success: false, error: 'Please provide a valid M-Pesa phone number (e.g. 254712345678)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const amountKes = Number((parsedAmountUsd * EXCHANGE_RATE).toFixed(2));
    const reference = `AFX-WTH-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Invoke atomic lock_withdrawal_funds procedure
    const { data: lockResult, error: lockErr } = await supabase.rpc('lock_withdrawal_funds', {
      p_user_id: user.id,
      p_amount_usd: parsedAmountUsd,
      p_amount_kes: amountKes,
      p_exchange_rate: EXCHANGE_RATE,
      p_phone: cleanPhone,
      p_reference: reference
    });

    if (lockErr || !lockResult?.success) {
      const errMsg = lockResult?.error || lockErr?.message || 'Insufficient available balance';
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let koraResponseData: any = null;

    // Trigger Kora Payout if API key is present
    if (koraSecretKey) {
      try {
        const koraReq = await fetch('https://api.korapay.com/merchant/api/v1/transactions/disburse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${koraSecretKey}`
          },
          body: JSON.stringify({
            reference,
            destination: {
              type: 'mobile_money',
              amount: amountKes,
              currency: 'KES',
              mobile_money: {
                operator: 'MPESA',
                phone_number: cleanPhone
              }
            },
            customer: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0]
            }
          })
        });
        koraResponseData = await koraReq.json();

        // If Kora API immediately returns an error
        if (koraResponseData && koraResponseData.status === false) {
          // Auto refund locked funds
          await supabase.rpc('finalize_withdrawal', {
            p_reference: reference,
            p_kora_ref: null,
            p_success: false,
            p_failure_reason: koraResponseData.message || 'Kora API disburse error'
          });

          return new Response(JSON.stringify({ success: false, error: `Payout failed: ${koraResponseData.message || 'Provider rejected request'}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (koraErr: any) {
        console.warn('[create-withdrawal] Kora disburse error:', koraErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reference,
      amount_usd: parsedAmountUsd,
      amount_kes: amountKes,
      exchange_rate: EXCHANGE_RATE,
      phone_number: cleanPhone,
      status: 'pending',
      message: 'Withdrawal request submitted successfully. Processing payout to your M-Pesa account.',
      kora_status: koraResponseData?.status || 'initiated'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[create-withdrawal] Exception:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
