// Sends an email through Resend using plain fetch (no extra package needed).
// Never throws: a failed email must not break the action that triggered it.
const FROM = process.env.RESEND_FROM || "Christ One's United <noreply@send.christonesunited.com>";

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn('sendEmail skipped: RESEND_API_KEY is not set.'); return { ok: false, skipped: true }; }
  if (!to)  { console.warn('sendEmail skipped: no recipient.'); return { ok: false, skipped: true }; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
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

module.exports = { sendEmail, esc };
