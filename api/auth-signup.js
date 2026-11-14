const { createClient } = require('@supabase/supabase-js');
const supabaseService = require('./supabase');

// Admin client for creating users
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, type, plan, church, faith_answer, terms_agreed_at } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Email, password and name are required.' });

  try {
    // Step 1 — Check if email already exists in users table
    const cleanEmail = email.toLowerCase().trim();
    const { data: existingUser } = await supabaseService
      .from('users')
      .select('id, email, status')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      // An earlier signup that never finished paying: let the person start over with the same email.
      // (Paid, suspended or cancelled accounts are never touched here.)
      if (existingUser.status === 'awaiting_payment') {
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          user_metadata: { name, type: type || 'individual', plan: plan || 'monthly' }
        });
        if (updErr) return res.status(400).json({ error: updErr.message });
        const { error: resumeErr } = await supabaseService.from('users').upsert([{
          id: existingUser.id,
          name,
          email: cleanEmail,
          type: type || 'individual',
          plan: plan || 'monthly',
          church: church || '',
          faith_answer: faith_answer || 'yes',
          status: 'awaiting_payment',
          terms_agreed_at: terms_agreed_at || new Date().toISOString(),
          terms_version: 'August 2026',
        }], { onConflict: 'id' });
        if (resumeErr) console.error('User resume upsert error:', resumeErr.message);
        return res.status(200).json({
          success: true,
          resumed: true,
          user: { id: existingUser.id, email, name, type: type || 'individual', plan: plan || 'monthly' }
        });
      }
      console.log(`Duplicate signup attempt: ${email}`);
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    // Step 2 — Check Supabase Auth for existing account
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
    if (authList && authList.users) {
      const existingAuth = authList.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (existingAuth) {
        console.log(`Duplicate auth signup attempt: ${email}`);
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }
    }

    // Step 3 — Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, type: type || 'individual', plan: plan || 'monthly' }
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Step 4 — Wait for trigger then upsert with correct data
    await new Promise(resolve => setTimeout(resolve, 800));

    const { error: upsertError } = await supabaseService
      .from('users')
      .upsert([{
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        type: type || 'individual',
        plan: plan || 'monthly',
        church: church || '',
        faith_answer: faith_answer || 'yes',
        status: 'awaiting_payment', // becomes 'active' only when Stripe confirms the payment
        terms_agreed_at: terms_agreed_at || new Date().toISOString(),
        terms_version: 'August 2026',
      }], { onConflict: 'id' });

    if (upsertError) console.error('User upsert error:', upsertError.message);

    return res.status(200).json({
      success: true,
      user: { id: userId, email, name, type: type || 'individual', plan: plan || 'monthly' }
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
