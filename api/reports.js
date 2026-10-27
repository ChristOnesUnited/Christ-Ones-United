const supabase = require('./supabase');
const { sendEmail, esc } = require('./_lib/email');

// Members report a job posting. Saved to the "reports" table (shows up in the admin
// Reports tab) and an alert email is sent to ADMIN_ALERT_EMAIL.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { job_id, reporter_id } = req.body || {};
  if (!job_id)      return res.status(400).json({ error: 'Job ID required.' });
  if (!reporter_id) return res.status(400).json({ error: 'Please sign in to report a posting.' });

  try {
    // Reporter must be a real member
    const { data: reporter } = await supabase
      .from('users').select('id, name, email').eq('id', reporter_id).single();
    if (!reporter) return res.status(403).json({ error: 'Please sign in to report a posting.' });

    // Look the job up on the server so the report can't be filled with made-up details
    const { data: job } = await supabase
      .from('jobs').select('id, title, company, description').eq('id', job_id).single();
    if (!job) return res.status(404).json({ error: 'That job posting could not be found.' });

    // Same member reporting the same posting twice: accept quietly, don't duplicate
    const { data: existing } = await supabase
      .from('reports').select('id')
      .eq('content_type', 'job').eq('content_id', String(job.id))
      .eq('reporter_user_id', String(reporter.id)).eq('status', 'open').limit(1);
    if (existing && existing.length) return res.status(200).json({ success: true, duplicate: true });

    const { error } = await supabase.from('reports').insert([{
      content_type: 'job',
      content_id: String(job.id),
      content_title: job.title || '',
      content_company: job.company || '',
      content_snippet: (job.description || '').slice(0, 300),
      reporter_user_id: String(reporter.id),
      reporter_name: reporter.name || '',
      reporter_email: reporter.email || '',
    }]);
    if (error) throw error;

    // Alert email (best effort: the report is already saved either way)
    const site = process.env.SITE_URL || 'https://christonesunited.org';
    await sendEmail({
      to: process.env.ADMIN_ALERT_EMAIL,
      subject: 'Job posting reported: ' + (job.title || 'Untitled'),
      html:
        '<p>A member reported a job posting on Christ One\'s United.</p>' +
        '<p><strong>Job:</strong> ' + esc(job.title) + '<br/>' +
        '<strong>Company:</strong> ' + esc(job.company) + '<br/>' +
        '<strong>Reported by:</strong> ' + esc(reporter.name) + ' (' + esc(reporter.email) + ')</p>' +
        '<p>Review it in the Admin panel under <strong>Reports</strong>: <a href="' + esc(site) + '">' + esc(site) + '</a></p>',
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Report error:', err.message);
    return res.status(500).json({ error: 'Could not submit the report. Please try again.' });
  }
};
