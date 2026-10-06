const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/testimonials?business_id=xxx
  if (req.method === 'GET') {
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id is required.' });

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, author_name, text, created_at')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, testimonials: data });
  }

  // POST /api/testimonials  { business_id, author_name, text }
  if (req.method === 'POST') {
    const { business_id, author_name, text } = req.body;
    if (!business_id || !text) return res.status(400).json({ error: 'business_id and text are required.' });
    if (text.trim().length < 5) return res.status(400).json({ error: 'Testimonial is too short.' });

    const { data, error } = await supabase
      .from('testimonials')
      .insert([{ business_id, author_name: author_name || 'Member', text: text.trim() }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, testimonial: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
