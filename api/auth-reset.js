const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://christonesunited.org/?reset=true',
    });

    if (error) {
      console.error('Reset error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Always return success even if email not found (security best practice)
    return res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });

  } catch (err) {
    console.error('Reset error:', err.message);
    return res.status(500).json({ error: 'Connection error. Please try again.' });
  }
};
