const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('./supabase');

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

    // Try by id first (most reliable)
    const { data: byId } = await supabaseService
      .from('users').select('*').eq('id', authData.user.id).single();

    if (byId) {
      userProfile = byId;
    } else {
      // Try by email
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
          status: 'active',
          faith_answer: 'yes',
        }])
        .select().single();
      userProfile = created || { id: authData.user.id, email, name: email.split('@')[0], type: meta.type || 'individual', plan: 'monthly', status: 'active' };
    }

    if (userProfile.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact support@christonesunited.com.' });
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
