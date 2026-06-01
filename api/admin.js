const supabase = require('./supabase');

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

    return res.status(400).json({ error: 'Unknown action.' });

  } catch (err) {
    console.error('Admin error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
