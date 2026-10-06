const supabase = require('./supabase');
const { lookupZip, cleanZip, normalizeChurchName } = require('./_lib/geo');
const { findOrCreateChurch } = require('./_lib/church-store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Simple admin key check
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { action } = req.body || req.query;

  try {

    // Verify admin key (used for login check)
    if (action === 'verify') {
      return res.status(200).json({ success: true });
    }

    // Get all pending businesses
    if (action === 'get_pending') {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, businesses: data });
    }

    // Approve a business
    if (action === 'approve_business') {
      const { business_id } = req.body;
      const { data, error } = await supabase
        .from('businesses')
        .update({ approved: true, verified: true })
        .eq('id', business_id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, business: data });
    }

    // Reject a business
    if (action === 'reject_business') {
      const { business_id } = req.body;
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', business_id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // Get all members
    if (action === 'get_members') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, members: data });
    }

    // Suspend a member
    if (action === 'suspend_member') {
      const { user_id } = req.body;
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'suspended' })
        .eq('id', user_id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, user: data });
    }

    // Restore a member
    if (action === 'restore_member') {
      const { user_id } = req.body;
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', user_id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, user: data });
    }

    // Remove a job listing
    if (action === 'remove_job') {
      const { job_id } = req.body;
      const { error } = await supabase
        .from('jobs')
        .update({ active: false })
        .eq('id', job_id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── CHURCHES ─────────────────────────────────────────────
    // List churches with how many members and businesses are linked to each
    if (action === 'get_churches') {
      const [{ data: churches, error: cErr }, { data: users, error: uErr }, { data: bizs, error: bErr }] = await Promise.all([
        supabase.from('churches').select('id, name, city, state, zip, created_at').order('name'),
        supabase.from('users').select('church, church_id'),
        supabase.from('businesses').select('church, church_id, zip, lat'),
      ]);
      if (cErr) throw cErr; if (uErr) throw uErr; if (bErr) throw bErr;
      const counts = {};
      (users || []).forEach(u => { if (u.church_id) { counts[u.church_id] = counts[u.church_id] || { members: 0, businesses: 0 }; counts[u.church_id].members++; } });
      (bizs || []).forEach(b => { if (b.church_id) { counts[b.church_id] = counts[b.church_id] || { members: 0, businesses: 0 }; counts[b.church_id].businesses++; } });
      const list = (churches || []).map(c => Object.assign({}, c, counts[c.id] || { members: 0, businesses: 0 }));
      const pending = {
        members_unlinked: (users || []).filter(u => u.church && !u.church_id).length,
        businesses_unlinked: (bizs || []).filter(b => b.church && !b.church_id).length,
        businesses_no_location: (bizs || []).filter(b => b.zip && (b.lat === null || b.lat === undefined)).length,
      };
      return res.status(200).json({ success: true, churches: list, pending });
    }

    // Merge duplicates: everyone linked to merge_ids moves to keep_id, then the duplicates are deleted
    if (action === 'merge_churches') {
      const { keep_id, merge_ids } = req.body;
      const ids = (merge_ids || []).filter(id => id && id !== keep_id);
      if (!keep_id || !ids.length) return res.status(400).json({ error: 'Pick the church to keep and at least one duplicate.' });
      const { data: keep, error: kErr } = await supabase.from('churches').select('id, name').eq('id', keep_id).single();
      if (kErr || !keep) return res.status(404).json({ error: 'Church to keep was not found.' });
      const { error: e1 } = await supabase.from('users').update({ church_id: keep.id, church: keep.name }).in('church_id', ids);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('businesses').update({ church_id: keep.id, church: keep.name }).in('church_id', ids);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('churches').delete().in('id', ids);
      if (e3) throw e3;
      return res.status(200).json({ success: true, merged: ids.length });
    }

    // Rename a church (also updates the name shown on linked members and businesses)
    if (action === 'rename_church') {
      const { church_id, name } = req.body;
      const clean = String(name || '').trim().replace(/\s+/g, ' ');
      if (!church_id || !clean) return res.status(400).json({ error: 'Church and new name are required.' });
      const { error: e1 } = await supabase.from('churches').update({ name: clean, name_key: normalizeChurchName(clean) }).eq('id', church_id);
      if (e1) {
        if (e1.code === '23505') return res.status(400).json({ error: 'A church with that name already exists in this ZIP code. Use Merge instead.' });
        throw e1;
      }
      const { error: e2 } = await supabase.from('users').update({ church: clean }).eq('church_id', church_id);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('businesses').update({ church: clean }).eq('church_id', church_id);
      if (e3) throw e3;
      return res.status(200).json({ success: true });
    }

    // One-time (safe to re-run) cleanup: link typed church names to church records,
    // add map coordinates from ZIP codes, and default missing service types.
    if (action === 'run_location_cleanup') {
      const summary = { businesses_located: 0, businesses_linked: 0, members_located: 0, members_linked: 0, needs_review: [] };

      const { data: bizs, error: bErr } = await supabase
        .from('businesses').select('id, name, church, church_id, church_address, zip, lat, service_type');
      if (bErr) throw bErr;
      // Businesses run one at a time so two listings with the same new church don't both create it
      for (const b of bizs || []) {
        const upd = {};
        if (b.zip && (b.lat === null || b.lat === undefined)) {
          const loc = lookupZip(b.zip);
          if (loc) { upd.lat = loc.lat; upd.lng = loc.lng; summary.businesses_located++; }
        }
        if (!b.service_type) { upd.service_type = 'storefront'; upd.service_radius = 25; }
        if (b.church && !b.church_id) {
          const churchZip = cleanZip(b.church_address) || cleanZip(b.zip);
          try {
            const ch = await findOrCreateChurch(b.church, churchZip);
            upd.church_id = ch.id; upd.church = ch.name; summary.businesses_linked++;
          } catch (e) {
            summary.needs_review.push('Business "' + b.name + '": church "' + b.church + '" has no valid ZIP');
          }
        }
        if (Object.keys(upd).length) {
          const { error } = await supabase.from('businesses').update(upd).eq('id', b.id);
          if (error) throw error;
        }
      }

      // Members: link only when exactly one church has a matching name
      const { data: churches, error: cErr } = await supabase.from('churches').select('id, name, name_key');
      if (cErr) throw cErr;
      const byKey = {};
      (churches || []).forEach(c => { (byKey[c.name_key] = byKey[c.name_key] || []).push(c); });

      const { data: users, error: uErr } = await supabase.from('users').select('id, name, church, church_id, zip, lat');
      if (uErr) throw uErr;
      const memberJobs = [];
      for (const u of users || []) {
        const upd = {};
        if (u.zip && (u.lat === null || u.lat === undefined)) {
          const loc = lookupZip(u.zip);
          if (loc) { upd.lat = loc.lat; upd.lng = loc.lng; summary.members_located++; }
        }
        if (u.church && !u.church_id) {
          const matches = byKey[normalizeChurchName(u.church)] || [];
          if (matches.length === 1) { upd.church_id = matches[0].id; upd.church = matches[0].name; summary.members_linked++; }
          else summary.needs_review.push('Member "' + u.name + '": church "' + u.church + '" — ' + (matches.length ? 'more than one match' : 'no match yet') + ' (they will be asked to pick it)');
        }
        if (Object.keys(upd).length) memberJobs.push({ id: u.id, upd });
      }
      for (let i = 0; i < memberJobs.length; i += 10) {
        const results = await Promise.all(memberJobs.slice(i, i + 10).map(j => supabase.from('users').update(j.upd).eq('id', j.id)));
        const failed = results.find(r => r.error);
        if (failed) throw failed.error;
      }
      return res.status(200).json({ success: true, summary });
    }

    return res.status(400).json({ error: 'Unknown action.' });

  } catch (err) {
    console.error('Admin error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
