/**
 * ArcadeFX Server-Side Referral & Subscription Attribution Service
 * Manages unique referral code generation, secure user attribution, anti-self-referral validation,
 * verified payment referral qualification, and referrer statistics.
 */

export function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars O/0, I/1
  let code = 'AFX';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getOrCreateReferralCode(db, userId) {
  if (!db || !userId) return null;

  try {
    // 1. Check existing referral code in profiles
    const profRes = await db.query('SELECT referral_code FROM profiles WHERE id = $1', [userId]);
    const existingCode = profRes.rows[0]?.referral_code;

    if (existingCode) {
      return existingCode;
    }

    // 2. Generate stable, collision-free code
    let uniqueCode = null;
    let attempts = 0;
    while (!uniqueCode && attempts < 10) {
      attempts++;
      const candidate = generateRandomCode(5);
      const checkRes = await db.query('SELECT id FROM profiles WHERE referral_code = $1', [candidate]);
      if (!checkRes.rows || checkRes.rows.length === 0) {
        uniqueCode = candidate;
      }
    }

    if (!uniqueCode) {
      uniqueCode = 'AFX' + Date.now().toString(36).toUpperCase().slice(-5);
    }

    // 3. Save to profile
    await db.query('UPDATE profiles SET referral_code = $1, updated_at = NOW() WHERE id = $2', [uniqueCode, userId]);
    return uniqueCode;
  } catch (err) {
    console.warn('[ReferralService] Code generation warning:', err.message);
    return 'AFX' + userId.substring(0, 4).toUpperCase();
  }
}

export async function attributeReferral(db, referredUserId, referralCodeRaw) {
  if (!db || !referredUserId || !referralCodeRaw) {
    return { success: false, error: 'Missing required attribution parameters.' };
  }

  const referralCode = String(referralCodeRaw).trim().toUpperCase();

  try {
    // 1. Validate referral code existence
    const referrerRes = await db.query('SELECT id, email FROM profiles WHERE referral_code = $1', [referralCode]);
    if (!referrerRes.rows || referrerRes.rows.length === 0) {
      return { success: false, error: 'Invalid or expired referral link.' };
    }

    const referrerUserId = referrerRes.rows[0].id;

    // 2. Anti-Self-Referral Check
    if (referrerUserId === referredUserId) {
      return { success: false, error: 'You cannot use your own referral link.' };
    }

    // 3. Check existing attribution (First-Touch Model)
    const existingAttribution = await db.query(
      'SELECT id FROM referrals WHERE referred_user_id = $1',
      [referredUserId]
    );

    if (existingAttribution.rows && existingAttribution.rows.length > 0) {
      return { success: false, error: 'This account already has a referral source.' };
    }

    // 4. Update Profile & Create Pending Referral Record
    await db.query(
      'UPDATE profiles SET referred_by_id = $1, updated_at = NOW() WHERE id = $2 AND (referred_by_id IS NULL)',
      [referrerUserId, referredUserId]
    );

    await db.query(`
      INSERT INTO referrals (
        referrer_user_id, referred_user_id, referral_code, status, created_at
      ) VALUES ($1, $2, $3, 'PENDING', NOW())
      ON CONFLICT (referred_user_id) DO NOTHING
    `, [referrerUserId, referredUserId, referralCode]);

    console.log(`[Referral Attributed] Account ${referredUserId} attributed to referrer ${referrerUserId} (Code: ${referralCode})`);

    return {
      success: true,
      message: 'Referral successfully applied.'
    };
  } catch (err) {
    console.error('[ReferralService] Attribution error:', err.message);
    return { success: false, error: 'Failed to record referral attribution.' };
  }
}

export async function qualifyReferralOnPayment(db, userId, planName, amountPaid, currency = 'USD') {
  if (!db || !userId) return { qualified: false };

  try {
    // Find pending referral for this referred user
    const pendingRes = await db.query(
      'SELECT id, referrer_user_id, referral_code FROM referrals WHERE referred_user_id = $1 AND status = \'PENDING\'',
      [userId]
    );

    if (!pendingRes.rows || pendingRes.rows.length === 0) {
      return { qualified: false, note: 'No pending referral found for user' };
    }

    const referral = pendingRes.rows[0];

    // Qualify referral
    await db.query(`
      UPDATE referrals
      SET status = 'QUALIFIED',
          subscription_plan = $1,
          subscription_amount = $2,
          currency = $3,
          qualified_at = NOW()
      WHERE id = $4
    `, [planName || 'Pro SMC Trader', amountPaid || 49.00, currency || 'USD', referral.id]);

    console.log(`[Referral QUALIFIED] Referral ID ${referral.id} qualified for referrer ${referral.referrer_user_id} on plan ${planName}`);

    return {
      qualified: true,
      referralId: referral.id,
      referrerUserId: referral.referrer_user_id,
      code: referral.referral_code
    };
  } catch (err) {
    console.error('[ReferralService] Qualification error:', err.message);
    return { qualified: false, error: err.message };
  }
}

export async function getUserReferralDetails(db, userId, requestOrigin = 'https://arcadefx.live') {
  if (!db || !userId) {
    return { success: false, error: 'User context required.' };
  }

  try {
    const code = await getOrCreateReferralCode(db, userId);
    const origin = requestOrigin && requestOrigin.startsWith('http') ? requestOrigin : 'https://arcadefx.live';
    const referralUrl = `${origin}/?ref=${code || 'AFX000'}`;

    // Get statistics
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status = 'QUALIFIED') AS successful
      FROM referrals
      WHERE referrer_user_id = $1
    `, [userId]);

    const stats = statsRes.rows[0] || { total: 0, pending: 0, successful: 0 };

    // Get anonymized history
    const historyRes = await db.query(`
      SELECT 
        id,
        status,
        subscription_plan,
        subscription_amount,
        created_at,
        qualified_at
      FROM referrals
      WHERE referrer_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    const historyRows = historyRes.rows || [];

    const totalCount = parseInt(stats.total || 0, 10);
    const pendingCount = parseInt(stats.pending || 0, 10);
    const successfulCount = parseInt(stats.successful || 0, 10);

    return {
      success: true,
      referralCode: code,
      referralLink: referralUrl,
      referralUrl: referralUrl,
      statistics: {
        totalReferrals: totalCount,
        pendingPayments: pendingCount,
        successfulPaid: successfulCount
      },
      totalReferrals: totalCount,
      pendingReferrals: pendingCount,
      successfulReferrals: successfulCount,
      history: historyRows.map((row, idx) => ({
        index: idx + 1,
        id: row.id,
        status: row.status,
        plan: row.subscription_plan || 'Pending Subscription',
        amount: row.subscription_amount ? `$${row.subscription_amount}` : '—',
        date: row.qualified_at ? new Date(row.qualified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }))
    };
  } catch (err) {
    console.error('[ReferralService] Fetch error:', err.message);
    return { success: false, error: 'Could not load referral dashboard data.' };
  }
}
