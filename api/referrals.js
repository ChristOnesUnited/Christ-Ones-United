const supabase = require('./supabase');
const { requireMember, ownsBusiness } = require('./_lib/memberAuth');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch referrals for a business
  if (req.method === 'GET') {
    const auth = await requireMember(req, res); if (!auth) return;
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id required.' });
    // Referrals hold other people's contact details: only the business owner may read them
    if (!(await ownsBusiness(auth.user.id, business_id))) {
      return res.status(403).json({ error: 'You can only view referrals for your own business.' });
    }

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
    const auth = await requireMember(req, res); if (!auth) return;
    const { business_id, name, phone, email, need, faith_status } = req.body;
    const from_user_id = auth.user.id;
    const referred_by = auth.user.name || 'A Member';

    if (!business_id || !name || !phone) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
      const { data, error } = await supabase
        .from('referrals')
        .insert([{ from_user_id, business_id, name, phone, email, need, faith_status, referred_by, contacted: false }])
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
    const auth = await requireMember(req, res); if (!auth) return;
    const { id, contacted } = req.body;
    if (!id) return res.status(400).json({ error: 'Referral ID required.' });
    try {
      const { data: ref } = await supabase.from('referrals').select('id, business_id').eq('id', id).single();
      if (!ref) return res.status(404).json({ error: 'Referral not found.' });
      if (!(await ownsBusiness(auth.user.id, ref.business_id))) {
        return res.status(403).json({ error: 'You can only update referrals for your own business.' });
      }
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
