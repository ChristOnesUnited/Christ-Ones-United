const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseService = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Return friendly error messages
      if (authError.message.includes('Invalid login')) {
        return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
      }
      if (authError.message.includes('Email not confirmed')) {
        return res.status(401).json({ error: 'Please confirm your email address before signing in.' });
      }
      return res.status(401).json({ error: authError.message });
    }

    // Get full user profile from our users table
    const { data: userProfile, error: profileError } = await supabaseService
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      // Auth worked but no profile — create one
      const { data: newProfile } = await supabaseService
        .from('users')
        .insert([{
          id: authData.user.id,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          email,
          type: 'individual',
          plan: 'monthly',
          status: 'active',
          faith_answer: 'yes',
        }])
        .select()
        .single();

      return res.status(200).json({
        success: true,
        token: authData.session.access_token,
        user: newProfile || { email, name: email.split('@')[0], type: 'individual', plan: 'monthly' }
      });
    }

    if (userProfile.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support at christonesunited.org.' });
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
