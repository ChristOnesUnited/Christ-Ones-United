const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('./supabase');

// Use service role for auth admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, type, plan, church, faith_answer, terms_agreed_at } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name are required.' });
  }

  try {
    // Step 1: Create auth user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, type, plan }
    });

    if (authError) {
      console.error('Auth signup error:', authError.message);
      if (authError.message.toLowerCase().includes('already been registered') ||
          authError.message.toLowerCase().includes('already exists') ||
          authError.message.toLowerCase().includes('already registered')) {
        return res.status(200).json({ success: true, message: 'Account already exists' });
      }
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Step 2: Wait briefly for the trigger to fire first
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Update the user record the trigger created (or insert if trigger failed)
    const { error: updateError } = await supabaseService
      .from('users')
      .upsert([{
        id: userId,
        name,
        email,
        type: type || 'individual',
        plan: plan || 'monthly',
        church: church || '',
        faith_answer: faith_answer || 'yes',
        status: 'active',
        terms_agreed_at: terms_agreed_at || new Date().toISOString(),
        terms_version: 'August 2026',
      }], { onConflict: 'id' });

    if (updateError) {
      console.error('DB upsert error:', updateError.message);
      // Auth was created successfully — this is not a blocking error
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
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
