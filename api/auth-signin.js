const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('./supabase');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Safety net for the moment right after paying: if Stripe already has a live subscription
// for this email but the webhook has not activated the account yet, activate it now.
async function findPaidSubscription(email) {
  if (!stripe) return null;
  const tries = Array.from(new Set([String(email).trim(), String(email).toLowerCase().trim()]));
  try {
    for (const addr of tries) {
      const customers = await stripe.customers.list({ email: addr, limit: 5 });
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 5 });
        const s = subs.data.find(x => ['active', 'trialing', 'past_due'].includes(x.status));
        if (s) return { customer: c.id, subscription: s.id };
      }
    }
  } catch (e) { console.error('Stripe paid-check failed:', e.message); }
  return null;
}

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    // Step 1 — Authenticate
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
      }
      if (msg.includes('email not confirmed')) {
        return res.status(401).json({ error: 'Please confirm your email before signing in.' });
      }
      return res.status(401).json({ error: authError.message });
    }

    // Step 2 — Get profile using SERVICE KEY (bypasses RLS)
    let userProfile = null;

    const { data: byId } = await supabaseService
      .from('users').select('*').eq('id', authData.user.id).single();

    if (byId) {
      userProfile = byId;
    } else {
      const { data: byEmail } = await supabaseService
        .from('users').select('*').eq('email', email.toLowerCase().trim()).single();
      userProfile = byEmail;
    }

    // Step 3 — Create profile if not found
    if (!userProfile) {
      const meta = authData.user.user_metadata || {};
      const { data: created } = await supabaseService
        .from('users')
        .insert([{
          id: authData.user.id,
          name: meta.name || email.split('@')[0],
          email: email.toLowerCase().trim(),
          type: meta.type || 'individual',
          plan: meta.plan || 'monthly',
          status: 'awaiting_payment',
          faith_answer: 'yes',
        }])
        .select().single();
      userProfile = created || { id: authData.user.id, email, name: email.split('@')[0], type: meta.type || 'individual', plan: 'monthly', status: 'awaiting_payment' };
    }

    if (userProfile.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact support@christonesunited.com.' });
    }

    // Accounts are only usable once the membership is paid for
    if (userProfile.status === 'awaiting_payment') {
      const paid = await findPaidSubscription(email);
      if (paid) {
        await supabaseService.from('users').update({
          status: 'active', stripe_customer_id: paid.customer, stripe_subscription_id: paid.subscription,
        }).eq('id', userProfile.id);
        userProfile.status = 'active';
      } else {
        return res.status(402).json({
          error: 'Your membership payment is not complete yet. Please finish checkout to activate your account.',
          awaiting_payment: true,
          user: { id: userProfile.id, name: userProfile.name, email: userProfile.email, type: userProfile.type || 'individual' },
        });
      }
    }

    return res.status(200).json({
      success: true,
      token: authData.session.access_token,
      user: userProfile,
    });

  } catch (err) {
    console.error('Sign in error:', err.message);
    return res.status(500).json({ error: 'Connection error. Please try again.' });
  }
};
