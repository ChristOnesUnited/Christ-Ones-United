const supabase = require('./supabase');
const { requireMember, ownsBusiness } = require('./_lib/memberAuth');
const { lookupZip, distanceMiles } = require('./_lib/geo');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch jobs (all active, or by business_id)
  if (req.method === 'GET') {
    try {
      const business_id = req.query && req.query.business_id;
      let query = supabase.from('jobs').select('*').eq('active', true);
      if (business_id) {
        query = query.eq('business_id', business_id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Optional viewer location (?zip=80421 or ?lat=..&lng=..): add distance_mi to each job
      // that has a known ZIP. Jobs with no usable ZIP simply get no distance.
      const qz = req.query && req.query.zip;
      const qLat = parseFloat(req.query && req.query.lat), qLng = parseFloat(req.query && req.query.lng);
      const hasGeo = !isNaN(qLat) && !isNaN(qLng) && Math.abs(qLat) <= 90 && Math.abs(qLng) <= 180;
      const here = hasGeo ? { lat: qLat, lng: qLng } : (qz ? lookupZip(qz) : null);
      const jobs = (data || []).map(j => {
        if (!here) return j;
        const at = lookupZip(j.zip);
        const d = at ? distanceMiles(here.lat, here.lng, at.lat, at.lng) : null;
        return { ...j, distance_mi: d === null ? null : Math.round(d * 10) / 10 };
      });
      return res.status(200).json({ success: true, jobs, located: (qz || hasGeo) ? !!here : undefined });

    } catch (err) {
      console.error('Get jobs error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create a new job posting
  if (req.method === 'POST') {
    const auth = await requireMember(req, res); if (!auth) return;
    const {
      business_id, title, type, category, location,
      zip, pay, description, faith_note, company,
      contact_phone, contact_email
    } = req.body;

    if (!title || !type || !location || !description) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Only the owner of the business can post jobs for it
    if (!(await ownsBusiness(auth.user.id, business_id))) {
      return res.status(403).json({ error: 'You can only post jobs for your own business.' });
    }

    try {
      const jobLoc = lookupZip(zip);
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          business_id,
          title,
          type,
          category: category || '',
          location,
          zip: jobLoc ? jobLoc.zip : (zip || ''),
          pay: pay || '',
          description,
          faith_note: faith_note || '',
          company: company || '',
          contact_phone: contact_phone || '',
          contact_email: contact_email || '',
          active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, job: data });

    } catch (err) {
      console.error('Post job error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — close a job listing (owner only)
  if (req.method === 'PUT') {
    const auth = await requireMember(req, res); if (!auth) return;
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Job ID required.' });

    try {
      // Verify this job belongs to the requesting business before closing it
      const { data: job, error: fetchErr } = await supabase
        .from('jobs')
        .select('id, business_id')
        .eq('id', id)
        .single();

      if (fetchErr || !job) return res.status(404).json({ error: 'Job not found.' });
      if (!(await ownsBusiness(auth.user.id, job.business_id))) {
        return res.status(403).json({ error: 'You do not have permission to close this listing.' });
      }

      const { data, error } = await supabase
        .from('jobs')
        .update({ active: false })
        .eq('id', id)
        .eq('business_id', job.business_id)   // double-lock: matches both id AND owner
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, job: data });

    } catch (err) {
      console.error('Close job error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
