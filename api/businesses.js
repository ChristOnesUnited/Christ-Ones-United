const supabase = require('./supabase');
const { lookupZip, distanceMiles, cleanServiceType, cleanRadius, DEFAULT_STOREFRONT_RADIUS } = require('./_lib/geo');
const { findOrCreateChurch } = require('./_lib/church-store');

// Resolves church_id: uses the picked church, or finds/creates one from name + church ZIP.
async function resolveChurchId(church_id, church, churchZip) {
  if (church_id) {
    const { data } = await supabase.from('churches').select('id, name').eq('id', church_id).single();
    if (data) return data;
    return null; // unknown id — caller drops it rather than saving a broken link
  }
  if (church && churchZip) {
    try { return await findOrCreateChurch(church, churchZip); } catch (e) { return null; }
  }
  return null;
}

// Fields a business owner may change on their own listing
const EDITABLE_FIELDS = ['name', 'category', 'description', 'address', 'zip', 'phone', 'email', 'website', 'facebook', 'linkedin', 'hours', 'tags', 'church', 'church_address', 'church_id', 'service_type', 'service_radius'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET
  if (req.method === 'GET') {
    try {
      const user_id = req.query && req.query.user_id;
      const approved = req.query && req.query.approved;

      console.log(`GET businesses - user_id: ${user_id}, approved: ${approved}`);

      let query = supabase.from('businesses').select('*');

      if (user_id) {
        // Return ALL listings for this user regardless of approval status
        query = query.eq('user_id', user_id);
      } else if (approved === 'false') {
        query = query.eq('approved', false);
      } else {
        query = query.eq('approved', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Businesses query error:', error.message, error.code, error.hint);
        throw error;
      }
      
      console.log(`Businesses found: ${data ? data.length : 0}`);
      // Owner ids are only returned when looking up a specific owner's own listings
      const rows = (data || []).map(b => { if (user_id) return b; const { user_id: _omit, ...rest } = b; return rest; });

      // Optional viewer location (?zip=80202 or ?lat=..&lng=..): add distance and whether
      // the business serves that spot. The viewer's location is not stored.
      let here = null;
      const qLat = parseFloat(req.query && req.query.lat), qLng = parseFloat(req.query && req.query.lng);
      if (!isNaN(qLat) && !isNaN(qLng) && Math.abs(qLat) <= 90 && Math.abs(qLng) <= 180) here = { lat: qLat, lng: qLng };
      else if (req.query && req.query.zip) here = lookupZip(req.query.zip);
      if (here) {
        rows.forEach(b => {
          const d = distanceMiles(here.lat, here.lng, b.lat, b.lng);
          b.distance_mi = d === null ? null : Math.round(d * 10) / 10;
          const type = b.service_type || 'storefront';
          const radius = b.service_radius || DEFAULT_STOREFRONT_RADIUS;
          b.serves_area = type !== 'national' && d !== null && d <= radius;
        });
      }
      return res.status(200).json({ success: true, businesses: rows });
    } catch (err) {
      console.error('GET businesses error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create listing
  if (req.method === 'POST') {
    const { user_id, name, category, description, church, church_address, church_id, address, zip, phone, email, website, facebook, linkedin, hours, tags, featured } = req.body;
    if (!name || !category || !description || !church || !address || !phone || !email) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
      const serviceType = cleanServiceType(req.body.service_type);
      const loc = lookupZip(zip);
      const ch = await resolveChurchId(church_id, church, church_address);
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ user_id, name, category, description, church: ch ? ch.name : church, church_address: church_address || '', church_id: ch ? ch.id : null, address, zip: zip || '', lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, service_type: serviceType, service_radius: cleanRadius(req.body.service_radius, serviceType), phone, email, website: website || '', facebook: facebook || '', linkedin: linkedin || '', hours: hours || {}, tags: tags || '', featured: featured || false, approved: false, verified: false, views: 0 }])
        .select().single();
      if (error) throw error;
      return res.status(200).json({ success: true, business: data });
    } catch (err) {
      console.error('POST businesses error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — owner updates their own listing (approval/featured flags can only be changed by admin)
  if (req.method === 'PUT') {
    const { id, user_id } = req.body;
    if (!id) return res.status(400).json({ error: 'Business ID required.' });
    try {
      const { data: current, error: curErr } = await supabase
        .from('businesses').select('id, user_id, service_type, church, church_address').eq('id', id).single();
      if (curErr || !current) return res.status(404).json({ error: 'Listing not found.' });
      if (current.user_id && current.user_id !== user_id) {
        return res.status(403).json({ error: 'You can only edit your own listing.' });
      }

      const updates = {};
      EDITABLE_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      if (updates.zip !== undefined) {
        const loc = lookupZip(updates.zip);
        updates.lat = loc ? loc.lat : null;
        updates.lng = loc ? loc.lng : null;
      }
      if (updates.service_type !== undefined || updates.service_radius !== undefined) {
        const t = cleanServiceType(updates.service_type || current.service_type);
        updates.service_type = t;
        updates.service_radius = cleanRadius(updates.service_radius, t);
      }
      if (updates.church_id !== undefined || updates.church !== undefined) {
        const ch = await resolveChurchId(updates.church_id, updates.church || current.church, updates.church_address || current.church_address);
        if (ch) { updates.church_id = ch.id; updates.church = ch.name; }
        else if (updates.church_id) return res.status(400).json({ error: 'That church could not be found. Please pick it again.' });
      }

      const { data, error } = await supabase
        .from('businesses').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json({ success: true, business: data });
    } catch (err) {
      console.error('PUT businesses error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
