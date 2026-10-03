const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch referrals for a business
  if (req.method === 'GET') {
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id required.' });

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('business_id', business_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, referrals: data });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — save a new referral
  if (req.method === 'POST') {
    const { from_user_id, business_id, name, phone, email, need, faith_status, referred_by } = req.body;

    if (!business_id || !name || !phone) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
      const { data, error } = await supabase
        .from('referrals')
        .insert([{ from_user_id, business_id, name, phone, email, need, faith_status, referred_by: referred_by || 'A Member', contacted: false }])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, referral: data });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — mark referral as contacted
  if (req.method === 'PUT') {
    const { id, contacted } = req.body;
    if (!id) return res.status(400).json({ error: 'Referral ID required.' });
    try {
      const { data, error } = await supabase
        .from('referrals')
        .update({ contacted: contacted !== false, contacted_at: contacted !== false ? new Date().toISOString() : null })
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return res.status(200).json({ success: true, referral: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
