const supabase = require('./supabase');
const { requireMember, ownsBusiness } = require('./_lib/memberAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
      const auth = await requireMember(req, res); if (!auth) return;
      const { author, text } = req.body;
      const user_id = auth.user.id;
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
    // PUT — update prayed_by array
    if (req.method === 'PUT') {
      const auth = await requireMember(req, res); if (!auth) return;
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Prayer ID required.' });
      try {
        // A member can only add themselves to "praying"; the list is never taken from the browser
        const { data: current } = await supabase.from('prayer_requests').select('id, prayed_by').eq('id', id).single();
        if (!current) return res.status(404).json({ error: 'Prayer request not found.' });
        const list = Array.isArray(current.prayed_by) ? current.prayed_by.slice() : [];
        const me = auth.user.name || 'Anonymous';
        if (!list.includes(me)) list.push(me);
        const { data, error } = await supabase
          .from('prayer_requests')
          .update({ prayed_by: list })
          .eq('id', id)
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
      const auth = await requireMember(req, res); if (!auth) return;
      const { title, date, time, location, host, description } = req.body;
      const user_id = auth.user.id;
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

  // ── MESSAGES ─────────────────────────────────────
  if (type === 'messages') {
    if (req.method === 'GET') {
      const auth = await requireMember(req, res); if (!auth) return;
      const me = auth.user.id;
      const { business_id, user_id } = req.query;
      try {
        let data, error;
        // Only messages this member is part of: ones they sent, or replies addressed to them
        const mine = 'member_user_id.eq.' + me + ',from_user_id.eq.' + me;

        if (business_id && user_id) {
          // A member's own thread with one business
          if (String(user_id) !== String(me)) return res.status(403).json({ error: 'You can only read your own messages.' });
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('business_id', business_id)
            .or(mine)
            .order('created_at', { ascending: true })
            .limit(100));
        } else if (business_id) {
          // Business dashboard: only the owner of that business
          if (!(await ownsBusiness(me, business_id))) return res.status(403).json({ error: 'You can only read messages for your own business.' });
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('business_id', business_id)
            .order('created_at', { ascending: true })
            .limit(100));
        } else if (user_id) {
          // Individual messages tab: all of this member's own threads
          if (String(user_id) !== String(me)) return res.status(403).json({ error: 'You can only read your own messages.' });
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .or(mine)
            .order('created_at', { ascending: true })
            .limit(200));
        } else {
          return res.status(400).json({ error: 'business_id or user_id required.' });
        }

        if (error) throw error;
        return res.status(200).json({ success: true, messages: data || [] });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (req.method === 'POST') {
      const auth = await requireMember(req, res); if (!auth) return;
      const { business_id, biz_name, text, from_role, member_user_id } = req.body;
      if (!business_id || !text) return res.status(400).json({ error: 'business_id and text required.' });
      try {
        let row;
        if (from_role === 'business') {
          // A business replying: must be the owner, and must say which member it is replying to
          const biz = await ownsBusiness(auth.user.id, business_id);
          if (!biz) return res.status(403).json({ error: 'You can only reply as your own business.' });
          row = { business_id, from_user_id: auth.user.id, from_name: biz.name || 'Business', biz_name: biz.name || biz_name || '',
                  text, from_role: 'business', member_user_id: member_user_id || null };
        } else {
          // A member writing to a business: identity always comes from the sign-in
          row = { business_id, from_user_id: auth.user.id, from_name: auth.user.name || 'Member', biz_name: biz_name || '',
                  text, from_role: 'user', member_user_id: auth.user.id };
        }
        const { data, error } = await supabase.from('messages').insert([row]).select().single();
        if (error) throw error;
        return res.status(200).json({ success: true, message: data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  // ── DELETE ───────────────────────────────────────
  if (req.method === 'DELETE') {
    const auth = await requireMember(req, res); if (!auth) return;
    const { id, type: delType } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID required.' });
    try {
      const table = delType === 'prayer' ? 'prayer_requests' : 'events';
      // Members can only delete things they posted themselves
      const { data: row } = await supabase.from(table).select('id, user_id').eq('id', id).single();
      if (!row) return res.status(404).json({ error: 'Not found.' });
      if (!row.user_id || String(row.user_id) !== String(auth.user.id)) {
        return res.status(403).json({ error: 'You can only delete your own posts.' });
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Invalid type. Use ?type=prayer, ?type=events, or ?type=messages' });
};
