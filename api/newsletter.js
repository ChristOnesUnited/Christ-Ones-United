const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(200).json({ success: true, message: 'Already subscribed!' });
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: email.toLowerCase().trim(),
        name: name || '',
        subscribed_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, subscriber: data });

  } catch (err) {
    console.error('Newsletter subscribe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
