const supabase = require('./supabase');
const { lookupZip, distanceMiles } = require('./_lib/geo');
const { requireMember, ownsBusiness } = require('./_lib/memberAuth');

// Conversations a member has deleted "from their view" (the other person keeps their copy).
// A message is hidden only if it is at or before the moment they cleared that conversation.
function threadMember(m) {
  return String(m.member_user_id || (m.from_role === 'user' ? m.from_user_id : '') || '');
}
async function applyThreadClears(me, rows) {
  try {
    const { data: clears, error } = await supabase
      .from('thread_clears').select('business_id, member_user_id, cleared_at').eq('user_id', String(me));
    if (error || !clears || !clears.length) return rows;
    const map = {};
    clears.forEach(c => { map[String(c.business_id) + '|' + String(c.member_user_id)] = new Date(c.cleared_at).getTime(); });
    return rows.filter(m => {
      const t = map[String(m.business_id) + '|' + threadMember(m)];
      return !(t && new Date(m.created_at).getTime() <= t);
    });
  } catch (e) { return rows; } // never stop messages from loading
}

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
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }); // YYYY-MM-DD
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('date', today) // upcoming only (today counts); past events stay in the database
          .order('date', { ascending: true })
          .limit(50);
        if (error) throw error;
        // Optional viewer ZIP (?zip=80421): add distance_mi to events that have a location
        const qz = req.query && req.query.zip;
        const qLat = parseFloat(req.query && req.query.lat), qLng = parseFloat(req.query && req.query.lng);
        const hasGeo = !isNaN(qLat) && !isNaN(qLng) && Math.abs(qLat) <= 90 && Math.abs(qLng) <= 180;
        const here = hasGeo ? { lat: qLat, lng: qLng } : (qz ? lookupZip(qz) : null);
        const rows = (data || []).map(e => {
          if (!here) return e;
          const d = distanceMiles(here.lat, here.lng, e.lat, e.lng);
          return { ...e, distance_mi: d === null ? null : Math.round(d * 10) / 10 };
        });
        return res.status(200).json({ success: true, events: rows, located: (qz || hasGeo) ? !!here : undefined });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (req.method === 'POST') {
      const auth = await requireMember(req, res); if (!auth) return;
      const { title, date, time, location, host, description, zip } = req.body;
      const user_id = auth.user.id;
      if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });
      try {
        const loc = lookupZip(zip);
        const base = { title, date, time: time || 'TBD', location: location || 'TBD', host: host || 'Community', description: description || '', user_id: user_id || null };
        let { data, error } = await supabase
          .from('events')
          .insert([{ ...base, zip: loc ? loc.zip : '', lat: loc ? loc.lat : null, lng: loc ? loc.lng : null }])
          .select().single();
        if (error && /zip|lat|lng|column/i.test(error.message || '')) {
          // events table doesn't have the location columns yet: save without them
          ({ data, error } = await supabase.from('events').insert([base]).select().single());
        }
        if (error) throw error;
        return res.status(200).json({ success: true, event: data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // PUT — the member who posted an event can edit it
    if (req.method === 'PUT') {
      const auth = await requireMember(req, res); if (!auth) return;
      const { id, title, date, time, location, host, description, zip } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Event ID required.' });
      if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });
      try {
        const { data: row } = await supabase.from('events').select('id, user_id').eq('id', id).single();
        if (!row) return res.status(404).json({ error: 'Event not found.' });
        if (!row.user_id || String(row.user_id) !== String(auth.user.id)) {
          return res.status(403).json({ error: 'You can only edit your own events.' });
        }
        const loc = lookupZip(zip);
        const base = { title, date, time: time || 'TBD', location: location || 'TBD', host: host || 'Community', description: description || '' };
        let { data, error } = await supabase
          .from('events')
          .update({ ...base, zip: loc ? loc.zip : '', lat: loc ? loc.lat : null, lng: loc ? loc.lng : null })
          .eq('id', id).select().single();
        if (error && /zip|lat|lng|column/i.test(error.message || '')) {
          ({ data, error } = await supabase.from('events').update(base).eq('id', id).select().single());
        }
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
        return res.status(200).json({ success: true, messages: await applyThreadClears(me, data || []) });
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

    // Delete a whole conversation from the signed-in member's own view
    if (delType === 'thread') {
      const { business_id, member_user_id } = req.body || {};
      const me = String(auth.user.id);
      if (!business_id || !member_user_id) return res.status(400).json({ error: 'Conversation required.' });
      // Allowed for the member in the conversation, or the owner of the business
      const isMember = String(member_user_id) === me;
      if (!isMember && !(await ownsBusiness(auth.user.id, business_id))) {
        return res.status(403).json({ error: 'You can only delete your own conversations.' });
      }
      try {
        const { data: rows, error: readErr } = await supabase
          .from('messages').select('created_at, member_user_id, from_user_id, from_role').eq('business_id', business_id).limit(1000);
        if (readErr) throw readErr;
        const mine = (rows || []).filter(m => threadMember(m) === String(member_user_id));
        if (!mine.length) return res.status(200).json({ success: true });
        const latest = mine.reduce((a, m) => (new Date(m.created_at) > new Date(a) ? m.created_at : a), mine[0].created_at);
        const { error } = await supabase.from('thread_clears')
          .upsert([{ user_id: me, business_id: String(business_id), member_user_id: String(member_user_id), cleared_at: new Date(latest).toISOString() }],
                  { onConflict: 'user_id,business_id,member_user_id' });
        if (error) throw error;
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('delete thread error:', err.message);
        return res.status(500).json({ error: 'The conversation could not be deleted. Please try again.' });
      }
    }

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
