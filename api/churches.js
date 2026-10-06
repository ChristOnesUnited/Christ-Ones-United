const supabase = require('./supabase');
const { lookupZip, distanceMiles } = require('./_lib/geo');
const { findOrCreateChurch } = require('./_lib/church-store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/churches?q=grace&zip=80470  → up to 10 matches, nearest first when a ZIP is given
    if (req.method === 'GET') {
      const q = String((req.query && req.query.q) || '').trim();
      if (q.length < 2) return res.status(200).json({ success: true, churches: [] });
      const safe = q.replace(/[%_,()]/g, ' ');
      const { data, error } = await supabase
        .from('churches')
        .select('id, name, city, state, zip, lat, lng')
        .ilike('name', '%' + safe + '%')
        .limit(40);
      if (error) throw error;

      const near = lookupZip(req.query && req.query.zip);
      let list = data || [];
      if (near) {
        list.forEach(c => { c.distance = distanceMiles(near.lat, near.lng, c.lat, c.lng); });
        list.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
      } else {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }
      list = list.slice(0, 10).map(c => ({
        id: c.id, name: c.name, city: c.city, state: c.state, zip: c.zip,
        distance: c.distance != null ? Math.round(c.distance) : null,
      }));
      return res.status(200).json({ success: true, churches: list });
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // Add a church that isn't in the list yet (returns the existing one if it's a duplicate)
      if (body.action === 'add') {
        const church = await findOrCreateChurch(body.name, body.zip);
        return res.status(200).json({ success: true, church });
      }

      // Save a member's church and ZIP code
      if (body.action === 'update_member') {
        const { user_id, church_id } = body;
        if (!user_id) return res.status(400).json({ error: 'Please sign in again.' });
        const updates = {};

        if (body.zip !== undefined) {
          const loc = lookupZip(body.zip);
          if (body.zip && !loc) return res.status(400).json({ error: 'Please enter a valid 5-digit ZIP code.' });
          updates.zip = loc ? loc.zip : '';
          updates.lat = loc ? loc.lat : null;
          updates.lng = loc ? loc.lng : null;
        }
        if (church_id !== undefined) {
          if (church_id) {
            const { data: ch, error: chErr } = await supabase
              .from('churches').select('id, name').eq('id', church_id).single();
            if (chErr || !ch) return res.status(400).json({ error: 'Church not found. Please pick it again.' });
            updates.church_id = ch.id;
            updates.church = ch.name;
          } else {
            updates.church_id = null;
            updates.church = '';
          }
        }

        const { data, error } = await supabase
          .from('users').update(updates).eq('id', user_id)
          .select('id, church, church_id, zip').single();
        if (error) throw error;
        return res.status(200).json({ success: true, user: data });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Churches error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

