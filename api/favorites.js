const supabase = require('./supabase');
const { requireMember } = require('./_lib/memberAuth');

// A member's saved favorites (businesses and jobs). The member is identified from their
// sign-in token, never from anything the browser claims.
//   GET  /api/favorites                          -> { business: [ids], job: [ids] }
//   POST /api/favorites { kind, item_id, saved } -> saved true adds it, false removes it
const KINDS = ['business', 'job'];
const MAX_PER_MEMBER = 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireMember(req, res); if (!auth) return;
  const userId = String(auth.user.id);

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('favorites').select('kind, item_id').eq('user_id', userId).limit(MAX_PER_MEMBER);
      if (error) throw error;
      const out = { business: [], job: [] };
      (data || []).forEach(function (r) { if (out[r.kind]) out[r.kind].push(String(r.item_id)); });
      return res.status(200).json({ success: true, business: out.business, job: out.job });
    }

    const { kind, item_id, saved } = req.body || {};
    const id = String(item_id == null ? '' : item_id).trim();
    if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Unknown kind.' });
    if (!id || id.length > 80) return res.status(400).json({ error: 'item_id is required.' });
    if (typeof saved !== 'boolean') return res.status(400).json({ error: 'saved must be true or false.' });

    if (!saved) {
      const { error } = await supabase
        .from('favorites').delete().eq('user_id', userId).eq('kind', kind).eq('item_id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    const { count } = await supabase
      .from('favorites').select('item_id', { count: 'exact', head: true }).eq('user_id', userId);
    if ((count || 0) >= MAX_PER_MEMBER) {
      return res.status(400).json({ error: 'You have reached the limit of saved favorites.' });
    }
    const { error } = await supabase
      .from('favorites').upsert([{ user_id: userId, kind, item_id: id }], { onConflict: 'user_id,kind,item_id' });
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('favorites error:', err.message);
    return res.status(500).json({ error: 'Your favorites could not be updated. Please try again.' });
  }
};
