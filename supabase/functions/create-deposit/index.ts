import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const EXCHANGE_RATE = 129.00; // 1 USD = 129.00 KES

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
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing authorization header' }), {
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
    const { amount_kes, phone_number } = body;

    const parsedAmountKes = Number(amount_kes);
    if (!Number.isFinite(parsedAmountKes) || parsedAmountKes < 10) {
      return new Response(JSON.stringify({ success: false, error: 'Minimum deposit amount is KES 10.00' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let cleanPhone = String(phone_number || '').trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    }
    if (!/^254(7|1)\d{8}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ success: false, error: 'Please provide a valid M-Pesa phone number (e.g., 254712345678)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const amountUsd = Number((parsedAmountKes / EXCHANGE_RATE).toFixed(2));
    if (amountUsd <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid USD converted amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Retrieve user wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ success: false, error: 'User wallet record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Unique collision-resistant reference
    const reference = `AFX-DEP-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Create pending deposit in DB
    const { error: depositError } = await supabase.from('deposits').insert({
      user_id: user.id,
      wallet_id: wallet.id,
      amount_kes: parsedAmountKes,
      amount_usd: amountUsd,
      exchange_rate: EXCHANGE_RATE,
      phone_number: cleanPhone,
      status: 'pending',
      reference,
      payment_method: 'mpesa'
    });

    if (depositError) {
      console.error('[create-deposit] DB Insert error:', depositError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to record deposit transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let koraResponseData: any = null;

    // Call Kora API if secret is configured
    if (koraSecretKey) {
      try {
        const koraReq = await fetch('https://api.korapay.com/merchant/api/v1/charges/m-pesa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${koraSecretKey}`
          },
          body: JSON.stringify({
            reference,
            amount: parsedAmountKes,
            currency: 'KES',
            customer: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0]
            },
            mobile_money: {
              phone_number: cleanPhone
            },
            notification_url: `${supabaseUrl}/functions/v1/kora-webhook`
          })
        });
        koraResponseData = await koraReq.json();
      } catch (koraErr: any) {
        console.warn('[create-deposit] Kora API call error:', koraErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reference,
      amount_kes: parsedAmountKes,
      amount_usd: amountUsd,
      exchange_rate: EXCHANGE_RATE,
      phone_number: cleanPhone,
      status: 'pending',
      message: 'M-Pesa STK Push initiated. Please enter your PIN on your phone to complete deposit.',
      kora_status: koraResponseData?.status || 'initiated'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[create-deposit] Exception:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
