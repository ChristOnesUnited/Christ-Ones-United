const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const type = req.query && req.query.type;

  // ── PRAYER REQUESTS ──────────────────────────────
  if (type === 'prayer') {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('prayer_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return res.status(200).json({ success: true, prayers: data || [] });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (req.method === 'POST') {
      const { author, text, user_id } = req.body;
      if (!text) return res.status(400).json({ error: 'Prayer text required.' });
      try {
        const { data, error } = await supabase
          .from('prayer_requests')
          .insert([{ author: author || 'Anonymous', text, user_id: user_id || null, prayed_by: [] }])
          .select().single();
        if (error) throw error;
        return res.status(200).json({ success: true, prayer: data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  // ── EVENTS ───────────────────────────────────────
  if (type === 'events') {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true })
          .limit(50);
        if (error) throw error;
        return res.status(200).json({ success: true, events: data || [] });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (req.method === 'POST') {
      const { title, date, time, location, host, description, user_id } = req.body;
      if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });
      try {
        const { data, error } = await supabase
          .from('events')
          .insert([{ title, date, time: time || 'TBD', location: location || 'TBD', host: host || 'Community', description: description || '', user_id: user_id || null }])
          .select().single();
        if (error) throw error;
        return res.status(200).json({ success: true, event: data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  return res.status(400).json({ error: 'Invalid type. Use ?type=prayer or ?type=events' });
};
