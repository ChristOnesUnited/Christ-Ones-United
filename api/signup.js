const supabase = require('./supabase');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, type, church, plan, stripe_customer_id, stripe_subscription_id, faith_answer } = req.body;

  // Validate required fields
  if (!name || !email || !type || !plan) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          name,
          type,
          church: church || '',
          plan,
          stripe_customer_id: stripe_customer_id || '',
          stripe_subscription_id: stripe_subscription_id || '',
          faith_answer: faith_answer || 'yes',
          status: 'active',
        })
        .eq('email', email)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, user: data });
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        type,
        church: church || '',
        plan,
        stripe_customer_id: stripe_customer_id || '',
        stripe_subscription_id: stripe_subscription_id || '',
        faith_answer: faith_answer || 'yes',
        status: 'active',
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, user: data });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
