const { createClient } = require('@supabase/supabase-js');

// Use anon key for auth operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service client for writing to users table
const supabaseService = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, type, plan, church, faith_answer } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name are required.' });
  }

  try {
    // Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, type, plan }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError.message);
      return res.status(400).json({ error: authError.message });
    }

    // Also save to our users table
    const { error: dbError } = await supabaseService
      .from('users')
      .upsert([{
        id: authData.user.id,
        name,
        email,
        type: type || 'individual',
        plan: plan || 'monthly',
        church: church || '',
        faith_answer: faith_answer || 'yes',
        status: 'active',
      }], { onConflict: 'email' });

    if (dbError) {
      console.error('DB insert error:', dbError.message);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        type,
        plan,
      }
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
