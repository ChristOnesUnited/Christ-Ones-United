const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET
  if (req.method === 'GET') {
    try {
      const user_id = req.query && req.query.user_id;
      const approved = req.query && req.query.approved;

      let query = supabase.from('businesses').select('*');

      if (user_id) {
        // User's own listings (any status)
        query = query.eq('user_id', user_id);
      } else if (approved === 'false') {
        // Admin pending queue
        query = query.eq('approved', false);
      } else {
        // Public directory
        query = query.eq('approved', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, businesses: data || [] });
    } catch (err) {
      console.error('GET businesses error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create listing
  if (req.method === 'POST') {
    const { user_id, name, category, description, church, church_address, address, zip, phone, email, website, facebook, linkedin, hours, tags, featured } = req.body;
    if (!name || !category || !description || !church || !address || !phone || !email) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ user_id, name, category, description, church, church_address: church_address || '', address, zip: zip || '', phone, email, website: website || '', facebook: facebook || '', linkedin: linkedin || '', hours: hours || {}, tags: tags || '', featured: featured || false, approved: false, verified: false, views: 0 }])
        .select().single();
      if (error) throw error;
      return res.status(200).json({ success: true, business: data });
    } catch (err) {
      console.error('POST businesses error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — update listing
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'Business ID required.' });
    try {
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
