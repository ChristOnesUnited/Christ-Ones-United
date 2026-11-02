// Admin sign-in: email + password, then an authenticator-app code.
//
//   login    -> checks the password and that the account is a listed admin.
//               Tells the page what comes next: "verify" (enter code), "enroll" (first-time setup)
//               or "none" (only while ADMIN_REQUIRE_MFA=false).
//   enroll   -> first-time authenticator setup: returns a QR code + secret.
//   verify   -> checks the 6-digit code and returns a fully verified session.
//   refresh  -> keeps a verified session alive while the admin page stays open.
//   logout   -> ends the session.
//
// This route is only used by the admin page on its own address (same site, so no CORS headers).

const { createClient } = require('@supabase/supabase-js');
const supabase = require('./supabase');
const { mfaRequired } = require('./_lib/adminAuth');

function authClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

async function adminRow(userId) {
  const { data, error } = await supabase
    .from('admins').select('user_id, email, active').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data && data.active ? data : null;
}

// Re-open a session from the tokens the page holds, and confirm it still belongs to an admin
async function openSession(access, refresh) {
  if (typeof access !== 'string' || typeof refresh !== 'string' || !access || !refresh) {
    fail(401, 'Session expired. Please sign in again.');
  }
  const client = authClient();
  const { data, error } = await client.auth.setSession({ access_token: access, refresh_token: refresh });
  if (error || !data || !data.session || !data.user) fail(401, 'Session expired. Please sign in again.');
  const admin = await adminRow(data.user.id);
  if (!admin) fail(403, 'This account does not have admin access.');
  return { client, session: data.session, user: data.user, admin };
}

async function factorLists(client) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return { verified: (data && data.totp) || [], all: (data && data.all) || [] };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const action = body.action;

  try {

    // ── Step 1: email + password ──────────────────────────────
    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const bad = { error: 'Invalid credentials. Please try again.' };
      if (!email || !password || email.length > 254 || password.length > 200) return res.status(401).json(bad);

      const client = authClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data || !data.session || !data.user) return res.status(401).json(bad);

      const admin = await adminRow(data.user.id);
      if (!admin) {
        // A valid login that is not an admin gets the same answer as a wrong password
        try { await supabase.auth.admin.signOut(data.session.access_token); } catch (e) { /* ignore */ }
        return res.status(401).json(bad);
      }

      const tokens = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        email: admin.email,
      };
      if (!mfaRequired()) return res.status(200).json({ success: true, step: 'none', ...tokens });

      const f = await factorLists(client);
      if (f.verified.length) {
        return res.status(200).json({ success: true, step: 'verify', factor_id: f.verified[0].id, ...tokens });
      }
      return res.status(200).json({ success: true, step: 'enroll', ...tokens });
    }

    // ── First-time authenticator setup ────────────────────────
    if (action === 'enroll') {
      if (!mfaRequired()) fail(400, 'Two-step verification is turned off.');
      const s = await openSession(body.access_token, body.refresh_token);
      const f = await factorLists(s.client);
      if (f.verified.length) fail(400, 'Two-step verification is already set up. Sign in and enter your code.');

      // Clear out any half-finished earlier attempts so they don't pile up
      for (const old of f.all) {
        if (old.status === 'unverified') {
          try { await s.client.auth.mfa.unenroll({ factorId: old.id }); } catch (e) { /* ignore */ }
        }
      }
      const { data, error } = await s.client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin ' + Date.now(),
        issuer: "Christ One's United",
      });
      if (error || !data || !data.totp) throw error || new Error('Could not start two-step setup.');
      return res.status(200).json({
        success: true,
        factor_id: data.id,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
        access_token: s.session.access_token,
        refresh_token: s.session.refresh_token,
      });
    }

    // ── Check the 6-digit code ────────────────────────────────
    if (action === 'verify') {
      if (!mfaRequired()) fail(400, 'Two-step verification is turned off.');
      const code = String(body.code || '').replace(/\s+/g, '');
      const factorId = String(body.factor_id || '');
      if (!/^\d{6}$/.test(code) || !factorId) fail(400, 'Enter the 6-digit code from your authenticator app.');

      const s = await openSession(body.access_token, body.refresh_token);
      const f = await factorLists(s.client);
      if (!f.all.some(x => x.id === factorId)) fail(400, 'Unknown authenticator. Please sign in again.');

      const wrong = { error: 'That code did not work. Use the newest code from your app.' };
      const ch = await s.client.auth.mfa.challenge({ factorId });
      if (ch.error || !ch.data) return res.status(401).json(wrong);
      const { data, error } = await s.client.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
      if (error || !data) return res.status(401).json(wrong);
      let access = data.access_token;
      let refresh = data.refresh_token;
      if (!access || !refresh) {
        const cur = await s.client.auth.getSession();
        access = cur.data && cur.data.session && cur.data.session.access_token;
        refresh = cur.data && cur.data.session && cur.data.session.refresh_token;
      }
      if (!access || !refresh) throw new Error('Could not start your verified session.');
      return res.status(200).json({ success: true, access_token: access, refresh_token: refresh, email: s.admin.email });
    }

    // ── Keep the session alive ────────────────────────────────
    if (action === 'refresh') {
      const s = await openSession(body.access_token, body.refresh_token);
      const { data, error } = await s.client.auth.refreshSession();
      if (error || !data || !data.session) fail(401, 'Session expired. Please sign in again.');
      return res.status(200).json({
        success: true,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // ── Sign out ──────────────────────────────────────────────
    if (action === 'logout') {
      if (typeof body.access_token === 'string' && body.access_token) {
        try { await supabase.auth.admin.signOut(body.access_token); } catch (e) { /* ignore */ }
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });

  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    console.error('Admin auth error:', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
