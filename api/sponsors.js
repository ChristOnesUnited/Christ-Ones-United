const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch all active sponsors within date range (public)
  if (req.method === 'GET') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('order_position', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ success: true, sponsors: data || [] });

    } catch (err) {
      console.error('Get sponsors error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Admin-only routes below — require admin key
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // POST — create new sponsor
  if (req.method === 'POST') {
    const { name, tagline, logo_url, link_url, duration_seconds, start_date, end_date, order_position } = req.body;
    if (!name || !tagline || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .insert([{
          name,
          tagline,
          logo_url: logo_url || '',
          link_url: link_url || '',
          duration_seconds: duration_seconds || 8,
          start_date,
          end_date,
          active: true,
          order_position: order_position || 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, sponsor: data });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — update sponsor
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'Sponsor ID required.' });
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, sponsor: data });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — remove sponsor
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Sponsor ID required.' });
    try {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET ALL — admin fetch all sponsors regardless of date/active status
  if (req.method === 'GET' && req.query.all === 'true') {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ success: true, sponsors: data || [] });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
