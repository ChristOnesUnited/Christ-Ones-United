const supabase = require('../supabase');

// Identifies the signed-in member from their sign-in token (never from something the
// browser claims). Sends the error response itself and returns null when the request
// should not go ahead; otherwise returns { user } with the member's profile row.
//
// Usage:  const auth = await requireMember(req, res); if (!auth) return;
async function requireMember(req, res) {
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const expired = () => {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'session_expired' });
    return null;
  };
  if (!token) return expired();

  let authUser = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data && data.user) authUser = data.user;
  } catch (e) { /* treated as not signed in */ }
  if (!authUser) return expired();

  let profile = null;
  const { data: byId } = await supabase
    .from('users').select('id, email, name, type, status').eq('id', authUser.id).single();
  profile = byId;
  if (!profile && authUser.email) {
    const { data: byEmail } = await supabase
      .from('users').select('id, email, name, type, status').eq('email', String(authUser.email).toLowerCase()).single();
    profile = byEmail;
  }
  if (!profile) return expired();

  if (profile.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended. Contact support@christonesunited.com.', code: 'suspended' });
    return null;
  }
  if (profile.status === 'awaiting_payment') {
    res.status(402).json({ error: 'Please finish your membership payment to use this feature.', code: 'awaiting_payment' });
    return null;
  }
  return { user: profile };
}

// True when this member owns the business listing.
async function ownsBusiness(userId, businessId) {
  if (!businessId) return false;
  const { data } = await supabase
    .from('businesses').select('id, name, user_id').eq('id', businessId).single();
  return data && String(data.user_id) === String(userId) ? data : false;
}

module.exports = { requireMember, ownsBusiness };
