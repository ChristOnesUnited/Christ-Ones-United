const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('./supabase');
const { siteUrl } = require('./_lib/site');

// Opens Stripe's customer portal for the signed-in member, where they can cancel, update
// their card, or see invoices. The member is identified from their sign-in token (never from
// something the browser claims), so nobody can open another member's billing page.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const header = req.headers && (req.headers.authorization || req.headers.Authorization) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Please sign in again to manage your subscription.' });

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const authUser = authData && authData.user;
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Please sign in again to manage your subscription.' });
    }

    // Find the member's profile (by id first, then by email)
    let profile = null;
    const { data: byId } = await supabase
      .from('users').select('id, email, stripe_customer_id').eq('id', authUser.id).single();
    profile = byId;
    if (!profile && authUser.email) {
      const { data: byEmail } = await supabase
        .from('users').select('id, email, stripe_customer_id').eq('email', String(authUser.email).toLowerCase()).single();
      profile = byEmail;
    }

    if (!profile || !profile.stripe_customer_id) {
      return res.status(404).json({ error: 'We could not find a subscription on your account. Please contact support@christonesunited.com.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: siteUrl(req) + '/?portal=return',
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (err) {
    console.error('Manage subscription error:', err.message);
    return res.status(500).json({ error: 'Could not open subscription management right now. Please try again, or contact support@christonesunited.com.' });
  }
};
