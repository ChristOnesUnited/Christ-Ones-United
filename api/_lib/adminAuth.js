// Admin access check, shared by every admin-only API route.
//
// An admin request must carry the signed-in session token of a Supabase login that:
//   1. is a real, unexpired session,
//   2. is listed (and active) in the `admins` table, and
//   3. passed two-step verification (authenticator code) — unless MFA is switched off.
//
// There is no shared password anymore.

const supabase = require('../supabase');

// Two-step verification is required unless ADMIN_REQUIRE_MFA is set to "false".
// (The "false" setting exists only so the first sign-in can be tested before MFA is turned on.)
function mfaRequired() {
  return String(process.env.ADMIN_REQUIRE_MFA || '').trim().toLowerCase() !== 'false';
}

// Read the "aal" claim from an already-verified token (aal2 = passed two-step verification).
function tokenAal(token) {
  try {
    const part = String(token).split('.')[1];
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return payload.aal || 'aal1';
  } catch (e) {
    return null;
  }
}

async function getAdmin(req) {
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = /^Bearer\s+(\S+)$/i.exec(String(header));
  if (!m) return { ok: false, status: 401, error: 'Unauthorized.' };
  const token = m[1];

  // Supabase checks the signature and expiry for us
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data && data.user) user = data.user;
  } catch (e) { /* treated as not signed in */ }
  if (!user) return { ok: false, status: 401, error: 'Session expired. Please sign in again.' };

  const { data: row, error: aErr } = await supabase
    .from('admins').select('user_id, email, active').eq('user_id', user.id).maybeSingle();
  if (aErr) {
    console.error('Admin lookup error:', aErr.message);
    return { ok: false, status: 500, error: 'Could not verify admin access.' };
  }
  if (!row || !row.active) return { ok: false, status: 403, error: 'This account does not have admin access.' };

  if (mfaRequired() && tokenAal(token) !== 'aal2') {
    return { ok: false, status: 401, error: 'Two-step verification required. Please sign in again.' };
  }
  return { ok: true, user, admin: row };
}

// Use at the top of an admin route:  const auth = await requireAdmin(req, res); if (!auth) return;
async function requireAdmin(req, res) {
  const result = await getAdmin(req);
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return null; }
  return result;
}

module.exports = { requireAdmin, getAdmin, mfaRequired, tokenAal };
