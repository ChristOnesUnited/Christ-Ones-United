const supabase = require('./supabase');
const { requireMember } = require('./_lib/memberAuth');
const { checkToken } = require('./_lib/newsletter-email');

function page(res, status, title, text) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(status).send('<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>' + title + '</title></head>' +
    '<body style="margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:440px;margin:60px auto;background:#fff;border-radius:14px;overflow:hidden;">' +
    '<div style="background:#1a1a2e;color:#fff;text-align:center;padding:22px;font-family:Georgia,serif;font-size:20px;">Christ One&#8217;s United</div>' +
    '<div style="padding:28px;color:#2b2a27;line-height:1.6;"><h2 style="margin:0 0 10px;font-family:Georgia,serif;font-weight:normal;color:#1a1a2e;">' + title + '</h2><p style="margin:0;">' + text + '</p>' +
    '<p style="margin:18px 0 0;"><a href="https://app.christonesunited.com" style="color:#8a6a1f;">Back to Christ One&#8217;s United</a></p></div></div></body></html>');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};

  // Unsubscribe: the link in every newsletter (GET) or the mail app's one-tap button (POST)
  if (q.unsubscribe) {
    let email = '';
    try { email = Buffer.from(String(q.e || ''), 'base64url').toString('utf8').toLowerCase(); } catch (e) {}
    const isPost = req.method === 'POST';
    if (!email || !checkToken(email, q.t)) {
      return isPost ? res.status(400).json({ error: 'Invalid link.' }) : page(res, 400, 'This link is not valid', 'The unsubscribe link looks incomplete. Please use the link from the newest newsletter, or email support@christonesunited.com.');
    }
    try {
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from('newsletter_subscribers').select('id').eq('email', email).single();
      if (existing) {
        const { error } = await supabase.from('newsletter_subscribers').update({ unsubscribed: true, unsubscribed_at: now }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('newsletter_subscribers').insert([{ email, name: '', subscribed_at: now, unsubscribed: true, unsubscribed_at: now }]);
        if (error) throw error;
      }
      return isPost ? res.status(200).json({ success: true }) : page(res, 200, 'You’re unsubscribed', 'We’ve removed ' + email.replace(/[<>&"]/g, '') + ' from the weekly newsletter. You will not receive it anymore.');
    } catch (err) {
      console.error('Unsubscribe error:', err.message);
      return isPost ? res.status(500).json({ error: 'Could not unsubscribe.' }) : page(res, 500, 'Something went wrong', 'We couldn’t finish that. Please try again, or email support@christonesunited.com.');
    }
  }

  // Latest sent edition, for "Read This Week's Edition" in the app (signed-in members)
  if (req.method === 'GET') {
    const auth = await requireMember(req, res); if (!auth) return;
    const { data, error } = await supabase.from('newsletters')
      .select('id, subject, content, sent_at').order('sent_at', { ascending: false }).limit(1);
    if (error) return res.status(200).json({ success: true, edition: null });
    return res.status(200).json({ success: true, edition: (data && data[0]) || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    // Already on the list (subscribed or previously unsubscribed): leave as is
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(200).json({ success: true, message: 'Already subscribed!' });
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: email.toLowerCase().trim(),
        name: name || '',
        subscribed_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, subscriber: data });

  } catch (err) {
    console.error('Newsletter subscribe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
