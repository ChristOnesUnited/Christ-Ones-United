const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
    // PUT — update prayed_by array
    if (req.method === 'PUT') {
      const { id, prayed_by } = req.body;
      if (!id) return res.status(400).json({ error: 'Prayer ID required.' });
      try {
        const { data, error } = await supabase
          .from('prayer_requests')
          .update({ prayed_by: prayed_by || [] })
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

  // ── MESSAGES ─────────────────────────────────────
  if (type === 'messages') {
    if (req.method === 'GET') {
      const { business_id, user_id } = req.query;
      try {
        let data, error;

        if (business_id && user_id) {
          // Get full thread — all messages for this business_id
          // regardless of who sent them (user OR business reply)
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('business_id', business_id)
            .order('created_at', { ascending: true })
            .limit(100));
        } else if (business_id) {
          // Business dashboard — all messages for this business
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('business_id', business_id)
            .order('created_at', { ascending: true })
            .limit(100));
        } else if (user_id) {
          // Individual messages tab — get all threads they are part of
          // Find all business_ids they have messaged
          const { data: userMsgs } = await supabase
            .from('messages')
            .select('business_id, biz_name')
            .eq('from_user_id', user_id)
            .eq('from_role', 'user');

          if (!userMsgs || !userMsgs.length) {
            return res.status(200).json({ success: true, messages: [] });
          }

          // Get unique business_ids
          const bizIds = [...new Set(userMsgs.map(m => m.business_id))];

          // Get all messages for those businesses (including business replies)
          ({ data, error } = await supabase
            .from('messages')
            .select('*')
            .in('business_id', bizIds)
            .order('created_at', { ascending: true })
            .limit(200));
        }

        if (error) throw error;
        return res.status(200).json({ success: true, messages: data || [] });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (req.method === 'POST') {
      const { business_id, from_user_id, from_name, biz_name, text, from_role, member_user_id } = req.body;
      if (!business_id || !text) return res.status(400).json({ error: 'business_id and text required.' });
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert([{
            business_id,
            from_user_id: from_user_id || null,
            from_name: from_name || 'Member',
            biz_name: biz_name || '',
            text,
            from_role: from_role || 'user',
            member_user_id: member_user_id || from_user_id || null,
          }])
          .select().single();
        if (error) throw error;
        return res.status(200).json({ success: true, message: data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  return res.status(400).json({ error: 'Invalid type. Use ?type=prayer, ?type=events, or ?type=messages' });
};
