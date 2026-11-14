// Sends an email through Resend using plain fetch (no extra package needed).
// Never throws: a failed email must not break the action that triggered it.
const FROM = process.env.RESEND_FROM || "Christ One's United <noreply@send.christonesunited.com>";

async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('sendEmail skipped: RESEND_API_KEY is not set.'); return { ok: false, skipped: true }; }
  if (!to)  { console.warn('sendEmail skipped: no recipient.'); return { ok: false, skipped: true }; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(
        { from: FROM, to: Array.isArray(to) ? to : [to], subject, html },
        replyTo ? { reply_to: replyTo } : {}
      )),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('sendEmail failed:', err.message);
    return { ok: false };
  }
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Wraps message content in the same branded layout as the password-reset email
// (navy header, gold accent, warm footer). Pass trusted HTML for `bodyHtml`:
// escape any member-supplied text with esc() before putting it in.
function brandedEmail({ title, bodyHtml }) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/>' +
    '<title>' + esc(title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f4efe6;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe6;"><tr><td align="center" style="padding:28px 14px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;">' +
    '<tr><td align="center" style="background:#1a1a2e;padding:26px 24px;">' +
      '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;line-height:1.25;color:#ffffff;">Christ One&#8217;s United</div>' +
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9973a;margin-top:6px;">Faith &middot; Community &middot; Business</div>' +
    '</td></tr>' +
    '<tr><td style="padding:32px 30px 24px 30px;font-family:Arial,Helvetica,sans-serif;color:#2b2a27;font-size:15px;line-height:1.6;">' +
      '<h1 style="margin:0 0 14px 0;font-family:Georgia,\'Times New Roman\',serif;font-size:22px;font-weight:normal;color:#1a1a2e;">' + esc(title) + '</h1>' +
      bodyHtml +
    '</td></tr>' +
    '<tr><td align="center" style="background:#faf7f1;padding:18px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8070;">' +
      'Blessings,<br/>The Christ One&#8217;s United Team<br/>' +
      '<a href="https://app.christonesunited.com" style="color:#8a6a1f;text-decoration:none;">app.christonesunited.com</a>' +
    '</td></tr></table></td></tr></table></body></html>';
}

module.exports = { sendEmail, esc, brandedEmail };
