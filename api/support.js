const supabase = require('./supabase');
const { requireMember } = require('./_lib/memberAuth');
const { sendEmail, esc, brandedEmail } = require('./_lib/email');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@christonesunited.com';
const TOPICS = ['Account & membership', 'Billing', 'My business listing', 'Report a problem', 'Something is not working', 'Other'];

// A signed-in member sends a message to support. Who they are comes from their sign-in,
// not from the form, so the team always sees the real name, email and account type.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireMember(req, res); if (!auth) return;
  const me = auth.user;

  const topic = TOPICS.includes(req.body && req.body.topic) ? req.body.topic : 'Other';
  const message = String((req.body && req.body.message) || '').trim();
  if (message.length < 5) return res.status(400).json({ error: 'Please tell us a little more about how we can help.' });
  if (message.length > 3000) return res.status(400).json({ error: 'That message is too long. Please shorten it to under 3,000 characters.' });

  try {
    let bizName = '';
    if (me.type === 'business') {
      const { data: biz } = await supabase.from('businesses').select('name').eq('user_id', me.id).limit(1);
      if (biz && biz[0]) bizName = biz[0].name || '';
    }
    const typeLabel = me.type === 'business' ? 'Business' + (bizName ? ' (' + bizName + ')' : '') : 'Individual member';

    const row = (k, v) => '<tr><td style="padding:3px 14px 3px 0;color:#8a8070;white-space:nowrap;">' + k + '</td><td style="padding:3px 0;color:#2b2a27;">' + v + '</td></tr>';
    const toSupport = await sendEmail({
      to: SUPPORT_EMAIL,
      replyTo: me.email,
      subject: '[Support] ' + topic + ' - ' + (me.name || me.email),
      html: brandedEmail({
        title: 'New support message',
        bodyHtml:
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;margin:0 0 16px 0;">' +
            row('Name', esc(me.name || '')) + row('Email', esc(me.email || '')) + row('Account', esc(typeLabel)) + row('Topic', esc(topic)) +
          '</table>' +
          '<div style="background:#faf7f1;border-radius:8px;padding:14px 16px;white-space:pre-line;">' + esc(message) + '</div>' +
          '<p style="font-size:12px;color:#8a8070;margin:14px 0 0 0;">Reply to this email to answer them directly.</p>',
      }),
    });
    if (!toSupport.ok) return res.status(502).json({ error: 'We could not send your message right now. Please try again in a few minutes.' });

    // Confirmation copy for the member (best effort)
    await sendEmail({
      to: me.email,
      replyTo: SUPPORT_EMAIL,
      subject: 'We got your message',
      html: brandedEmail({
        title: 'We got your message',
        bodyHtml:
          '<p style="margin:0 0 12px 0;">Thanks' + (me.name ? ', ' + esc(me.name) : '') + '. Your message reached our team and we will reply by email.</p>' +
          '<p style="margin:0 0 6px 0;font-size:13px;color:#8a8070;">Here is a copy of what you sent (' + esc(topic) + '):</p>' +
          '<div style="background:#faf7f1;border-radius:8px;padding:14px 16px;white-space:pre-line;">' + esc(message) + '</div>' +
          '<p style="font-size:12px;color:#8a8070;margin:14px 0 0 0;">Don&#8217;t see our reply? Check your spam or junk folder and mark us as not spam.</p>',
      }),
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Support message error:', err.message);
    return res.status(500).json({ error: 'We could not send your message right now. Please try again in a few minutes.' });
  }
};
