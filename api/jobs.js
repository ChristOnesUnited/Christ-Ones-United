const supabase = require('./supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch all active jobs
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, businesses(name, category)`)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, jobs: data });

    } catch (err) {
      console.error('Get jobs error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — create a new job posting
  if (req.method === 'POST') {
    const {
      business_id, title, type, category, location,
      zip, pay, description, faith_note, apply_method, apply_contact
    } = req.body;

    if (!title || !type || !location || !description) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([{
          business_id,
          title,
          type,
          category: category || '',
          location,
          zip: zip || '',
          pay: pay || '',
          description,
          faith_note: faith_note || '',
          apply_method: apply_method || 'email',
          apply_contact: apply_contact || '',
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

  // PUT — close a job listing
  if (req.method === 'PUT') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Job ID required.' });

    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ active: false })
        .eq('id', id)
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
