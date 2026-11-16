// Shared newsletter helpers: build an edition's content, render it as an email, and
// make/check the personal unsubscribe links.
const crypto = require('crypto');
const { esc, brandedEmail } = require('./email');
const { isOurImage, parseVideo } = require('./media');

const APP_URL = (process.env.APP_URL || 'https://app.christonesunited.com').replace(/\/+$/, '');

function secret() { return process.env.NEWSLETTER_SECRET || process.env.SUPABASE_SERVICE_KEY || 'dev-secret'; }
function tokenFor(email) {
  return crypto.createHmac('sha256', secret()).update(String(email || '').toLowerCase()).digest('hex');
}
function checkToken(email, token) {
  try {
    const a = Buffer.from(tokenFor(email), 'hex'), b = Buffer.from(String(token || ''), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}
function unsubscribeUrl(email) {
  return APP_URL + '/api/newsletter?unsubscribe=1&e=' + encodeURIComponent(Buffer.from(String(email).toLowerCase()).toString('base64url')) + '&t=' + tokenFor(email);
}

// Collects what goes into an edition. `input` is what the admin typed; the rest is read live.
async function buildContent(supabase, input) {
  input = input || {};
  const content = {
    image: isOurImage(input.image_url) ? String(input.image_url) : '',
    video: parseVideo(input.video_url),
    headline: String(input.headline || '').trim(),
    message: String(input.message || '').trim(),
    prayer: String(input.prayer || '').trim(),
    featured: null,
    newBizCount: 0,
    events: [],
  };
  if (input.business_id) {
    const { data: b } = await supabase.from('businesses')
      .select('id, name, category, address, description, approved').eq('id', input.business_id).single();
    if (b && b.approved) {
      content.featured = { id: b.id, name: b.name, category: b.category || '', address: b.address || '', blurb: String(b.description || '').slice(0, 200) };
    }
  }
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: nb } = await supabase.from('businesses').select('id').eq('approved', true).gte('created_at', weekAgo);
  content.newBizCount = (nb || []).length;
  const today = new Date().toISOString().slice(0, 10);
  const ids = Array.isArray(input.event_ids) ? input.event_ids.map(String).filter(Boolean).slice(0, 5) : [];
  let ev;
  if (ids.length) {
    // The admin picked specific events
    ({ data: ev } = await supabase.from('events').select('id, title, date, time, location').in('id', ids).order('date', { ascending: true }));
  } else {
    // Default: the next three upcoming events
    ({ data: ev } = await supabase.from('events').select('title, date, time, location').gte('date', today).order('date', { ascending: true }).limit(3));
  }
  content.events = (ev || []).map(e => ({ title: e.title, date: String(e.date || '').slice(0, 10), time: e.time || '', location: e.location || '' }));
  return content;
}

function fmtDate(d) {
  // The events table may hand back a plain date or a full timestamp; only the day part is used
  const day = String(d || '').slice(0, 10);
  const dt = new Date(day + 'T12:00:00');
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Renders one edition as a full email. `email` (optional) personalises the unsubscribe link.
function renderEmail(subject, content, email) {
  const card = (bg, border, label, labelColor, inner) =>
    '<div style="background:' + bg + ';border-radius:10px;padding:14px 16px;margin:0 0 16px 0;' + (border ? 'border-left:3px solid ' + border + ';' : '') + '">' +
    '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:' + labelColor + ';margin-bottom:6px;">' + label + '</div>' + inner + '</div>';
  let body = '';
  if (content.image) {
    body += '<img src="' + esc(content.image) + '" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;margin:0 auto 18px auto;" />';
  }
  if (content.message) body += '<p style="margin:0 0 18px 0;white-space:pre-line;">' + esc(content.message) + '</p>';
  if (content.video) {
    const v = content.video;
    body += '<div style="margin:0 0 18px 0;text-align:center;">' +
      (v.thumb ? '<a href="' + esc(v.url) + '"><img src="' + esc(v.thumb) + '" alt="Watch the video" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;margin:0 auto 8px auto;" /></a>' : '') +
      '<a href="' + esc(v.url) + '" style="display:inline-block;padding:10px 20px;background:#1a1a2e;color:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;">&#9654; Watch the video</a></div>';
  }
  if (content.featured) {
    const f = content.featured;
    body += card('#fdf6e7', '#c9973a', '&#11088; Featured Business', '#8a6a1f',
      '<div style="font-family:Georgia,serif;font-size:17px;color:#1a1a2e;">' + esc(f.name) + '</div>' +
      '<div style="font-size:13px;color:#6b6558;margin:2px 0 6px 0;">' + esc(f.category) + (f.address ? ' &middot; ' + esc(f.address) : '') + '</div>' +
      (f.blurb ? '<div style="font-size:14px;">' + esc(f.blurb) + (f.blurb.length >= 200 ? '&hellip;' : '') + '</div>' : ''));
  }
  if (content.prayer) {
    body += card('#f6f1fb', '#7c3aed', '&#128591; Prayer Highlight', '#6d28d9',
      '<div style="font-size:14px;font-style:italic;white-space:pre-line;">' + esc(content.prayer) + '</div>');
  }
  if (content.events && content.events.length) {
    body += card('#e8f3ee', '', '&#128197; Upcoming Events', '#1a6b4a',
      content.events.map(e =>
        '<div style="margin:0 0 8px 0;"><div style="font-family:Georgia,serif;font-size:15px;color:#1a1a2e;">' + esc(e.title) + '</div>' +
        '<div style="font-size:13px;color:#4d4a42;">' + esc(fmtDate(e.date)) + (e.time ? ' &middot; ' + esc(e.time) : '') + '</div>' +
        (e.location ? '<div style="font-size:13px;color:#1a6b4a;">&#128205; ' + esc(e.location) + '</div>' : '') + '</div>').join(''));
  }
  body += '<p style="margin:0 0 18px 0;font-size:14px;color:#4d4a42;">' +
    (content.newBizCount > 0
      ? '<strong>' + content.newBizCount + ' new business' + (content.newBizCount === 1 ? '' : 'es') + '</strong> joined the directory this week.'
      : 'The directory is full of great Christian-owned businesses &mdash; take a look and connect with someone new.') + '</p>';
  body += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 18px auto;"><tr><td style="background:#c9973a;border-radius:8px;">' +
    '<a href="' + APP_URL + '" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1a1a2e;text-decoration:none;">Open Christ One&#8217;s United</a></td></tr></table>';
  body += '<p style="margin:0;font-size:13px;font-style:italic;color:#6b6558;text-align:center;">&ldquo;For where two or three gather in my name, there am I with them.&rdquo; &mdash; Matthew 18:20</p>';

  const footer = '<div style="margin-top:12px;font-size:11px;color:#9a9080;">You receive this because you are a Christ One&#8217;s United member.<br/>' +
    'Not seeing our emails? Check your spam or junk folder and mark us as not spam.<br/>' +
    (email ? '<a href="' + esc(unsubscribeUrl(email)) + '" style="color:#8a6a1f;">Unsubscribe</a>' : '<span style="color:#8a6a1f;">Unsubscribe</span>') +
    '<br/>Christ One&#8217;s United LLC &middot; PO Box 90, Pine, CO 80470</div>';
  return brandedEmail({ title: content.headline || subject, bodyHtml: body, footerHtml: footer });
}

module.exports = { APP_URL, tokenFor, checkToken, unsubscribeUrl, buildContent, renderEmail };
