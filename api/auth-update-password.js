const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { access_token, refresh_token, password } = req.body;
  if (!access_token || !refresh_token || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Restore the recovery session
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionErr) {
      console.error('setSession error:', sessionErr.message);
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    // Update the password
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      console.error('updateUser error:', updateErr.message);
      return res.status(400).json({ error: updateErr.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('auth-update-password error:', err.message);
    return res.status(500).json({ error: 'Connection error. Please try again.' });
  }
};
